import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { sendMetaConversionMock, firstPartySourceUrlMock } = vi.hoisted(() => ({
  sendMetaConversionMock: vi.fn(async () => ({ sent: true })),
  firstPartySourceUrlMock: vi.fn(() => 'https://angisoft.co.ke/contact'),
}));

vi.mock('../src/modules/communications/services/metaConversions', () => ({
  sendMetaConversion: sendMetaConversionMock,
  firstPartySourceUrl: firstPartySourceUrlMock,
}));

vi.mock('../src/shared/middleware/rateLimiter', () => ({
  gContactLimiter: (_req: unknown, _res: unknown, next: () => void) => next(),
}));

vi.mock('../src/shared/middleware/auth', () => ({
  requireAuth: (_req: unknown, _res: unknown, next: () => void) => next(),
}));

vi.mock('../src/shared/middleware/roles', () => ({
  requireAccess: () => (_req: unknown, _res: unknown, next: () => void) => next(),
  requirePermission: () => (_req: unknown, _res: unknown, next: () => void) => next(),
}));

vi.mock('../src/identity/services/effectivePermissions', () => ({ has: vi.fn() }));
vi.mock('../src/db', () => ({ default: {}, validateDatabaseConnection: async () => true }));
vi.mock('../src/prisma/db', () => ({
  db: {},
  default: {},
  ts: () => '2026-11-22T00:00:00.000Z',
  tsMs: () => 0,
  newId: () => 'enq_1',
}));
vi.mock('@prisma/orm-postgres/orm-client', () => ({ or: vi.fn() }));

import contactEnquiriesRouter from '../src/modules/crm/routes/contact-enquiries';
import type { Db } from '../src/db';

function appFor(create: ReturnType<typeof vi.fn>) {
  const prisma = { orm: { public: { ContactEnquiry: { create } } } } as unknown as Db;
  const app = express();
  app.use(express.json());
  app.use('/v1/contact-enquiries', contactEnquiriesRouter(prisma));
  return app;
}

const body = () => ({
  name: 'Jane Doe',
  email: 'jane@example.com',
  phone: '0712345678',
  preferredResponseMethod: 'email',
  enquiryType: 'general',
  subject: 'Website enquiry',
  message: 'I would like to discuss a project with your team.',
  source: 'home-contact-section',
  sourcePath: '/contact',
  formStartedAt: Date.now() - 5_000,
});

describe('contact enquiry Meta CAPI consent', () => {
  beforeEach(() => {
    sendMetaConversionMock.mockClear();
    firstPartySourceUrlMock.mockClear();
  });

  it('saves the enquiry without a conversion event when consent is absent', async () => {
    const create = vi.fn(async (data: any) => ({
      id: 'enq_1',
      publicReference: 'ANG-2026-TEST',
      status: 'new',
      createdAt: '2026-11-22T00:00:00.000Z',
      ...data,
    }));
    const response = await request(appFor(create)).post('/v1/contact-enquiries').send(body());

    expect(response.status).toBe(201);
    expect(create).toHaveBeenCalledTimes(1);
    expect(sendMetaConversionMock).not.toHaveBeenCalled();
    expect(firstPartySourceUrlMock).not.toHaveBeenCalled();
  });

  it('dispatches one consented Lead event without delaying the saved enquiry response', async () => {
    const create = vi.fn(async (data: any) => ({
      id: 'enq_1',
      publicReference: 'ANG-2026-TEST',
      status: 'new',
      createdAt: '2026-11-22T00:00:00.000Z',
      ...data,
    }));
    const response = await request(appFor(create))
      .post('/v1/contact-enquiries')
      .send({ ...body(), marketingConsent: true });

    expect(response.status).toBe(201);
    expect(response.body.enquiry.id).toBe('enq_1');
    await vi.waitFor(() => expect(sendMetaConversionMock).toHaveBeenCalledTimes(1));
    expect(firstPartySourceUrlMock).toHaveBeenCalledWith('/contact');
    expect(sendMetaConversionMock).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      eventName: 'Lead',
      eventId: 'lead:enq_1',
      email: 'jane@example.com',
      phone: '0712345678',
      sourceUrl: 'https://angisoft.co.ke/contact',
      marketingConsent: true,
    }));
  });
});
