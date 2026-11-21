import { describe, it, expect, vi } from 'vitest';
import {
  ANGISOFT_BRAND,
  renderBrandedDocument,
  renderBrandedEmail,
  safeUrl,
  sanitizeEmailHtml,
} from '../src/shared/services/emailTemplate';

const directSend = vi.fn();
let workerHandler: ((job: any) => Promise<void>) | undefined;
vi.mock('../src/queue', () => ({
  createWorker: (_name: string, handler: (job: any) => Promise<void>) => {
    workerHandler = handler;
    return {};
  },
}));
vi.mock('../src/shared/services/email', async () => {
  const template = await import('../src/shared/services/emailTemplate');
  return { ...template, sendMailDirect: (opts: any) => directSend(opts) };
});

describe('AngiSoft branded HTML templates', () => {
  it('wraps emails with the logo, brand colours, header and footer', () => {
    const html = renderBrandedEmail({
      title: 'Your report & recommendations',
      eyebrow: 'AI Workforce',
      preheader: 'Daily digest',
      bodyHtml: '<p>Hello <strong>AngiSoft</strong></p>',
      footerNote: 'Automated report.',
      cta: { label: 'Open Approval', url: 'https://admin.angisoft.co.ke/approvals' },
    });

    expect(html).toContain('data-angi-brand="1"');
    expect(html).toContain(ANGISOFT_BRAND.logoUrl);
    expect(html).toContain('AI Workforce');
    expect(html).toContain('Your report &amp; recommendations');
    expect(html).toContain('<p>Hello <strong>AngiSoft</strong></p>');
    expect(html).toContain('Open Approval');
    expect(html).toContain('Privacy Policy');
    expect(html).toContain('Terms &amp; Conditions');
    expect(html).toContain('Automated report.');
    expect(html).toContain('Nairobi, Kenya');
  });

  it('strips unsafe admin HTML while keeping useful content', () => {
    const html = sanitizeEmailHtml(
      '<p onclick="alert(1)">Safe</p><script>alert(1)</script><a href="javascript:alert(1)">bad</a>'
    );
    expect(html).toContain('<p>Safe</p>');
    expect(html).not.toContain('onclick');
    expect(html).not.toContain('<script');
    expect(html).not.toContain('javascript:');
  });

  it('only emits allowed URL schemes', () => {
    expect(safeUrl('https://angisoft.co.ke/privacy')).toBe('https://angisoft.co.ke/privacy');
    expect(safeUrl('mailto:info@angisoft.co.ke')).toBe('mailto:info@angisoft.co.ke');
    expect(safeUrl('javascript:alert(1)', '#')).toBe('#');
  });

  it('renders a print-ready document with logo, clauses and signatures', () => {
    const html = renderBrandedDocument({
      title: 'Mutual Non-Disclosure Agreement',
      subtitle: 'Draft for review',
      reference: 'REL-42',
      bodyHtml: '<p>Prepared for owner review.</p>',
      clauses: ['Parties and signatories confirmed', 'Governing law'],
      signatories: [{ name: 'AngiSoft Technologies', role: 'Disclosing party' }],
    });

    expect(html).toContain('data-angi-doc="1"');
    expect(html).toContain(ANGISOFT_BRAND.logoUrl);
    expect(html).toContain('Mutual Non-Disclosure Agreement');
    expect(html).toContain('REL-42');
    expect(html).toContain('Parties and signatories confirmed');
    expect(html).toContain('Signature: ______________________');
    expect(html).toContain('without SUPER_ADMIN approval');
  });

  it('forwards every branding field through the email queue worker', async () => {
    const { startEmailWorker } = await import('../src/workers/emailWorker');
    startEmailWorker();

    const job = {
      id: '1',
      data: {
        to: 'owner@angisoft.co.ke',
        subject: 'Your report',
        html: '<p>Body</p>',
        eyebrow: 'AI Workforce',
        cta: { label: 'Open', url: 'https://admin.angisoft.co.ke/agents' },
        footerNote: 'Automated.',
        unsubscribeUrl: 'https://angisoft.co.ke/unsubscribe',
        attachments: [{ filename: 'draft.html', content: '<p>Draft</p>' }],
      },
    };
    await workerHandler!(job);

    expect(directSend).toHaveBeenCalledWith(job.data);
    expect(directSend.mock.calls[0][0].cta.label).toBe('Open');
    expect(directSend.mock.calls[0][0].attachments).toHaveLength(1);
  });
});
