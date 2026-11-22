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
          const rows = store.filter((item) => matches(item, criteria));
          rows.forEach((row) => Object.assign(row, data));
          return { count: rows.length };
        },
        delete: async () => {
          const item = hit();
          const index = item ? store.indexOf(item) : -1;
          if (index >= 0) store.splice(index, 1);
          return item;
        },
        deleteAndCount: async () => {
          const before = store.length;
          for (let i = store.length - 1; i >= 0; i -= 1) {
            if (matches(store[i], criteria)) store.splice(i, 1);
          }
          return { count: before - store.length };
        },
      };
    },
    create: async (data: any) => {
      const row = { id: `row_${store.length + 1}`, ...data };
      store.push(row);
      return row;
    },
  });

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

vi.mock('../src/shared/services/audit', () => ({
  logAudit: vi.fn(async () => undefined),
}));

vi.mock('../src/shared/services/monitor', () => ({
  suspiciousAuthEvent: vi.fn(async () => undefined),
}));

import app from '../src/app';

describe('MFA login gate', () => {
  beforeEach(() => {
    stores.employees.length = 0;
    stores.methods.length = 0;
    stores.challenges.length = 0;
    stores.refreshTokens.length = 0;
    stores.backupCodes.length = 0;
    sendMailDirect.mockClear();
    process.env.MFA_HMAC_SECRET = 'test-mfa-secret';
  });

  const addEmployee = async (overrides: Record<string, unknown> = {}) => {
    const employee = {
      id: `emp_${stores.employees.length + 1}`,
      email: `user${stores.employees.length + 1}@angisoft.co.ke`,
      firstName: 'Test',
      lastName: 'User',
      role: 'ADMIN',
      passwordHash: await bcrypt.hash('Password123!', 10),
      twoFactorEnabled: false,
      mfaRequired: false,
      phone: null,
      ...overrides,
    };
    stores.employees.push(employee);
    return employee;
  };

  it('forces first-time setup without issuing a dashboard session', async () => {
    const employee = await addEmployee();

    const res = await request(app)
      .post('/v1/auth/login')
      .send({ email: employee.email, password: 'Password123!', remember: false });

    expect(res.status).toBe(200);
    expect(res.body.mfaSetupRequired).toBe(true);
    expect(typeof res.body.setupTicket).toBe('string');
    expect(res.body.methods.map((method: any) => method.type)).toEqual(expect.arrayContaining(['TOTP', 'PASSKEY']));
    expect(res.body.accessToken).toBeUndefined();
    expect(String(res.headers['set-cookie'] || '')).not.toContain('refreshToken=');
  });

  it('ignores a client-supplied OTP destination during login', async () => {
    const employee = await addEmployee({
      twoFactorEnabled: true,
      mfaRequired: true,
      phone: '0712345678',
    });
    stores.methods.push({
      id: 'method_email',
      employeeId: employee.id,
      type: 'EMAIL',
      label: 'Email',
      destination: 'owner@angisoft.co.ke',
      enabled: true,
    });

    const login = await request(app)
      .post('/v1/auth/login')
      .send({ email: employee.email, password: 'Password123!' });
    expect(login.status).toBe(200);
    expect(login.body.mfaRequired).toBe(true);

    const start = await request(app).post('/v1/auth/mfa/start').send({
      loginTicket: login.body.loginTicket,
      method: 'EMAIL',
      destination: 'attacker@example.com',
    });

    expect(start.status).toBe(200);
    expect(start.body.destination).toBe('owner@angisoft.co.ke');
    expect(sendMailDirect).toHaveBeenCalledTimes(1);
    expect(sendMailDirect.mock.calls[0][0].to).toBe('owner@angisoft.co.ke');
  });
});
