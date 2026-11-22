import type { Response } from 'express';
import { z } from 'zod';
import type { AuthRequest } from '../../../shared/middleware/auth';

export type FinanceRouteHandler = (req: AuthRequest, res: Response) => unknown | Promise<unknown>;

export function errorStatus(err: any): number {
  if (typeof err?.status === 'number' && err.status >= 400 && err.status < 600) return err.status;
  const message = String(err?.message || '');
  if (/not configured|missing|unsupported|cannot|does not support/i.test(message)) return 400;
  if (/not authorized|forbidden/i.test(message)) return 403;
  if (/not found/i.test(message)) return 404;
  return 500;
}

/** Wrap async route handlers so validation/provider errors become JSON responses. */
export function route(handler: FinanceRouteHandler) {
  return (req: AuthRequest, res: Response) => {
    Promise.resolve()
      .then(() => handler(req, res))
      .catch((err: any) => {
        if (err instanceof z.ZodError) {
          res.status(400).json({ error: 'Invalid request', issues: err.issues });
          return;
        }
        const status = errorStatus(err);
        if (status >= 500) console.error('Finance route error', err?.message || err);
        if (!res.headersSent) {
          res.status(status).json({ error: String(err?.message || 'Finance request failed').slice(0, 500) });
        }
      });
  };
}

export function actor(req: AuthRequest) {
  return { actorId: req.user?.sub ?? null, actorRole: req.user?.role ?? null };
}

export function allRows(query: unknown): Promise<any[]> {
  return Promise.resolve(query as unknown as Promise<any[]>);
}

/** JSONB columns can be scalars/arrays; spread only plain objects. */
export function objectOf(value: unknown): Record<string, any> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, any>
    : {};
}
