/**
 * AngiSoft branded HTML templates.
 *
 * Email clients ignore external stylesheets and many modern CSS features, so
 * every rule here is inline and laid out with tables (Outlook-safe). The
 * templates deliberately carry no business content — callers supply only a
 * body fragment — so branding stays consistent across agents, auth, billing
 * and newsletters.
 *
 * The PNG logo is served from the public CDN rather than embedded: absolute
 * HTTPS URLs are what Gmail/Outlook/Yahoo actually render. Set
 * `EMAIL_LOGO_URL` to override the default.
 */

import { getConfig } from './runtimeConfig';

export const ANGISOFT_BRAND = {
  name: 'AngiSoft Technologies',
  shortName: 'AngiSoft',
  tagline: 'Innovate • Build • Empower',
  website: 'https://angisoft.co.ke',
  email: 'info@angisoft.co.ke',
  whatsapp: '+254 710 398 690',
  whatsappUrl: 'https://wa.me/254710398690',
  privacyUrl: 'https://angisoft.co.ke/privacy',
  termsUrl: 'https://angisoft.co.ke/terms',
  get logoUrl() {
    return getConfig('EMAIL_LOGO_URL') ||
      'https://cdn1.angisoft.co.ke/company-portfolio/public/images/Logos/AngiSoft_Dark_Background_Logo-removebg.png';
  },
  colors: {
    navy: '#07142B',
    abyss: '#061324',
    primary: '#0875FF',
    cyan: '#00AFFF',
    green: '#24B947',
    offWhite: '#F5F7FA',
    ink: '#1E293B',
    muted: '#64748B',
    line: '#E2E8F0',
    pale: '#DDEFFF',
  },
} as const;

export interface EmailCta {
  label: string;
  url: string;
}

export interface BrandedEmailInput {
  /** Main heading shown under the header. Defaults to the mail subject. */
  title?: string;
  /** Small uppercase label in the header, e.g. "AI Workforce" or "Security". */
  eyebrow?: string;
  /** One-line preview shown in the inbox before the subject. */
  preheader?: string;
  /** Trusted HTML body fragment. Untrusted values must be escaped by callers. */
  bodyHtml: string;
  cta?: EmailCta;
  /** Extra context appended to the footer, e.g. why the recipient got the mail. */
  footerNote?: string;
  /** Newsletter/broadcast unsubscribe link. */
  unsubscribeUrl?: string;
}

export interface BrandedDocumentInput {
  title: string;
  subtitle?: string;
  reference?: string;
  eyebrow?: string;
  bodyHtml: string;
  /** Optional clauses rendered as a numbered list. */
  clauses?: string[];
  /** Optional signature block names. */
  signatories?: Array<{ name: string; role?: string }>;
  preparedFor?: string;
}

/** Escape text for use in HTML text nodes and attributes. */
export function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Only allow web/mail/telephone schemes in generated links and images. */
export function safeUrl(value: unknown, fallback = '#'): string {
  const raw = String(value ?? '').trim();
  if (!raw) return fallback;
  if (/^(https?:|mailto:|tel:)/i.test(raw)) return escapeHtml(raw);
  return fallback;
}

/**
 * Light sanitizer for admin-authored newsletter HTML. It does not make arbitrary
 * HTML fully safe, but it strips the obvious script/event/javascript vectors
 * before the fragment is dropped into the branded shell.
 */
