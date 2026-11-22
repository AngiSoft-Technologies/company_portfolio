import { useMemo, useState } from 'react';
import { apiFetch } from '@/lib/adminApi';
import { useEffectiveAccess } from '@/lib/permissions';
import { toast } from '@angisoft/utils';
import { Button, Card, Field, Table } from '@/components';
import { Badge } from '@/lib/Badge';
import { CapabilityBadge, inputClass, parseJson, useResource } from './shared';

const CAPABILITIES = '/admin/communications/capabilities/meta';
const PREVIEW_LIMIT = 4000;
const ERROR_LIMIT = 500;

/** The only Graph reads exposed by the safe-read endpoint. */
const SAFE_READS = [
  'pages.read',
  'app.subscriptions.read',
  'ad_accounts.read',
  'ads.insights.read',
  'instagram.read',
  'instagram.insights.read',
  'instagram.mentions.read',
  'published_content.read',
  'templates.read',
  'comments.read',
  'messenger.read',
  'threads.read',
  'threads.insights.read',
] as const;

const INSIGHTS_READS = new Set<string>([
  'ads.insights.read',
  'instagram.insights.read',
  'threads.insights.read',
]);

const MCP_OPERATIONS = ['mcp.ads', 'mcp.social', 'mcp.whatsapp'] as const;
type McpOperation = (typeof MCP_OPERATIONS)[number];

const WRITE_ACTIONS = [
  'pages.publish',
  'instagram.publish',
  'threads.publish',
  'threads.carousel.publish',
  'threads.reply',
  'comments.reply',
  'comments.moderate',
  'messenger.send',
] as const;
type WriteAction = (typeof WRITE_ACTIONS)[number];

type JsonRecord = Record<string, unknown>;
type MetaOperationStatus = {
  operation: string;
  available: boolean;
  requires: string[];
  approvalRequired: boolean;
  reason?: string;
};
type CapabilityRow = MetaOperationStatus & { id: string };
type MetaTool = { name: string; description?: string; inputSchema?: unknown };
type WriteFields = {
  pageId: string;
  accountId: string;
  imageUrl: string;
  videoUrl: string;
  threadId: string;
  commentId: string;
  objectId: string;
  recipientId: string;
  mediaUrls: string;
};

const EMPTY_WRITE_FIELDS: WriteFields = {
  pageId: '',
  accountId: '',
  imageUrl: '',
  videoUrl: '',
  threadId: '',
  commentId: '',
  objectId: '',
  recipientId: '',
  mediaUrls: '',
};

const SENSITIVE_KEY = /(token|secret|password|passwd|credential|authorization|cookie|api[_-]?key|access[_-]?key|private[_-]?key|session)/i;

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function normalizeStatus(value: unknown): MetaOperationStatus | null {
  if (!isRecord(value) || typeof value.operation !== 'string') return null;
  const requires = Array.isArray(value.requires)
    ? value.requires.filter((item): item is string => typeof item === 'string')
    : [];
  return {
    operation: value.operation,
    available: value.available === true,
    requires,
    approvalRequired: value.approvalRequired === true,
    ...(typeof value.reason === 'string' && value.reason.trim() ? { reason: value.reason } : {}),
  };
}

function normalizeCapabilities(value: unknown): { flags: JsonRecord; operations: MetaOperationStatus[] } {
  const root = isRecord(value) ? value : {};
  const operations = Array.isArray(root.operations)
    ? root.operations.map(normalizeStatus).filter((item): item is MetaOperationStatus => Boolean(item))
    : [];
  return { flags: isRecord(root.flags) ? root.flags : {}, operations };
}

function normalizeReadOptions(value: unknown): string[] {
  const root = isRecord(value) ? value : {};
  const allowed = new Set<string>(SAFE_READS);
  const executables = Array.isArray(root.executableReads)
    ? root.executableReads.filter((item): item is string => typeof item === 'string' && allowed.has(item))
    : [];
  return executables.length > 0 ? executables : [...SAFE_READS];
}

