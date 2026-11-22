/**
 * Canonical provider capability matrix for Phase 7 Communications.
 *
 * The matrix is the single source of truth used by routes, adapters, workers
 * and (via `listCapabilityMatrix`) the admin UI. Anything not explicitly
 * enabled here is disabled — unknown providers and TikTok are fail-closed.
 */

export const COMMUNICATION_PROVIDERS = [
  'ZOHO_MAIL',
  'WHATSAPP_META',
  'TELEGRAM',
  'META_FACEBOOK',
  'META_INSTAGRAM',
  'TIKTOK',
  'SMS',
] as const;

export type CommunicationProvider = (typeof COMMUNICATION_PROVIDERS)[number];

export const CAPABILITY_ACTIONS = [
  'read',
  'respond',
  'send_template',
  'sync_inbox',
  'manage_templates',
  'manage_grants',
  'analytics',
  'external_approval_required',
] as const;

export type CapabilityAction = (typeof CAPABILITY_ACTIONS)[number];

export type CapabilityMatrix = Record<CapabilityAction, boolean>;

export class ProviderCapabilityError extends Error {
  readonly provider: string;
  readonly action: CapabilityAction;

  constructor(provider: string, action: CapabilityAction, message?: string) {
    super(message ?? `Provider ${provider || 'UNKNOWN'} does not support '${action}'`);
    this.name = 'ProviderCapabilityError';
    this.provider = provider;
    this.action = action;
  }
}

const matrix: Record<string, CapabilityMatrix> = {
  ZOHO_MAIL: {
    read: true,
    respond: true,
    send_template: true,
    sync_inbox: true,
    manage_templates: true,
    manage_grants: true,
    analytics: true,
    external_approval_required: false,
  },
  WHATSAPP_META: {
    read: true,
    respond: true,
    send_template: true,
    sync_inbox: false, // Meta pushes messages via webhooks; no mailbox to poll.
    manage_templates: false, // Templates are approved in Meta Business Manager.
    manage_grants: false,
    analytics: true,
    external_approval_required: false,
  },
  TELEGRAM: {
    read: true,
    respond: true,
    send_template: false,
    sync_inbox: false,
    manage_templates: false,
    manage_grants: false,
    analytics: true,
    external_approval_required: false,
  },
  META_FACEBOOK: {
    read: true,
    respond: true,
    send_template: false,
    sync_inbox: false,
    manage_templates: false,
    manage_grants: false,
    analytics: true,
    external_approval_required: false,
  },
  META_INSTAGRAM: {
    read: true,
    respond: true,
    send_template: false,
    sync_inbox: false,
    manage_templates: false,
    manage_grants: false,
    analytics: true,
    external_approval_required: false,
  },
  // Read-only by policy. Any write must be approved and executed outside this
  // platform; the adapter never calls a TikTok write API.
  TIKTOK: {
    read: true,
    respond: false,
    send_template: false,
    sync_inbox: false,
    manage_templates: false,
    manage_grants: false,
    analytics: true,
    external_approval_required: true,
  },
  SMS: {
    read: false,
    respond: true,
    send_template: true,
    sync_inbox: false,
    manage_templates: false,
    manage_grants: false,
    analytics: false,
    external_approval_required: false,
  },
};

function isCapabilityAction(value: string): value is CapabilityAction {
  return (CAPABILITY_ACTIONS as readonly string[]).includes(value);
}

/** Full capability record for a provider. Unknown providers get all-deny. */
export function getProviderCapabilities(provider: string | null | undefined): CapabilityMatrix {
  const configured = matrix[String(provider ?? '').toUpperCase()];
  if (configured) return { ...configured };
  return {
    read: false,
    respond: false,
    send_template: false,
    sync_inbox: false,
    manage_templates: false,
    manage_grants: false,
    analytics: false,
    external_approval_required: true,
  };
}

/** True only when the provider explicitly declares support for the action. */
export function isCapabilityEnabled(provider: string | null | undefined, action: CapabilityAction | string): boolean {
  const key = String(action);
  if (!isCapabilityAction(key)) return false;
  return getProviderCapabilities(provider)[key] === true;
}

/** Fail-closed guard used at every adapter boundary. */
export function assertCapability(provider: string | null | undefined, action: CapabilityAction | string): void {
  const key = String(action);
  if (!isCapabilityAction(key)) {
    throw new ProviderCapabilityError(String(provider ?? ''), 'read', `Unknown capability '${key}'`);
  }
  if (!isCapabilityEnabled(provider, key)) {
    const hint = String(provider ?? '').toUpperCase() === 'TIKTOK'
      ? ' TikTok is read-only; use the external approval workflow.'
      : '';
    throw new ProviderCapabilityError(String(provider ?? ''), key, `Provider ${provider || 'UNKNOWN'} does not support '${key}'.${hint}`);
  }
}

/** Serialisable matrix for the admin capability badges / UI. */
export function listCapabilityMatrix(): Array<{ provider: CommunicationProvider; label: string; capabilities: CapabilityMatrix }> {
  return COMMUNICATION_PROVIDERS.map((provider) => ({
    provider,
    label: provider.replace(/_/g, ' '),
    capabilities: getProviderCapabilities(provider),
  }));
}
