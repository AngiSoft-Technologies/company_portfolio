import { Router, type Request, type Response } from 'express';
import crypto from 'crypto';
import type { Db } from '../../../db';
import { requireAuth } from '../../../shared/middleware/auth';
import { requireAccess } from '../../../shared/middleware/roles';
import { getConfig } from '../../../shared/services/runtimeConfig';
import { logAudit } from '../../../shared/services/audit';
import { recordProviderEvent } from '../../../shared/services/providerEvents';
import { c2bConfirmationExternalId, extractC2bConfirmation } from './mpesa-callbacks';
import {
  generateMpesaQr,
  queryAccountBalance,
  registerC2bUrls,
  simulateC2b,
} from '../services/payments/darajaPayouts';

function errorStatus(err: unknown): number {
  const status = (err as { status?: number })?.status;
  return typeof status === 'number' && status >= 400 && status < 600 ? status : 502;
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : 'Daraja request failed';
}

/** Same shared-secret pattern as the STK callback; never logged or persisted. */
function callbackTokenValid(req: Request): boolean {
  const expected = String(getConfig('MPESA_CALLBACK_TOKEN') || '');
  if (!expected) return false;
  const provided = String(req.query?.token ?? req.headers['x-callback-token'] ?? '');
  const expectedBuffer = Buffer.from(expected);
  const providedBuffer = Buffer.from(provided);
  return expectedBuffer.length === providedBuffer.length
    && crypto.timingSafeEqual(expectedBuffer, providedBuffer);
}

function requireCallbackToken(req: Request, res: Response): boolean {
  if (!getConfig('MPESA_CALLBACK_TOKEN')) {
    console.error('Daraja C2B callback rejected: MPESA_CALLBACK_TOKEN not configured.');
    res.status(503).json({ ResultCode: 1, ResultDesc: 'Callback not configured' });
    return false;
  }
  if (!callbackTokenValid(req)) {
    res.status(403).json({ ResultCode: 1, ResultDesc: 'Forbidden' });
    return false;
  }
  return true;
}

/**
 * Extended Daraja product endpoints from the local developer resource pack:
 * C2B URL registration/simulation, balance checks and dynamic QR codes.
 * Credentials and reference data stay in the vault; amounts and references are
 * validated server-side.
 */
export default function mpesaRouter(prisma: Db) {
  const router = Router();
  const admin = [requireAuth, requireAccess('payments.reconcile', ['SUPER_ADMIN', 'ADMIN', 'MARKETING'])] as const;

  router.post('/c2b/register', ...admin, async (req, res) => {
    try {
      const result = await registerC2bUrls(req.body || {});
      res.json({ ok: true, result });
    } catch (err) {
      res.status(errorStatus(err)).json({ error: errorMessage(err) });
    }
  });

  /** Sandbox-only test helper; the adapter rejects live simulation. */
  router.post('/c2b/simulate', ...admin, async (req, res) => {
    try {
      const result = await simulateC2b(req.body || {});
      res.json({ ok: true, result });
    } catch (err) {
      res.status(errorStatus(err)).json({ error: errorMessage(err) });
    }
  });

  router.post('/balance', ...admin, async (_req, res) => {
    try {
      const result = await queryAccountBalance();
      res.json({ ok: true, result });
    } catch (err) {
      res.status(errorStatus(err)).json({ error: errorMessage(err) });
    }
  });

  router.post('/qr', ...admin, async (req, res) => {
    try {
      const reference = String(req.body?.reference || '').trim();
      const amount = Number(req.body?.amount);
      if (!reference || !Number.isFinite(amount) || amount <= 0) {
        return res.status(400).json({ error: 'reference and positive amount are required' });
      }
      const result = await generateMpesaQr({ reference, amount });
      res.json({ ok: true, result });
    } catch (err) {
      res.status(errorStatus(err)).json({ error: errorMessage(err) });
    }
  });

  // Daraja does not sign C2B callbacks, so the registered URL carries the same
  // constant-time shared token used by the STK callback. Records are immutable
  // review events only; finance staff match BillRefNumber → invoice manually.
  const c2bAck = { ResultCode: 0, ResultDesc: 'Accepted' } as const;
  const c2bFingerprint = (body: unknown) => crypto.createHash('sha256')
    .update(JSON.stringify(body ?? null))
    .digest('hex')
    .slice(0, 32);

  interface C2bRecord {
    eventType: string;
    externalEventId: string;
    payload: unknown;
    status?: 'RECEIVED' | 'PROCESSED';
  }
  const recordC2b = async ({ eventType, externalEventId, payload, status }: C2bRecord) => {
    const { event, deduped } = await recordProviderEvent(prisma, {
      provider: 'MPESA',
      domain: 'FINANCE',
      eventType,
      externalEventId,
      signatureValid: false,
      payload,
      status: status ?? 'RECEIVED',
    });
    await logAudit({
      action: 'DARAJA_C2B_CALLBACK_RECEIVED',
      entity: 'ProviderEvent',
      entityId: event.id,
      meta: { eventType, deduped, authMethod: 'SHARED_CALLBACK_TOKEN' },
    });
  };
  const retainC2b = (input: C2bRecord) => {
    // Acknowledge before any database work: Daraja retries non-2xx responses.
    void recordC2b(input).catch((err) => console.error('Daraja C2B event recording failed', errorMessage(err)));
  };

  router.post('/c2b/validation', (req, res) => {
    if (!requireCallbackToken(req, res)) return;
    res.json(c2bAck);
    retainC2b({
      eventType: 'DARAJA_C2B_VALIDATION',
      externalEventId: `C2B:DARAJA_C2B_VALIDATION:${c2bFingerprint(req.body)}`,
      payload: req.body,
    });
  });

  router.post('/c2b/confirmation', (req, res) => {
    if (!requireCallbackToken(req, res)) return;
    res.json(c2bAck);
    const confirmation = extractC2bConfirmation(req.body);
    if (confirmation) {
      // Read-only reconciliation review. Persist a structured outcome keyed on
      // TransID with BillRefNumber as the match key (never MSISDN). Record it
      // as already reviewed so the finance processor is not enqueued — this
      // callback must never auto-post a ledger entry.
      retainC2b({
        eventType: 'DARAJA_C2B_CONFIRMATION',
        externalEventId: c2bConfirmationExternalId(confirmation.transId),
        payload: {
          ...confirmation,
          authMethod: 'SHARED_CALLBACK_TOKEN',
          matchKey: 'BillRefNumber',
          matchValue: confirmation.billRefNumber,
        },
        status: 'PROCESSED',
      });
      return;
    }
    // Malformed/unrecognised payloads stay immutable raw events for triage.
    retainC2b({
      eventType: 'DARAJA_C2B_CONFIRMATION',
      externalEventId: `C2B:DARAJA_C2B_CONFIRMATION:${c2bFingerprint(req.body)}`,
      payload: req.body,
    });
  });

  return router;
}