export function sanitizeEmailHtml(html: unknown): string {
  return String(html ?? '')
    .replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, '')
    .replace(/<iframe\b[^>]*>[\s\S]*?<\/iframe\s*>/gi, '')
    .replace(/\son\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/(href|src)\s*=\s*(["'])\s*javascript:[\s\S]*?\2/gi, '$1="#"')
    .trim();
}

function brandBar(): string {
  const c = ANGISOFT_BRAND.colors;
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse">
      <tr>
        <td style="height:4px;background:${c.primary};font-size:0;line-height:0">&nbsp;</td>
        <td style="height:4px;background:${c.cyan};font-size:0;line-height:0">&nbsp;</td>
        <td style="height:4px;background:${c.green};font-size:0;line-height:0">&nbsp;</td>
      </tr>
    </table>`;
}

function emailFooter(footerNote?: string, unsubscribeUrl?: string): string {
  const c = ANGISOFT_BRAND.colors;
  const year = new Date().getFullYear();
  const note = footerNote ? `${escapeHtml(footerNote)} &nbsp;·&nbsp; ` : '';
  const unsubscribe = unsubscribeUrl
    ? ` &nbsp;·&nbsp; <a href="${safeUrl(unsubscribeUrl)}" style="color:#94A3B8;text-decoration:underline">Unsubscribe</a>`
    : '';
  return `
    <tr>
      <td style="background:${c.abyss};padding:26px 32px;color:#CCE2FA;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.7">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse">
          <tr>
            <td style="vertical-align:top">
              <strong style="color:#FFFFFF;font-size:14px">${escapeHtml(ANGISOFT_BRAND.name)}</strong><br>
              ${escapeHtml(ANGISOFT_BRAND.tagline)}<br>
              Nairobi, Kenya
            </td>
            <td align="right" style="vertical-align:top;color:#18D8FF">
              <a href="mailto:${escapeHtml(ANGISOFT_BRAND.email)}" style="color:#18D8FF;text-decoration:none">${escapeHtml(ANGISOFT_BRAND.email)}</a><br>
              <a href="${safeUrl(ANGISOFT_BRAND.whatsappUrl)}" style="color:#18D8FF;text-decoration:none">WhatsApp ${escapeHtml(ANGISOFT_BRAND.whatsapp)}</a><br>
              <a href="${safeUrl(ANGISOFT_BRAND.website)}" style="color:#18D8FF;text-decoration:none">angisoft.co.ke</a>
            </td>
          </tr>
        </table>
        <div style="border-top:1px solid rgba(255,255,255,.14);margin-top:18px;padding-top:14px;color:#94A3B8">
          ${note}© ${year} ${escapeHtml(ANGISOFT_BRAND.name)}. All rights reserved.${unsubscribe}<br>
          <a href="${safeUrl(ANGISOFT_BRAND.privacyUrl)}" style="color:#94A3B8;text-decoration:underline">Privacy Policy</a>
          &nbsp;·&nbsp;
          <a href="${safeUrl(ANGISOFT_BRAND.termsUrl)}" style="color:#94A3B8;text-decoration:underline">Terms &amp; Conditions</a>
        </div>
      </td>
    </tr>`;
}

/** Build the complete, inline-styled HTML email used by every outgoing mail. */
export function renderBrandedEmail(input: BrandedEmailInput): string {
  const c = ANGISOFT_BRAND.colors;
  const title = input.title || ANGISOFT_BRAND.name;
  const preheader = input.preheader || '';
  const eyebrow = input.eyebrow || 'AngiSoft Technologies';
  const body = sanitizeEmailHtml(input.bodyHtml);
  const cta = input.cta
    ? `
      <tr>
        <td align="center" style="padding:4px 32px 30px;font-family:Arial,Helvetica,sans-serif">
          <a href="${safeUrl(input.cta.url)}" style="display:inline-block;background:${c.primary};color:#FFFFFF;padding:13px 28px;border-radius:10px;text-decoration:none;font-size:15px;font-weight:700;line-height:1.2">${escapeHtml(input.cta.label)}</a>
        </td>
      </tr>`
    : '';

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="light">
  <title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background:${c.offWhite}">
  <div style="display:none;font-size:1px;color:${c.offWhite};line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden">${escapeHtml(preheader)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" data-angi-brand="1" style="border-collapse:collapse;background:${c.offWhite};padding:24px 12px">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;max-width:640px;background:#FFFFFF;border-radius:16px;overflow:hidden;box-shadow:0 10px 32px rgba(6,19,36,.08)">
          <tr>
            <td style="background:${c.navy};padding:26px 32px">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse">
                <tr>
                  <td style="vertical-align:middle">
                    <img src="${safeUrl(ANGISOFT_BRAND.logoUrl)}" width="150" alt="${escapeHtml(ANGISOFT_BRAND.name)}" style="display:block;max-width:150px;height:auto;border:0">
                  </td>
                  <td align="right" style="vertical-align:middle;color:#18D8FF;font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:700;letter-spacing:1.4px;text-transform:uppercase">${escapeHtml(eyebrow)}</td>
                </tr>
              </table>
            </td>
          </tr>
          <tr><td style="padding:0">${brandBar()}</td></tr>
          <tr>
            <td style="padding:30px 32px 8px;font-family:Arial,Helvetica,sans-serif">
              <h1 style="margin:0;font-size:23px;line-height:1.3;color:${c.navy};font-weight:700">${escapeHtml(title)}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:10px 32px 22px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.7;color:${c.ink}">
              ${body}
            </td>
          </tr>
          ${cta}
          <tr>
            <td style="padding:0 32px 24px;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:${c.muted}">
              Reply to this email to reach the AngiSoft team directly.
            </td>
          </tr>
          ${emailFooter(input.footerNote, input.unsubscribeUrl)}
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Print-ready branded document (NDA, letter, contract draft, report).
 * Save as .html and print to PDF, or pass as a mail attachment.
 */
export function renderBrandedDocument(input: BrandedDocumentInput): string {
  const c = ANGISOFT_BRAND.colors;
  const clauses = (input.clauses ?? [])
    .map((clause, i) => `<li style="margin:0 0 10px">${escapeHtml(clause)}</li>`)
    .join('');
  const signatories = (input.signatories ?? [])
    .map(
      (s) => `
        <td width="50%" valign="top" style="padding:36px 16px 0 0">
          <div style="border-top:1px solid ${c.line};padding-top:10px;font-weight:700;color:${c.navy}">${escapeHtml(s.name)}</div>
          <div style="color:${c.muted};font-size:12px">${escapeHtml(s.role ?? '')}</div>
          <div style="margin-top:28px;color:${c.muted};font-size:11px">Signature: ______________________</div>
        </td>`
    )
    .join('');

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(input.title)}</title>
  <style>
    @page { size: A4; margin: 20mm; }
    body { margin: 0; color: ${c.ink}; font-family: Arial, Helvetica, sans-serif; font-size: 14px; line-height: 1.65; }
    .angi-doc { max-width: 800px; margin: 0 auto; }
    @media print { .angi-doc { max-width: none; } h1, h2, .angi-doc__header { break-after: avoid; } tr { break-inside: avoid; } }
  </style>
</head>
<body>
  <div class="angi-doc" data-angi-doc="1">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="angi-doc__header" style="border-collapse:collapse;border-bottom:4px solid ${c.primary};padding-bottom:18px">
      <tr>
        <td style="vertical-align:middle">
          <img src="${safeUrl(ANGISOFT_BRAND.logoUrl)}" width="165" alt="${escapeHtml(ANGISOFT_BRAND.name)}" style="display:block;max-width:165px;height:auto;border:0">
        </td>
        <td align="right" style="vertical-align:middle;color:${c.muted};font-size:11px;line-height:1.5">
          ${escapeHtml(input.eyebrow || 'Confidential draft')}<br>
          ${input.reference ? `Ref: ${escapeHtml(input.reference)}<br>` : ''}
          ${new Date().toLocaleDateString('en-KE', { day: 'numeric', month: 'long', year: 'numeric' })}
        </td>
      </tr>
    </table>

    <h1 style="margin:32px 0 4px;font-size:26px;line-height:1.25;color:${c.navy}">${escapeHtml(input.title)}</h1>
    ${input.subtitle ? `<p style="margin:0 0 22px;color:${c.muted};font-size:14px">${escapeHtml(input.subtitle)}</p>` : ''}
    ${input.preparedFor ? `<p style="margin:0 0 18px"><strong>Prepared for:</strong> ${escapeHtml(input.preparedFor)}</p>` : ''}

    <div style="font-size:14px;line-height:1.7">${sanitizeEmailHtml(input.bodyHtml)}</div>

    ${clauses ? `<h2 style="margin:26px 0 10px;font-size:16px;color:${c.navy}">Review clauses</h2><ol style="margin:0;padding-left:22px">${clauses}</ol>` : ''}

    ${signatories ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;margin-top:34px"><tr>${signatories}</tr></table>` : ''}

    <div style="margin-top:42px;border-top:1px solid ${c.line};padding-top:14px;color:${c.muted};font-size:11px;line-height:1.6">
      <strong style="color:${c.navy}">${escapeHtml(ANGISOFT_BRAND.name)}</strong> · ${escapeHtml(ANGISOFT_BRAND.tagline)}<br>
      ${escapeHtml(ANGISOFT_BRAND.email)} · ${escapeHtml(ANGISOFT_BRAND.whatsapp)} · ${escapeHtml(ANGISOFT_BRAND.website)}<br>
      This draft is generated for owner review. No document is sent, signed or amended without SUPER_ADMIN approval.
    </div>
  </div>
</body>
</html>`;
}

/** Convenience CTA fragment for callers that build their own body HTML. */
export function emailButton(label: string, url: string): string {
  return `<a href="${safeUrl(url)}" style="display:inline-block;background:${ANGISOFT_BRAND.colors.primary};color:#FFFFFF;padding:12px 26px;border-radius:10px;text-decoration:none;font-weight:700">${escapeHtml(label)}</a>`;
}