function normalizeTools(value: unknown): MetaTool[] {
  const root = isRecord(value) ? value : {};
  const tools = Array.isArray(root.tools) ? root.tools : [];
  return tools.flatMap((item) => {
    if (!isRecord(item) || typeof item.name !== 'string' || !item.name) return [];
    return [{
      name: item.name,
      ...(typeof item.description === 'string' ? { description: item.description } : {}),
      ...(item.inputSchema ? { inputSchema: item.inputSchema } : {}),
    }];
  });
}

/** Mask credential-shaped values before anything is rendered in a preview. */
function maskString(text: string): string {
  return text
    .replace(/\bBearer\s+[A-Za-z0-9._~+/=-]{8,}/gi, 'Bearer [REDACTED]')
    .replace(/([?&](?:access_token|token|secret|api_key)=)[^&\s"'<>]+/gi, '$1[REDACTED]')
    .replace(/\bEAA[A-Za-z0-9]{12,}\b/g, '[REDACTED]');
}

function redactForPreview(value: unknown, depth = 0): unknown {
  if (depth > 6) return '[DEPTH LIMIT]';
  if (typeof value === 'string') return maskString(value);
  if (Array.isArray(value)) return value.slice(0, 50).map((item) => redactForPreview(item, depth + 1));
  if (isRecord(value)) {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [
      key,
      SENSITIVE_KEY.test(key) ? '[REDACTED]' : redactForPreview(item, depth + 1),
    ]));
  }
  return value;
}

function jsonPreview(value: unknown): string {
  let text: string;
  try {
    text = JSON.stringify(redactForPreview(value), null, 2) ?? '';
  } catch {
    text = '[Result could not be serialized]';
  }
  if (!text) return 'No data returned.';
  return text.length > PREVIEW_LIMIT ? `${text.slice(0, PREVIEW_LIMIT)}\n… [preview truncated]` : text;
}

function errorMessage(error: unknown): string {
  const text = error instanceof Error ? error.message : String(error ?? 'Request failed');
  return text.length > ERROR_LIMIT ? `${text.slice(0, ERROR_LIMIT)}…` : text;
}

function JsonPreview({ label, value }: { label: string; value: unknown }) {
  return (
    <div className="mt-3">
      <p className="mb-1 text-xs font-medium text-[var(--text-secondary)]">{label}</p>
      <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-[var(--bg-primary)] p-3 text-xs text-[var(--text-secondary)]">
        {jsonPreview(value)}
      </pre>
    </div>
  );
}

function flagText(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed || null;
}

