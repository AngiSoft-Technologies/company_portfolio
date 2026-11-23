import { useEffect, useState } from 'react';
import { apiGet } from '@/lib/httpClient';

/**
 * Legal page content from the public CMS endpoint `GET /v1/legal/:key`.
 *
 * The backend returns structured sections (never HTML), so the pages render
 * plain React elements — no `dangerouslySetInnerHTML` and no sanitizer needed.
 * The checked-in fallback mirrors the backend fallback so privacy/terms stay
 * readable before an owner seeds `legal.privacy` / `legal.terms` settings or
 * when the request fails.
 */

export type LegalKey = 'privacy' | 'terms';

export interface LegalListItem {
  label?: string;
  text: string;
}

export type LegalBlock =
  | { type: 'paragraph'; text: string }
  | { type: 'heading'; text: string }
  | { type: 'list'; items: LegalListItem[] }
  | { type: 'contact'; title: string; lines: string[] };

export interface LegalSection {
  id: string;
  title: string;
  navTitle?: string;
  blocks: LegalBlock[];
}

export interface LegalDocument {
  key: LegalKey;
  titleLead: string;
  titleAccent: string;
  summary: string;
  sections: LegalSection[];
  source: 'cms' | 'fallback';
}

export const FALLBACK_LEGAL_DOCUMENTS: Record<LegalKey, Omit<LegalDocument, 'source'>> = {
  privacy: {
    key: 'privacy',
    titleLead: 'Privacy ',
    titleAccent: 'Policy',
    summary: 'Last updated: May 16, 2026. This policy describes how AngiSoft Technologies collects, uses, and protects your personal information.',
    sections: [
      {
        id: 'introduction',
        title: 'Introduction',
        navTitle: 'Introduction',
        blocks: [
          { type: 'paragraph', text: `AngiSoft Technologies ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website, use our products, or engage with our services.` },
          { type: 'paragraph', text: `We respect your privacy and are committed to protecting personally identifiable information you may provide us through our website and services. We have adopted this privacy policy to explain what information may be collected, how we use this information, and under what circumstances we may disclose the information to third parties.` },
          { type: 'paragraph', text: `Please read this privacy policy carefully. If you do not agree with the terms of this privacy policy, please do not access the site or use our services.` },
        ],
      },
      {
        id: 'data-collection',
        title: 'Information We Collect',
        navTitle: 'Data We Collect',
        blocks: [
          { type: 'paragraph', text: `We collect information that you provide directly to us and information that is automatically collected when you use our services.` },
          { type: 'heading', text: 'Personal Information' },
          {
            type: 'list',
            items: [
              { text: 'Name, email address, phone number, and postal address' },
              { text: 'Company name, job title, and professional details' },
              { text: 'Payment and billing information (processed securely through third-party providers)' },
              { text: 'Account credentials (username and encrypted password)' },
              { text: 'Communications and correspondence with our team' },
            ],
          },
          { type: 'heading', text: 'Automatically Collected Information' },
          {
            type: 'list',
            items: [
              { text: 'IP address, browser type, and operating system' },
              { text: 'Device identifiers and characteristics' },
              { text: 'Pages visited, time spent, and navigation patterns' },
              { text: 'Referring URLs and exit pages' },
              { text: 'Location data (country/region level, with your consent)' },
            ],
          },
        ],
      },
      {
        id: 'data-usage',
        title: 'How We Use Your Information',
        navTitle: 'How We Use Data',
        blocks: [
          { type: 'paragraph', text: 'We use the information we collect for various purposes, including:' },
          {
            type: 'list',
            items: [
              { label: 'Service Delivery', text: 'To provide, operate, and maintain our products and services' },
              { label: 'Communication', text: 'To respond to inquiries, send service updates, and provide customer support' },
              { label: 'Improvement', text: 'To analyze usage patterns and improve our website, products, and services' },
              { label: 'Marketing', text: 'To send promotional communications (with your consent) about our services, offers, and updates' },
              { label: 'Security', text: 'To detect, prevent, and address technical issues and fraudulent activities' },
              { label: 'Legal Compliance', text: 'To comply with legal obligations and enforce our terms of service' },
              { label: 'Personalization', text: 'To customize your experience and deliver relevant content and recommendations' },
            ],
          },
        ],
      },
      {
        id: 'cookies',
        title: 'Cookies & Tracking Technologies',
        navTitle: 'Cookies & Tracking',
        blocks: [
          { type: 'paragraph', text: 'We use cookies and similar tracking technologies to enhance your experience on our website. Cookies are small data files stored on your device.' },
          { type: 'heading', text: 'Types of Cookies We Use' },
          {
            type: 'list',
            items: [
              { label: 'Essential Cookies', text: 'Required for the website to function properly (authentication, security)' },
              { label: 'Analytics Cookies', text: 'Help us understand how visitors interact with our website' },
              { label: 'Functional Cookies', text: 'Remember your preferences and settings' },
              { label: 'Marketing Cookies', text: 'Used to deliver relevant advertisements (with your consent)' },
            ],
          },
          { type: 'paragraph', text: 'You can control cookie settings through your browser preferences. Note that disabling certain cookies may affect the functionality of our website.' },
        ],
      },
      {
        id: 'third-parties',
        title: 'Third-Party Sharing',
        navTitle: 'Third-Party Sharing',
        blocks: [
          { type: 'paragraph', text: 'We do not sell your personal information to third parties. We may share your information only in the following circumstances:' },
          {
            type: 'list',
            items: [
              { label: 'Service Providers', text: 'With trusted third-party vendors who assist us in operating our business (hosting, payment processing, analytics)' },
              { label: 'Legal Requirements', text: 'When required by law, regulation, or legal process' },
              { label: 'Business Transfers', text: 'In connection with a merger, acquisition, or sale of assets' },
              { label: 'Consent', text: 'With your explicit consent for specific purposes' },
              { label: 'Protection', text: 'To protect the rights, property, or safety of AngiSoft, our clients, or others' },
            ],
          },
          { type: 'paragraph', text: 'All third-party service providers are contractually obligated to protect your information and use it only for the purposes we specify.' },
        ],
      },
      {
        id: 'security',
        title: 'Data Security',
        navTitle: 'Data Security',
        blocks: [
          { type: 'paragraph', text: 'We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction.' },
          {
            type: 'list',
            items: [
              { text: 'Encryption of data in transit (TLS/SSL) and at rest' },
              { text: 'Regular security assessments and penetration testing' },
              { text: 'Access controls and authentication mechanisms' },
              { text: 'Employee training on data protection best practices' },
              { text: 'Incident response and breach notification procedures' },
              { text: 'Regular backups and disaster recovery planning' },
            ],
          },
          { type: 'paragraph', text: 'While we strive to use commercially acceptable means to protect your personal information, no method of transmission over the Internet or electronic storage is 100% secure.' },
        ],
      },
      {
        id: 'rights',
        title: 'Your Rights',
        navTitle: 'Your Rights',
        blocks: [
          { type: 'paragraph', text: 'Depending on your location, you may have the following rights regarding your personal data:' },
          {
            type: 'list',
            items: [
              { label: 'Access', text: 'Request a copy of the personal data we hold about you' },
              { label: 'Rectification', text: 'Request correction of inaccurate or incomplete data' },
              { label: 'Erasure', text: 'Request deletion of your personal data (subject to legal obligations)' },
              { label: 'Restriction', text: 'Request that we limit the processing of your data' },
              { label: 'Portability', text: 'Receive your data in a structured, machine-readable format' },
              { label: 'Objection', text: 'Object to the processing of your data for certain purposes' },
              { label: 'Withdraw Consent', text: 'Withdraw consent at any time where processing is based on consent' },
            ],
          },
          { type: 'paragraph', text: 'To exercise any of these rights, please contact us using the information provided below. We will respond to your request within 30 days.' },
        ],
      },
      {
        id: 'contact',
        title: 'Contact Us',
        navTitle: 'Contact Us',
        blocks: [
          { type: 'paragraph', text: 'If you have questions or concerns about this Privacy Policy or our data practices, please contact us:' },
          {
            type: 'contact',
            title: 'AngiSoft Technologies',
            lines: [
              'Data Protection Officer',
              'Email: privacy@angisoft.co.ke',
              'Phone: +254 700 000 000',
              'Nairobi, Kenya',
            ],
          },
          { type: 'paragraph', text: 'We reserve the right to update this Privacy Policy at any time. Changes will be posted on this page with an updated revision date. We encourage you to review this policy periodically.' },
        ],
      },
    ],
  },
  terms: {
    key: 'terms',
    titleLead: 'Terms & ',
    titleAccent: 'Conditions',
    summary: 'Last updated: May 16, 2026. Please read these terms carefully before using our services or engaging with our platform.',
    sections: [
      {
        id: 'introduction',
        title: 'Introduction',
        navTitle: 'Introduction',
        blocks: [
          { type: 'paragraph', text: `These Terms and Conditions ("Terms") govern your use of the website, products, and services provided by AngiSoft Technologies ("Company," "we," "our," or "us"). By accessing our website or engaging our services, you agree to be bound by these Terms.` },
          { type: 'paragraph', text: `If you are entering into these Terms on behalf of a company or other legal entity, you represent that you have the authority to bind such entity to these Terms. If you do not have such authority, or if you do not agree with these Terms, you must not accept these Terms and may not use our services.` },
          { type: 'paragraph', text: `We reserve the right to modify these Terms at any time. Changes will be effective upon posting to the website. Your continued use of our services after any such changes constitutes your acceptance of the new Terms.` },
        ],
      },
      {
        id: 'services',
        title: 'Our Services',
        navTitle: 'Our Services',
        blocks: [
          { type: 'paragraph', text: 'AngiSoft Technologies provides the following services:' },
          {
            type: 'list',
            items: [
              { label: 'Custom Software Development', text: 'Bespoke web and mobile application development using modern frameworks and technologies' },
              { label: 'SaaS Products', text: 'Cloud-based software products including PetroFlow, DukaFlow, KejaLink, and AngiTunes' },
              { label: 'Data Analytics', text: 'Business intelligence, dashboard creation, and data analysis services' },
              { label: 'Cyber Services', text: 'Document editing, government applications, and digital services' },
              { label: 'Consulting', text: 'Technology consulting, architecture design, and project planning' },
              { label: 'Maintenance & Support', text: 'Ongoing technical support, hosting, and maintenance services' },
            ],
          },
          { type: 'paragraph', text: 'Service availability may vary by region. We reserve the right to modify, suspend, or discontinue any service with reasonable notice.' },
        ],
      },
      {
        id: 'bookings',
        title: 'Bookings & Engagements',
        navTitle: 'Bookings & Engagements',
        blocks: [
          { type: 'paragraph', text: 'When you submit a booking request through our platform:' },
          {
            type: 'list',
            items: [
              { text: 'All booking requests are subject to review and acceptance by our team' },
              { text: 'We will provide a project scope, timeline, and cost estimate upon acceptance' },
              { text: 'A formal agreement or Statement of Work (SOW) will be provided for custom development projects' },
              { text: 'Project timelines are estimates and may be subject to change based on scope adjustments or unforeseen circumstances' },
              { text: 'Client cooperation and timely feedback are essential for project delivery' },
              { text: 'Changes to project scope may affect timeline and cost, and will be communicated in advance' },
            ],
          },
          { type: 'paragraph', text: 'We reserve the right to decline any booking request at our discretion.' },
        ],
      },
      {
        id: 'payments',
        title: 'Payments & Pricing',
        navTitle: 'Payments & Pricing',
        blocks: [
          { type: 'paragraph', text: 'Payment terms for our services:' },
          {
            type: 'list',
            items: [
              { text: 'Pricing for custom projects is provided in the project proposal and is valid for 30 days unless otherwise stated' },
              { text: 'A deposit may be required before work commences, as specified in the project agreement' },
              { text: 'SaaS product subscriptions are billed monthly or annually as selected at the time of purchase' },
              { text: 'All prices are quoted in Kenyan Shillings (KES) unless otherwise specified' },
              { text: 'Payments are processed through secure third-party payment processors' },
              { text: 'Late payments may result in suspension of services after reasonable notice' },
              { text: 'Refunds are handled on a case-by-case basis in accordance with our refund policy' },
            ],
          },
          { type: 'paragraph', text: `We reserve the right to modify pricing with 30 days' notice for subscription services. Price changes for existing projects require mutual agreement.` },
        ],
      },
      {
        id: 'intellectual-property',
        title: 'Intellectual Property',
        navTitle: 'Intellectual Property',
        blocks: [
          { type: 'paragraph', text: 'Intellectual property rights are an important aspect of our business relationship:' },
          {
            type: 'list',
            items: [
              { label: 'Client Content', text: 'You retain ownership of all content, data, and materials you provide to us' },
              { label: 'Custom Development', text: 'Upon full payment, ownership of custom-developed code is transferred to the client as specified in the project agreement' },
              { label: 'Our Tools & Frameworks', text: 'We retain ownership of our proprietary tools, frameworks, libraries, and pre-existing code used in the development process' },
              { label: 'SaaS Products', text: 'Our SaaS products (PetroFlow, DukaFlow, KejaLink, AngiTunes) and all associated intellectual property remain our exclusive property' },
              { label: 'License Grant', text: 'We grant clients a non-exclusive, non-transferable license to use our SaaS products for the duration of their subscription' },
              { label: 'Restrictions', text: 'You may not reverse-engineer, decompile, or attempt to extract the source code of our products' },
            ],
          },
        ],
      },
      {
        id: 'liability',
        title: 'Limitation of Liability',
        navTitle: 'Limitation of Liability',
        blocks: [
          { type: 'paragraph', text: 'To the maximum extent permitted by applicable law:' },
          {
            type: 'list',
            items: [
              { text: 'Our services are provided "as is" and "as available" without warranties of any kind, either express or implied' },
              { text: 'We do not warrant that our services will be uninterrupted, error-free, or completely secure' },
              { text: 'We shall not be liable for any indirect, incidental, special, consequential, or punitive damages' },
              { text: 'Our total liability for any claim arising from or related to our services shall not exceed the amount paid by you for the specific service in the 12 months preceding the claim' },
              { text: 'We are not liable for damages resulting from third-party services, force majeure events, or circumstances beyond our reasonable control' },
              { text: 'It is your responsibility to maintain adequate backups of your data' },
            ],
          },
        ],
      },
      {
        id: 'termination',
        title: 'Termination',
        navTitle: 'Termination',
        blocks: [
          { type: 'paragraph', text: 'Either party may terminate the engagement under the following conditions:' },
          {
            type: 'list',
            items: [
              { text: 'SaaS subscriptions can be cancelled at any time, with access continuing until the end of the current billing period' },
              { text: 'Custom project termination requires written notice and is subject to the terms outlined in the project agreement' },
              { text: 'We may suspend or terminate your access to services immediately if you breach these Terms' },
              { text: 'Upon termination, your right to use our services ceases immediately' },
              { text: 'We will provide reasonable assistance for data export within 30 days of termination' },
              { text: 'Outstanding payments for work completed remain due upon termination' },
            ],
          },
        ],
      },
      {
        id: 'governing-law',
        title: 'Governing Law',
        navTitle: 'Governing Law',
        blocks: [
          { type: 'paragraph', text: 'These Terms shall be governed by and construed in accordance with the laws of the Republic of Kenya, without regard to its conflict of law provisions.' },
          { type: 'paragraph', text: 'Any disputes arising from or relating to these Terms or our services shall first be attempted to be resolved through good-faith negotiation. If negotiation fails, disputes shall be submitted to the jurisdiction of the courts of Nairobi, Kenya.' },
          { type: 'paragraph', text: 'If any provision of these Terms is held to be unenforceable or invalid, such provision will be modified to the minimum extent necessary to make it enforceable, and the remaining provisions shall continue in full force and effect.' },
        ],
      },
      {
        id: 'contact',
        title: 'Contact Us',
        navTitle: 'Contact Us',
        blocks: [
          { type: 'paragraph', text: 'If you have any questions about these Terms and Conditions, please contact us:' },
          {
            type: 'contact',
            title: 'AngiSoft Technologies',
            lines: [
              'Legal Department',
              'Email: legal@angisoft.co.ke',
              'Phone: +254 700 000 000',
              'Nairobi, Kenya',
            ],
          },
        ],
      },
    ],
  },
};

