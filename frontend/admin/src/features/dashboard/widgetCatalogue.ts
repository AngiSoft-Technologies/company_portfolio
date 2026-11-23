import type { AssignmentCounts } from '@/lib/permissions';

export type CountKey = keyof AssignmentCounts;

export type WidgetSlice = 'projects' | 'bookings' | 'posts' | 'leads';

export interface WidgetMeta {
  label: string;
  help: string;
  to: string;
  cta: string;
  /** Used when the versioned payload reports a granted permission with zero assignments. */
  emptyCta?: string;
  countKey?: CountKey;
  noun?: string;
  /** Local slice that backs the widget; fetched only when the widget is granted. */
  slice?: WidgetSlice;
  /** Reads the verified `/v1/admin/dashboard/stats` mount. */
  showsSummary?: boolean;
}

/**
 * UI metadata for the server-generated widget IDs in the §8 widget catalogue.
 * Visibility and assignment counts always come from the versioned
 * `/v1/staff-dashboard/effective-access` payload — this map only supplies copy,
 * links and the data slice each widget needs.
 */
export const WIDGET_META: Record<string, WidgetMeta> = {
  'my-products': {
    label: 'My Products',
    help: 'Products you are on the team of.',
    to: '/products',
    cta: 'Open products',
    emptyCta: 'Ask an admin for your first product assignment',
    countKey: 'products',
    noun: 'product',
  },
  'my-projects': {
    label: 'My Projects',
    help: 'Delivery work assigned to you.',
    to: '/projects',
    cta: 'Open projects',
    emptyCta: 'Create first project',
    countKey: 'projects',
    noun: 'project',
    slice: 'projects',
  },
  'assigned-bookings': {
    label: 'Assigned Bookings',
    help: 'Consultations and jobs you own.',
    to: '/bookings',
    cta: 'Open booking queue',
    emptyCta: 'Create first booking',
    countKey: 'bookings',
    noun: 'booking',
    slice: 'bookings',
  },
  'customer-messages': {
    label: 'Customer Messages',
    help: 'Conversations on your bookings.',
    to: '/bookings',
    cta: 'Open booking messages',
    slice: 'bookings',
  },
  'assigned-enquiries': {
    label: 'Assigned Enquiries',
    help: 'Inbound enquiries routed to you.',
    to: '/contacts',
    cta: 'Open enquiry queue',
    emptyCta: 'Create first enquiry',
    countKey: 'enquiries',
    noun: 'enquiry',
  },
  'my-publications': {
    label: 'My Publications',
    help: 'Blog posts and staff publications you authored.',
    to: '/blogs',
    cta: 'Open publications',
    emptyCta: 'Create first publication',
    countKey: 'publications',
    noun: 'publication',
    slice: 'posts',
  },
  'lead-pipeline': {
    label: 'Lead Pipeline',
    help: 'Marketing and sales leads.',
    to: '/opportunities',
    cta: 'Open lead pipeline',
    slice: 'leads',
  },
  'support-inbox': {
    label: 'Support Inbox',
    help: 'Support tickets raised by staff and clients.',
    to: '/support-tickets',
    cta: 'Open support inbox',
  },
  'careers-applications': {
    label: 'Job Applications',
    help: 'Candidates who applied to your postings.',
    to: '/careers',
    cta: 'View applications',
  },
  'revenue-overview': {
    label: 'Revenue Overview',
    help: 'Payments, wallets and payouts.',
    to: '/payments',
    cta: 'Open payments',
  },
  analytics: {
    label: 'Analytics',
    help: 'Cross-department dashboard summary.',
    to: '/reports',
    cta: 'View analytics',
    showsSummary: true,
  },
};

export function widgetMeta(id: string): WidgetMeta {
  return WIDGET_META[id] ?? { label: id, help: '', to: '/', cta: 'Open' };
}

export function widgetCount(id: string, counts?: AssignmentCounts): number | undefined {
  const key = WIDGET_META[id]?.countKey;
  return key && counts ? counts[key] : undefined;
}