/** Read-only version, MCP endpoint and App Review diagnostics from safe flags. */
function MetaDiagnostics({ flags }: { flags: JsonRecord }) {
  const graphVersion = flagText(flags.graphVersion);
  const whatsappVersion = flagText(flags.whatsappGraphVersion);
  const matchLabel = graphVersion && whatsappVersion
    ? (graphVersion === whatsappVersion ? 'Match' : 'Mismatch')
    : 'Unknown';
  const matchTone = matchLabel === 'Match' ? 'green' : matchLabel === 'Mismatch' ? 'red' : 'slate';
  const reviewGranted = typeof flags.appReviewGranted === 'boolean' ? flags.appReviewGranted : null;
  const reviewLabel = reviewGranted === null ? 'Unknown' : reviewGranted ? 'Granted' : 'Not granted';
  const reviewTone = reviewGranted === null ? 'slate' : reviewGranted ? 'green' : 'amber';

  const endpoints = isRecord(flags.mcpEndpoints) ? flags.mcpEndpoints : {};
  const endpointRows = Object.entries(endpoints).flatMap(([key, value]) => {
    const url = flagText(value);
    if (!key || key.length > 40 || !url || !/^https:\/\//i.test(url) || url.includes('@')) return [];
    return [{ key, url }];
  });

  return (
    <div className="mt-5 border-t border-[var(--border)] pt-4">
      <h4 className="mb-2 text-sm font-semibold">Version &amp; endpoint diagnostics</h4>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-[var(--border)] p-3">
          <div className="text-xs uppercase tracking-wide text-[var(--text-muted)]">META Graph version</div>
          <div className="mt-1 font-mono text-sm">{graphVersion ?? '—'}</div>
        </div>
        <div className="rounded-lg border border-[var(--border)] p-3">
          <div className="text-xs uppercase tracking-wide text-[var(--text-muted)]">WhatsApp API version</div>
          <div className="mt-1 font-mono text-sm">{whatsappVersion ?? '—'}</div>
        </div>
        <div className="rounded-lg border border-[var(--border)] p-3">
          <div className="text-xs uppercase tracking-wide text-[var(--text-muted)]">Versions match</div>
          <div className="mt-1"><Badge tone={matchTone}>{matchLabel}</Badge></div>
        </div>
        <div className="rounded-lg border border-[var(--border)] p-3">
          <div className="text-xs uppercase tracking-wide text-[var(--text-muted)]">App Review status</div>
          <div className="mt-1"><Badge tone={reviewTone}>{reviewLabel}</Badge></div>
        </div>
      </div>
      <div className="mt-3">
        <p className="mb-1 text-xs font-medium text-[var(--text-secondary)]">Allowlisted MCP endpoints</p>
        {endpointRows.length === 0 ? (
          <p className="text-xs text-[var(--text-muted)]">—</p>
        ) : (
          <ul className="space-y-1">
            {endpointRows.map(({ key, url }) => (
              <li key={key} className="flex flex-wrap items-center gap-2 text-xs">
                <Badge tone="slate">{key.replace(/[._]/g, ' ')}</Badge>
                <code className="break-all text-[var(--text-secondary)]">{url}</code>
              </li>
            ))}
          </ul>
        )}
      </div>
      <p className="mt-3 text-xs text-[var(--text-muted)]">
        Read-only diagnostics. Tokens and secrets are never displayed here.
      </p>
    </div>
  );
}

/** Read-only catalog readiness: config coverage, CMS feed validation, CAPI events. */
function CatalogReadiness({ data, loading, error }: { data: unknown; loading: boolean; error: string | null }) {
  const root = isRecord(data) ? data : {};
  const feed = isRecord(root.feed) ? root.feed : {};
  const capi = isRecord(root.capi) ? root.capi : {};
  const gaps = Array.isArray(root.gaps)
    ? root.gaps.filter((item): item is string => typeof item === 'string' && item.length > 0)
    : [];
  const events = Array.isArray(capi.events)
    ? capi.events.filter((item): item is { name: string; wired: boolean } =>
      isRecord(item) && typeof item.name === 'string')
    : [];

  return (
    <div className="mt-5 border-t border-[var(--border)] pt-4">
      <h4 className="mb-2 text-sm font-semibold">Catalog &amp; commerce readiness</h4>
      {loading ? <p className="text-xs text-[var(--text-muted)]">Checking feed…</p> : null}
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
      <div className="grid gap-3 sm:grid-cols-3">
        <CapabilityBadge label="Catalog ID configured" state={root.catalogIdConfigured === true} />
        <CapabilityBadge label="Feed URL configured" state={root.feedUrlConfigured === true} />
        <CapabilityBadge label="CMS feed valid" state={feed.valid === true} />
      </div>
      <p className="mt-2 text-xs text-[var(--text-muted)]">
        Public product feed: <code>{flagText(root.publicFeedPath) ?? '/v1/catalog/feed.xml'}</code>
        {' · '}Items: {typeof feed.itemCount === 'number' ? feed.itemCount : '—'}
      </p>
      {root.feedUrl ? <p className="mt-1 text-xs text-[var(--text-secondary)]">Feed URL: <code>{flagText(root.feedUrl)}</code></p> : null}
      {gaps.length > 0 ? (
        <ul className="mt-2 space-y-1">
          {gaps.map((gap) => <li key={gap} className="text-xs text-amber-700">• {gap}</li>)}
        </ul>
      ) : (
        <p className="mt-2 text-xs text-[var(--text-muted)]">No readiness gaps reported.</p>
      )}
      {events.length > 0 ? (
        <div className="mt-3">
          <p className="mb-1 text-xs font-medium text-[var(--text-secondary)]">Conversion events</p>
          <div className="flex flex-wrap gap-2">
            {events.map((event) => (
              <Badge key={event.name} tone={event.wired ? 'green' : 'slate'}>
                {event.name}{event.wired ? '' : ' (no emitter)'}
              </Badge>
            ))}
          </div>
        </div>
      ) : null}
      <p className="mt-3 text-xs text-[var(--text-muted)]">
        Read-only check. Meta never overwrites CMS data and no credentials are displayed.
      </p>
    </div>
  );
}

function CapiNotice({ flags }: { flags: JsonRecord }) {
  const entry = Object.entries(flags).find(([key]) => /capi|conversion/i.test(key));
  if (!entry) {
    return (
      <p className="mt-3 text-xs text-[var(--text-muted)]">
        Server-side conversion events are configured in Settings → Meta / WhatsApp
      </p>
    );
  }
  const raw = entry[1];
  const configured = raw === true
    || (isRecord(raw) && (raw.enabled === true || raw.available === true || raw.configured === true))
    || (typeof raw === 'string' && /^(true|enabled|configured|available)$/i.test(raw.trim()));
  return (
    <div className="mt-3">
      <CapabilityBadge label="Server-side conversion events (CAPI)" state={configured} />
    </div>
  );
}

/** Meta capability matrix, safe reads, read-only MCP tools and gated write actions. */
export default function MetaCommandCenter() {
  const { can } = useEffectiveAccess();
  const capabilities = useResource<unknown>(CAPABILITIES);
  const operations = useResource<unknown>(`${CAPABILITIES}/operations`);
  const catalogReadiness = useResource<unknown>(`${CAPABILITIES}/catalog-readiness`);
  const { flags, operations: statusRows } = useMemo(
    () => normalizeCapabilities(capabilities.data),
    [capabilities.data],
  );
  const statusByOperation = useMemo(
    () => new Map(statusRows.map((row) => [row.operation, row])),
    [statusRows],
  );
  const readOptions = useMemo(() => normalizeReadOptions(operations.data), [operations.data]);

  const [readOperation, setReadOperation] = useState<string>(SAFE_READS[0]);
  const [readObjectId, setReadObjectId] = useState('');
  const [readDays, setReadDays] = useState('7');
  const [readResult, setReadResult] = useState<unknown>(null);
  const [readError, setReadError] = useState<string | null>(null);
  const [reading, setReading] = useState(false);

  const [mcpOperation, setMcpOperation] = useState<McpOperation>('mcp.social');
  const toolsResource = useResource<unknown>(
    `${CAPABILITIES}/mcp/tools?operation=${encodeURIComponent(mcpOperation)}`,
  );
  const tools = useMemo(() => normalizeTools(toolsResource.data), [toolsResource.data]);
  const [selectedTool, setSelectedTool] = useState('');
  const [mcpArguments, setMcpArguments] = useState('{}');
  const [mcpResult, setMcpResult] = useState<unknown>(null);
  const [mcpError, setMcpError] = useState<string | null>(null);
  const [mcpBusy, setMcpBusy] = useState(false);

  const [writeAction, setWriteAction] = useState<WriteAction>('pages.publish');
  const [writeFields, setWriteFields] = useState<WriteFields>({ ...EMPTY_WRITE_FIELDS });
  const [writeText, setWriteText] = useState('');
  const [writeResult, setWriteResult] = useState<unknown>(null);
  const [writeError, setWriteError] = useState<string | null>(null);
  const [writing, setWriting] = useState(false);

  const writeAllowed = can('communications.social.respond');
  const activeTool = tools.find((tool) => tool.name === selectedTool)?.name ?? tools[0]?.name ?? '';
  const activeToolRecord = tools.find((tool) => tool.name === activeTool);
  const activeToolDescription = activeToolRecord?.description;
  const readStatus = statusByOperation.get(readOperation);
  const mcpStatus = statusByOperation.get(mcpOperation);
  const writeStatus = statusByOperation.get(writeAction);
  const moderationAllowed = writeAllowed && writeStatus?.available === true;

  const updateWriteField = (key: keyof WriteFields, value: string) => {
    setWriteFields((current) => ({ ...current, [key]: value }));
  };

  const changeWriteAction = (action: WriteAction) => {
    setWriteAction(action);
    setWriteFields({ ...EMPTY_WRITE_FIELDS });
    setWriteError(null);
    setWriteResult(null);
  };

  const runRead = async () => {
    setReading(true);
    setReadError(null);
    setReadResult(null);
    try {
      const response = await apiFetch(`${CAPABILITIES}/operations/read`, {
        method: 'POST',
        body: {
          operation: readOperation,
          ...(readObjectId.trim() ? { objectId: readObjectId.trim() } : {}),
          ...(INSIGHTS_READS.has(readOperation) ? { days: Number(readDays) || 7 } : {}),
        },
      });
      setReadResult(isRecord(response) ? response.result ?? null : null);
      toast.success('Meta read complete');
    } catch (error) {
      setReadError(errorMessage(error));
    } finally {
      setReading(false);
    }
  };

  const callTool = async () => {
    setMcpError(null);
    setMcpResult(null);
    if (!activeTool) {
      setMcpError('Load the tool catalogue and select a read-only tool first.');
      return;
    }
    let args: unknown;
    try {
      args = parseJson(mcpArguments, 'Tool arguments');
    } catch (error) {
      setMcpError(errorMessage(error));
      return;
    }
    if (!isRecord(args)) {
      setMcpError('Tool arguments must be a JSON object.');
      return;
    }
    setMcpBusy(true);
    try {
      const response = await apiFetch(`${CAPABILITIES}/mcp/call`, {
        method: 'POST',
        body: { operation: mcpOperation, tool: activeTool, arguments: args },
      });
      const record = isRecord(response) ? response : {};
      setMcpResult({
        content: record.content ?? null,
        structuredContent: record.structuredContent ?? null,
      });
      toast.success('MCP tool call complete');
    } catch (error) {
      setMcpError(errorMessage(error));
    } finally {
      setMcpBusy(false);
    }
  };

  const runWrite = async () => {
    setWriteError(null);
    setWriteResult(null);
    const text = writeText.trim();
    const body: JsonRecord = { operation: writeAction };

    if (writeAction === 'comments.moderate') {
      if (!moderationAllowed) {
        setWriteError('Comment moderation is unavailable for this deployment.');
        return;
      }
      if (!writeFields.commentId.trim()) {
        setWriteError('commentId is required for comments.moderate.');
        return;
      }
      body.commentId = writeFields.commentId.trim();
      body.network = 'META_FACEBOOK';
    } else if (writeAction === 'comments.reply') {
      if (!writeFields.objectId.trim()) {
        setWriteError('objectId is required for comments.reply.');
        return;
      }
      body.objectId = writeFields.objectId.trim();
      body.network = 'META_FACEBOOK';
    } else if (writeAction === 'messenger.send') {
      if (!writeFields.recipientId.trim()) {
        setWriteError('recipientId is required for messenger.send.');
        return;
      }
      body.recipientId = writeFields.recipientId.trim();
    } else {
      if (!text && writeAction !== 'threads.carousel.publish') {
        setWriteError('Enter the message text.');
        return;
      }
      if (text) body.text = text;
    }

    if (writeAction === 'threads.reply' && !writeFields.threadId.trim()) {
      setWriteError('threadId is required for threads.reply.');
      return;
    }
    if (writeAction === 'threads.carousel.publish') {
      const mediaUrls = writeFields.mediaUrls
        .split(/[\n,]+/)
        .map((url) => url.trim())
        .filter(Boolean);
      if (mediaUrls.length < 2 || mediaUrls.length > 10) {
        setWriteError('Provide between 2 and 10 public HTTPS media URLs, one per line.');
        return;
      }
      body.mediaUrls = mediaUrls;
    }
    if (writeFields.pageId.trim()) body.pageId = writeFields.pageId.trim();
    if (writeFields.accountId.trim()) body.accountId = writeFields.accountId.trim();
    if (writeFields.imageUrl.trim()) body.imageUrl = writeFields.imageUrl.trim();
    if (writeFields.videoUrl.trim()) body.videoUrl = writeFields.videoUrl.trim();
    if (writeFields.threadId.trim()) body.threadId = writeFields.threadId.trim();
    setWriting(true);
    try {
      const response = await apiFetch(`${CAPABILITIES}/operations/write`, {
        method: 'POST',
        body,
      });
      setWriteResult(isRecord(response) ? response.result ?? null : null);
      toast.success('Meta action submitted');
    } catch (error) {
      setWriteError(errorMessage(error));
    } finally {
      setWriting(false);
    }
  };

  return (
    <section className="space-y-4" aria-label="Meta command center">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">Meta command center</h2>
        <a
          href="/v1/catalog/feed.xml"
          target="_blank"
          rel="noreferrer"
          className="text-sm text-[var(--color-primary)] underline"
        >
          Meta product feed
        </a>
      </div>

      <Card>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-semibold">Operation capabilities</h3>
          <Button
            variant="ghost"
            onClick={() => void Promise.all([capabilities.reload(), operations.reload(), toolsResource.reload(), catalogReadiness.reload()])}
          >
            Refresh status
          </Button>
        </div>
        {capabilities.loading ? <p className="text-sm text-[var(--text-muted)]">Loading capabilities…</p> : null}
        {capabilities.error ? <p className="mb-2 text-sm text-red-600">{capabilities.error}</p> : null}
        <Table<CapabilityRow>
          columns={[
            { key: 'operation', header: 'Operation', render: (row) => <span className="font-medium">{row.operation}</span> },
            { key: 'status', header: 'Status', render: (row) => <CapabilityBadge label="" state={row.available} /> },
            { key: 'requires', header: 'Requires', render: (row) => row.requires.length > 0 ? row.requires.join(', ') : '—' },
            { key: 'approval', header: 'Approval', render: (row) => row.approvalRequired ? <Badge tone="amber">App review</Badge> : '—' },
            {
              key: 'reason',
              header: 'Reason',
              render: (row) => (
                <span className="text-xs text-[var(--text-muted)]">{row.reason ?? (row.available ? 'Ready' : 'Not configured')}</span>
              ),
            },
          ]}
          rows={statusRows.map((row) => ({ ...row, id: row.operation }))}
        />
        <CapiNotice flags={flags} />
        <MetaDiagnostics flags={flags} />
        <CatalogReadiness
          data={catalogReadiness.data}
          loading={catalogReadiness.loading}
          error={catalogReadiness.error}
        />
      </Card>

      <Card>
        <h3 className="mb-1 font-semibold">Safe Graph reads</h3>
        <p className="mb-3 text-xs text-[var(--text-muted)]">
          Read-only operations published by the Meta capability endpoint. Results are redacted and capped before display.
        </p>
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Operation">
            <select className={inputClass} value={readOperation} onChange={(event) => setReadOperation(event.target.value)}>
              {readOptions.map((operation) => <option key={operation} value={operation}>{operation}</option>)}
            </select>
          </Field>
          <Field label="Object ID (optional)">
            <input
              className={inputClass}
              value={readObjectId}
              onChange={(event) => setReadObjectId(event.target.value)}
              placeholder="Page, account or conversation ID"
            />
          </Field>
          {INSIGHTS_READS.has(readOperation) ? (
            <Field label="Window (days, max 90)">
              <input
                className={inputClass}
                type="number"
                min={1}
                max={90}
                value={readDays}
                onChange={(event) => setReadDays(event.target.value)}
              />
            </Field>
          ) : null}
        </div>
        {readStatus && !readStatus.available ? (
          <p className="mt-2 text-xs text-[var(--text-muted)]">
            Currently unavailable: {readStatus.reason ?? 'capability flag disabled'}. The API will return the provider reason.
          </p>
        ) : null}
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Button onClick={() => void runRead()} disabled={reading || !readOperation}>
            {reading ? 'Reading…' : 'Run read'}
          </Button>
          {operations.error ? <span className="text-xs text-red-600">{operations.error}</span> : null}
        </div>
        {readError ? <p className="mt-3 text-sm text-red-600">{readError}</p> : null}
        {readResult !== null ? <JsonPreview label="Read result" value={readResult} /> : null}
      </Card>

      <Card>
        <h3 className="mb-1 font-semibold">Meta MCP tools (read-only)</h3>
        <p className="mb-3 text-xs text-[var(--text-muted)]">
          Tools are listed per configured MCP server; only read-only tools can be called. Calls require <code>communications.social.respond</code>.
        </p>
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="MCP server">
            <select
              className={inputClass}
              value={mcpOperation}
              onChange={(event) => {
                setMcpOperation(event.target.value as McpOperation);
                setSelectedTool('');
                setMcpResult(null);
                setMcpError(null);
              }}
            >
              {MCP_OPERATIONS.map((operation) => <option key={operation} value={operation}>{operation}</option>)}
            </select>
          </Field>
          <Field label="Tool">
            <select className={inputClass} value={activeTool} onChange={(event) => setSelectedTool(event.target.value)}>
              {tools.length > 0
                ? tools.map((tool) => <option key={tool.name} value={tool.name}>{tool.name}</option>)
                : <option value="">No tools loaded</option>}
            </select>
          </Field>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <Button variant="outline" onClick={() => void toolsResource.reload()}>
            {toolsResource.loading ? 'Loading…' : 'Refresh tools'}
          </Button>
          {toolsResource.error ? <span className="text-sm text-red-600">{toolsResource.error}</span> : null}
          {!toolsResource.loading && !toolsResource.error && tools.length === 0 ? (
            <span className="text-xs text-[var(--text-muted)]">No read-only tools advertised.</span>
          ) : null}
        </div>
        {activeToolDescription ? (
          <p className="mt-2 text-xs text-[var(--text-muted)]">{maskString(activeToolDescription)}</p>
        ) : null}
        {activeToolRecord?.inputSchema ? (
          <JsonPreview label="Tool input schema" value={activeToolRecord.inputSchema} />
        ) : null}
        {mcpStatus && !mcpStatus.available ? (
          <p className="mt-2 text-xs text-[var(--text-muted)]">
            This MCP server is unavailable: {mcpStatus.reason ?? 'endpoint not configured'}.
          </p>
        ) : null}
        <div className="mt-3">
          <Field label="Arguments (JSON object)">
            <textarea
              className={`${inputClass} min-h-24 font-mono text-xs`}
              value={mcpArguments}
              onChange={(event) => setMcpArguments(event.target.value)}
              spellCheck={false}
            />
          </Field>
        </div>
        <div className="mt-3">
          <Button onClick={() => void callTool()} disabled={!writeAllowed || mcpBusy || !activeTool}>
            {mcpBusy ? 'Calling…' : 'Call read-only tool'}
          </Button>
          {!writeAllowed ? (
            <p className="mt-2 text-xs text-[var(--text-muted)]">
              Tool calls require <code>communications.social.respond</code> access.
            </p>
          ) : null}
        </div>
        {mcpError ? <p className="mt-3 text-sm text-red-600">{mcpError}</p> : null}
        {mcpResult !== null ? <JsonPreview label="Tool result" value={mcpResult} /> : null}
      </Card>

      <Card>
        <h3 className="mb-1 font-semibold">Publish and reply</h3>
        <p className="mb-3 text-xs text-[var(--text-muted)]">
          Write actions are enforced by the API with explicit Meta grants; no credentials are shown or sent from this form.
        </p>
        {!writeAllowed ? (
          <p className="text-sm text-[var(--text-muted)]">
            Publishing and replies require <code>communications.social.respond</code> access.
          </p>
        ) : (
          <>
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Action">
                <select
                  className={inputClass}
                  value={writeAction}
                  onChange={(event) => changeWriteAction(event.target.value as WriteAction)}
                >
                  {WRITE_ACTIONS.map((action) => <option key={action} value={action}>{action}</option>)}
                </select>
              </Field>
              {writeAction === 'comments.moderate' ? (
                <Field label="Comment ID (required)">
                  <input
                    className={inputClass}
                    value={writeFields.commentId}
                    onChange={(event) => updateWriteField('commentId', event.target.value)}
                    disabled={!moderationAllowed}
                    placeholder="Existing Page or Instagram comment ID"
                  />
                </Field>
              ) : (
                <Field label={writeAction === 'threads.carousel.publish' ? 'Caption text (optional)' : 'Message text'}>
                  <input
                    className={inputClass}
                    value={writeText}
                    onChange={(event) => setWriteText(event.target.value)}
                    maxLength={5000}
                    placeholder="Text to publish or send"
                  />
                </Field>
              )}
            </div>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              {writeAction === 'pages.publish' ? (
                <Field label="Page ID (optional)">
                  <input className={inputClass} value={writeFields.pageId} onChange={(event) => updateWriteField('pageId', event.target.value)} />
                </Field>
              ) : null}
              {writeAction === 'instagram.publish' ? (
                <>
                  <Field label="Account ID (optional)">
                    <input className={inputClass} value={writeFields.accountId} onChange={(event) => updateWriteField('accountId', event.target.value)} />
                  </Field>
                  <Field label="Image URL (optional)">
                    <input className={inputClass} value={writeFields.imageUrl} onChange={(event) => updateWriteField('imageUrl', event.target.value)} />
                  </Field>
                  <Field label="Video URL (optional)">
                    <input className={inputClass} value={writeFields.videoUrl} onChange={(event) => updateWriteField('videoUrl', event.target.value)} />
                  </Field>
                </>
              ) : null}
              {writeAction === 'threads.publish' ? (
                <>
                  <Field label="Image URL (optional)">
                    <input className={inputClass} value={writeFields.imageUrl} onChange={(event) => updateWriteField('imageUrl', event.target.value)} />
                  </Field>
                  <Field label="Video URL (optional)">
                    <input className={inputClass} value={writeFields.videoUrl} onChange={(event) => updateWriteField('videoUrl', event.target.value)} />
                  </Field>
                </>
              ) : null}
              {writeAction === 'threads.carousel.publish' ? (
                <Field label="Media URLs (2-10, one per line)">
                  <textarea
                    className={`${inputClass} min-h-24 font-mono text-xs`}
                    value={writeFields.mediaUrls}
                    onChange={(event) => updateWriteField('mediaUrls', event.target.value)}
                    placeholder="https://cdn.example.com/one.jpg"
                    spellCheck={false}
                  />
                </Field>
              ) : null}
              {writeAction === 'threads.reply' ? (
                <Field label="Thread ID (required)">
                  <input className={inputClass} value={writeFields.threadId} onChange={(event) => updateWriteField('threadId', event.target.value)} />
                </Field>
              ) : null}
              {writeAction === 'comments.reply' ? (
                <Field label="Comment ID (required)">
                  <input className={inputClass} value={writeFields.objectId} onChange={(event) => updateWriteField('objectId', event.target.value)} placeholder="Existing Page or Instagram comment ID" />
                </Field>
              ) : null}
              {writeAction === 'messenger.send' ? (
                <Field label="Recipient PSID (required)">
                  <input className={inputClass} value={writeFields.recipientId} onChange={(event) => updateWriteField('recipientId', event.target.value)} placeholder="Messenger page-scoped ID" />
                </Field>
              ) : null}
            </div>
            {writeAction === 'comments.moderate' && !moderationAllowed ? (
              <p className="mt-2 text-xs text-[var(--text-muted)]">
                Comment moderation requires an App Review grant and a Page access token. The comment ID field stays disabled until the capability is available.
              </p>
            ) : null}
            {writeStatus && !writeStatus.available ? (
              <p className="mt-2 text-xs text-[var(--text-muted)]">
                This action is unavailable: {writeStatus.reason ?? 'capability flag disabled'}.
              </p>
            ) : null}
            <div className="mt-3">
              <Button
                onClick={() => void runWrite()}
                disabled={writing || ((writeAction === 'comments.moderate' || writeAction === 'threads.carousel.publish') && writeStatus?.available !== true)}
              >
                {writing ? 'Submitting…' : `Run ${writeAction}`}
              </Button>
            </div>
            {writeError ? <p className="mt-3 text-sm text-red-600">{writeError}</p> : null}
            {writeResult !== null ? <JsonPreview label="Action result" value={writeResult} /> : null}
          </>
        )}
      </Card>
    </section>
  );
}