export function getFallbackLegalDocument(key: LegalKey): LegalDocument {
  return { ...FALLBACK_LEGAL_DOCUMENTS[key], source: 'fallback' };
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const nonEmptyString = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim().length > 0 ? value : undefined;

function normalizeListItem(value: unknown): LegalListItem | null {
  if (!isRecord(value)) return null;
  const text = nonEmptyString(value.text);
  if (!text) return null;
  const label = nonEmptyString(value.label);
  return label ? { label, text } : { text };
}

function normalizeBlock(value: unknown): LegalBlock | null {
  if (!isRecord(value)) return null;

  if (value.type === 'paragraph' || value.type === 'heading') {
    const text = nonEmptyString(value.text);
    return text ? { type: value.type, text } : null;
  }

  if (value.type === 'list') {
    if (!Array.isArray(value.items)) return null;
    const items = value.items
      .map(normalizeListItem)
      .filter((item): item is LegalListItem => item !== null);
    return { type: 'list', items };
  }

  if (value.type === 'contact') {
    const title = nonEmptyString(value.title);
    if (!title || !Array.isArray(value.lines)) return null;
    const lines = value.lines
      .map(nonEmptyString)
      .filter((line): line is string => line !== undefined);
    return lines.length > 0 ? { type: 'contact', title, lines } : null;
  }

  return null;
}

function normalizeSection(value: unknown): LegalSection | null {
  if (!isRecord(value)) return null;
  const id = nonEmptyString(value.id);
  const title = nonEmptyString(value.title);
  if (!id || !title || !Array.isArray(value.blocks)) return null;
  const blocks = value.blocks
    .map(normalizeBlock)
    .filter((block): block is LegalBlock => block !== null);
  const navTitle = nonEmptyString(value.navTitle);
  return navTitle ? { id, title, navTitle, blocks } : { id, title, blocks };
}

/**
 * Accept a full or partial CMS value and merge it over the checked-in copy.
 * Unknown block types/extra fields are dropped; strings are rendered by React
 * as text, so markup in a CMS value can never become executable HTML.
 */
export function normalizeLegalDocument(key: LegalKey, value: unknown): LegalDocument | null {
  if (!isRecord(value)) return null;

  const titleLead = nonEmptyString(value.titleLead);
  const titleAccent = nonEmptyString(value.titleAccent);
  const summary = nonEmptyString(value.summary);
  let sections: LegalSection[] | undefined;

  if (Array.isArray(value.sections)) {
    const parsed = value.sections
      .map(normalizeSection)
      .filter((section): section is LegalSection => section !== null);
    if (parsed.length > 0) sections = parsed;
  }

  if (!titleLead && !titleAccent && !summary && !sections) return null;

  const fallback = FALLBACK_LEGAL_DOCUMENTS[key];
  return {
    key,
    titleLead: titleLead ?? fallback.titleLead,
    titleAccent: titleAccent ?? fallback.titleAccent,
    summary: summary ?? fallback.summary,
    sections: sections ?? fallback.sections,
    source: 'cms',
  };
}

export async function fetchLegalDocument(key: LegalKey): Promise<LegalDocument> {
  try {
    const response = await apiGet<unknown>(`/v1/legal/${key}`);
    return normalizeLegalDocument(key, response) ?? getFallbackLegalDocument(key);
  } catch {
    return getFallbackLegalDocument(key);
  }
}

/** Starts with the checked-in copy so the page never flashes empty content. */
export function useLegalDocument(key: LegalKey): LegalDocument {
  const [document, setDocument] = useState<LegalDocument>(() => getFallbackLegalDocument(key));

  useEffect(() => {
    let active = true;
    fetchLegalDocument(key).then((next) => {
      if (active) setDocument(next);
    });
    return () => {
      active = false;
    };
  }, [key]);

  return document;
}
