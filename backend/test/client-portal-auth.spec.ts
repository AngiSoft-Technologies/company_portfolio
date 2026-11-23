import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcrypt';

const { stores, sendMail, queryable } = vi.hoisted(() => {
  const matches = (row: any, criteria: any): boolean => {
    if (typeof criteria === 'function') return evaluate(criteria(fields), row);
    return Object.entries(criteria ?? {}).every(([key, value]) => row?.[key] === value);
  };

  const field = (name: string) => ({
    eq: (value: unknown) => ({ kind: 'cmp', field: name, op: 'eq', value }),
    isNull: () => ({ kind: 'cmp', field: name, op: 'isNull' }),
    gt: (value: unknown) => ({ kind: 'cmp', field: name, op: 'gt', value }),
  });

  const fields = new Proxy({}, { get: (_target, name) => field(String(name)) });

  const evaluate = (expr: any, row: any): boolean => {
    if (!expr) return true;
    if (expr.kind === 'and') return expr.items.every((item: any) => evaluate(item, row));
    if (expr.kind === 'or') return expr.items.some((item: any) => evaluate(item, row));
    if (expr.kind === 'cmp') {
      const value = row?.[expr.field];
      if (expr.op === 'eq') return value === expr.value;
      if (expr.op === 'isNull') return value === null || value === undefined;
      if (expr.op === 'gt') return value > expr.value;
    }
    return false;
  };

  const queryable = (store: any[]) => ({
    where(criteria: any) {
      const rows = () => store.filter((row) => matches(row, criteria));
      return {
        first: async () => rows()[0] ?? null,
        all: async () => rows(),
        update: async (data: any) => {
          const row = rows()[0];
          if (row) Object.assign(row, data);
          return row;
        },
        updateAll: async (data: any) => {
          rows().forEach((row) => Object.assign(row, data));
          return { count: rows().length };
        },
        updateAndCount: async (data: any) => {
          rows().forEach((row) => Object.assign(row, data));
          return rows().length;
        },
        delete: async () => {
          const row = rows()[0];
          const index = row ? store.indexOf(row) : -1;
          if (index >= 0) store.splice(index, 1);
          return row;
        },
      };
    },
    create: async (data: any) => {
      const row = { id: `cat_${store.length + 1}`, createdAt: new Date().toISOString(), ...data };
      store.push(row);
      return row;
    },
  });

  process.env.JWT_SECRET = 'client-portal-test-secret-that-is-long-enough';

  return {
    stores: {
      clients: [] as any[],
      accessTokens: [] as any[],
    },
    sendMail: vi.fn(async () => true),
    queryable,
  };
});

vi.mock('@prisma/orm-postgres/orm-client', async (importOriginal) => {
  const original = await importOriginal<Record<string, unknown>>();
  return {
    ...original,
    and: (...items: any[]) => ({ kind: 'and', items }),
    or: (...items: any[]) => ({ kind: 'or', items }),
  };
});

vi.mock('../src/db', () => ({
  default: {
    orm: {
      public: {
        Client: queryable(stores.clients),
        ClientAccessToken: queryable(stores.accessTokens),
      },
    },
  },
}));

vi.mock('../src/prisma/db', () => ({
  db: {},
  default: {},
  ts: (value?: any) => (typeof value === 'string' ? value : new Date(value ?? Date.now()).toISOString()),
  tsMs: (value: any) => new Date(value).getTime(),
  newId: () => `id_${Math.random().toString(36).slice(2)}`,
}));

vi.mock('../src/shared/services/email', () => ({
  sendMail,
  sendMailDirect: vi.fn(async () => true),
  verifyTransporter: vi.fn(async () => true),
}));

vi.mock('../src/shared/services/audit', () => ({ logAudit: vi.fn(async () => undefined) }));
vi.mock('../src/shared/services/monitor', () => ({ suspiciousAuthEvent: vi.fn(async () => undefined) }));
vi.mock('../src/modules/ai/routes/chatbot', async () => {
  const express = await import('express');
  return { default: () => express.Router() };
});

import app from '../src/app';

const cookieValue = (headers: Record<string, unknown>, name: string): string => {
  const list = (headers['set-cookie'] as string[] | undefined) ?? [];
  const hit = list.find((value) => value.startsWith(`${name}=`));
  if (!hit) throw new Error(`Missing cookie ${name}`);
  return decodeURIComponent(hit.split(';')[0].slice(name.length + 1));
};

const addClient = async () => {
  const client = {
    id: `cli_${stores.clients.length + 1}`,
    name: 'Test Client',
    email: 'client@example.com',
    passwordHash: await bcrypt.hash('Password123!', 10),
  };
  stores.clients.push(client);
  return client;
};

describe('client portal password sessions', () => {
  beforeEach(() => {
    stores.clients.length = 0;
    stores.accessTokens.length = 0;
    sendMail.mockClear();
  });

  it('authenticates a client with a password and issues a dedicated refresh cookie', async () => {
    const client = await addClient();

    const res = await request(app)
      .post('/v1/client-portal/login')
      .send({ email: client.email.toUpperCase(), password: 'Password123!' });

    expect(res.status).toBe(200);
    expect(typeof res.body.accessToken).toBe('string');
    expect(res.body.client.email).toBe(client.email);
    expect(String(res.headers['set-cookie'] || '')).toContain('clientRefreshToken=');
    expect(stores.accessTokens).toHaveLength(1);
    expect(stores.accessTokens[0].purpose).toBe('refresh');
  });

  it('rejects a refresh request without a client refresh cookie', async () => {
    const res = await request(app).post('/v1/client-portal/refresh').send({});
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('No client session to refresh');
  });

  it('clears the cookie on logout', async () => {
    const client = await addClient();
    const login = await request(app)
      .post('/v1/client-portal/login')
      .send({ email: client.email, password: 'Password123!' });
    const refresh = cookieValue(login.headers, 'clientRefreshToken');
    const csrf = cookieValue(login.headers, 'csrfToken');

    const logout = await request(app)
      .post('/v1/client-portal/logout')
      .set('Cookie', [`clientRefreshToken=${refresh}`, `csrfToken=${csrf}`])
      .set('x-csrf-token', csrf)
      .send({});

    expect(logout.status).toBe(200);
    expect(String(logout.headers['set-cookie'] || '')).toContain('clientRefreshToken=;');
    expect(stores.accessTokens.every((row) => !!row.revokedAt)).toBe(true);
  });
});
