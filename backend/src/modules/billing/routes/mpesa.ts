import { Router } from 'express';
import type { Db } from '../../../db';
import { requireAuth } from '../../../shared/middleware/auth';
import { requireAccess } from '../../../shared/middleware/roles';
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

  // C2B callbacks are unauthenticated by Daraja; keep them as immutable events
  // and let the finance reconciliation worker match BillRefNumber → invoice.
  const recordC2b = async (eventType: string, body: unknown) => {
    await recordProviderEvent(prisma, {
      provider: 'MPESA',
      domain: 'FINANCE',
      eventType,
      externalEventId: `C2B:${eventType}:${JSON.stringify(body)}`,
      signatureValid: false,
      payload: body,
      status: 'RECEIVED',
    });
    return { ResultCode: 0, ResultDesc: 'Accepted' };
  };

  router.post('/c2b/validation', async (req, res) => {
    res.json(await recordC2b('DARAJA_C2B_VALIDATION', req.body));
  });

  router.post('/c2b/confirmation', async (req, res) => {
    const confirmation = extractC2bConfirmation(req.body);
    if (confirmation) {
      // Read-only reconciliation review. Persist a structured outcome keyed on
      // TransID with BillRefNumber as the match key (never MSISDN). Record it
      // as already reviewed so the finance processor is not enqueued — this
      // callback must never auto-post a ledger entry.
      await recordProviderEvent(prisma, {
        provider: 'MPESA',
        domain: 'FINANCE',
        externalEventId: c2bConfirmationExternalId(confirmation.transId),
        eventType: 'DARAJA_C2B_CONFIRMATION',
        signatureValid: false,
        payload: {
          ...confirmation,
          matchKey: 'BillRefNumber',
          matchValue: confirmation.billRefNumber,
        },
        status: 'PROCESSED',
      });
      return res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
    }
    // Malformed/unrecognised payloads stay immutable raw events for triage.
    res.json(await recordC2b('DARAJA_C2B_CONFIRMATION', req.body));
  });

  return router;
}
