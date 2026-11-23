import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcrypt';

const { stores, sendMailDirect, queryable } = vi.hoisted(() => {
  const matches = (item: any, criteria: any) =>
    Object.entries(criteria).every(([key, value]) => item?.[key] === value);

  const queryable = (store: any[]) => ({
    where(criteria: any) {
      const hit = () => store.find((item) => matches(item, criteria)) ?? null;
      return {
        first: async () => hit(),
        all: async () => store.filter((item) => matches(item, criteria)),
        update: async (data: any) => {
          const item = hit();
          if (item) Object.assign(item, data);
          return item;
        },
        updateAll: async (data: any) => {
          store.filter((item) => matches(item, criteria)).forEach((item) => Object.assign(item, data));
          return { count: store.length };
        },
        delete: async () => {
          const item = hit();
          const index = item ? store.indexOf(item) : -1;
          if (index >= 0) store.splice(index, 1);
          return item;
        },
      };
    },
    create: async (data: any) => {
      const row = { id: `row_${store.length + 1}`, ...data };
      store.push(row);
      return row;
    },
  });

  process.env.MFA_HMAC_SECRET = 'test-mfa-secret';
  process.env.JWT_SECRET = 'mfa-ui-test-secret-that-is-long-enough';

  return {
    stores: {
      employees: [] as any[],
      methods: [] as any[],
      challenges: [] as any[],
      refreshTokens: [] as any[],
      backupCodes: [] as any[],
    },
    sendMailDirect: vi.fn(async () => true),
    queryable,
  };
});

vi.mock('../src/db', () => ({
  default: {
    orm: {
      public: {
        Employee: queryable(stores.employees),
        MfaMethod: queryable(stores.methods),
        MfaChallenge: queryable(stores.challenges),
        RefreshToken: queryable(stores.refreshTokens),
        TwoFactorBackupCode: queryable(stores.backupCodes),
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
  sendMail: vi.fn(async () => true),
  sendMailDirect,
  verifyTransporter: vi.fn(async () => true),
}));

vi.mock('../src/shared/services/audit', () => ({ logAudit: vi.fn(async () => undefined) }));
vi.mock('../src/shared/services/monitor', () => ({ suspiciousAuthEvent: vi.fn(async () => undefined) }));
vi.mock('../src/modules/ai/routes/chatbot', async () => {
  const express = await import('express');
  return { default: () => express.Router() };
});

import app from '../src/app';

describe('admin MFA UI contract', () => {
  beforeEach(() => {
    stores.employees.length = 0;
    stores.methods.length = 0;
    stores.challenges.length = 0;
    stores.refreshTokens.length = 0;
    stores.backupCodes.length = 0;
  });

  it('returns a login ticket and labelled methods the login screen can render', async () => {
    const employee = {
      id: 'emp_1',
      email: 'admin@example.com',
      firstName: 'Test',
      lastName: 'Admin',
      role: 'ADMIN',
      passwordHash: await bcrypt.hash('Password123!', 10),
      twoFactorEnabled: true,
      mfaRequired: true,
      phone: null,
    };
    stores.employees.push(employee);
    stores.methods.push({
      id: 'method_totp',
      employeeId: employee.id,
      type: 'TOTP',
      label: 'Authenticator app',
      destination: null,
      enabled: true,
    });

    const login = await request(app)
      .post('/v1/auth/login')
      .send({ email: employee.email, password: 'Password123!' });

    expect(login.status).toBe(200);
    expect(login.body.mfaRequired).toBe(true);
    expect(typeof login.body.loginTicket).toBe('string');
    expect(login.body.accessToken).toBeUndefined();
    expect(login.body.methods.map((method: any) => method.type)).toContain('TOTP');
    expect(login.body.methods.map((method: any) => method.label)).toContain('Authenticator app');

    const start = await request(app)
      .post('/v1/auth/mfa/start')
      .send({ loginTicket: login.body.loginTicket, method: 'TOTP' });

    expect(start.status).toBe(200);
    expect(start.body.method).toBe('TOTP');
    expect(start.body.message).toBeTruthy();
    expect(start.body.challengeId).toBeNull();
  });
});
