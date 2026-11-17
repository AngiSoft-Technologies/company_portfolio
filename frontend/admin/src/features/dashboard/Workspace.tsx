import { Link } from 'react-router-dom';
import { Card, EmptyState, PageHeader, Spinner } from '@/components';
import { Badge } from '@/lib/Badge';
import { useEffectiveAccess, type AssignmentCounts } from '@/lib/permissions';

/**
 * Unified workspace shell (plan Phase 1.6).
 *
 * Everything here is derived from the versioned effective-access payload
 * (plan §8): the widgets come from the server, and each card shows the real
 * assignment count. A granted permission with zero assignments renders an
 * empty state with a "create first …" call to action — it is never silently
 * hidden, because hiding it makes a new starter think the module does not
 * exist.
 */

type CountKey = keyof AssignmentCounts;

interface WidgetMeta {
  label: string;
  help: string;
  to: string;
  cta: string;
  countKey?: CountKey;
  noun?: string;
}

const WIDGET_META: Record<string, WidgetMeta> = {
  'my-products': {
    label: 'My Products',
    help: 'Products you are on the team of.',
    to: '/products',
    cta: 'Ask an admin to add you to a product',
    countKey: 'products',
    noun: 'product',
  },
  'my-projects': {
    label: 'My Projects',
    help: 'Delivery work assigned to you.',
    to: '/projects',
    cta: 'Create first project',
    countKey: 'projects',
    noun: 'project',
  },
  'assigned-bookings': {
    label: 'Assigned Bookings',
    help: 'Consultations and jobs you own.',
    to: '/bookings',
    cta: 'View booking queue',
    countKey: 'bookings',
    noun: 'booking',
  },
  'customer-messages': {
    label: 'Customer Messages',
    help: 'Conversations on your bookings.',
    to: '/bookings',
    cta: 'Open booking messages',
  },
  'assigned-enquiries': {
    label: 'Assigned Enquiries',
    help: 'Inbound enquiries routed to you.',
    to: '/contacts',
    cta: 'View enquiry queue',
    countKey: 'enquiries',
    noun: 'enquiry',
  },
  'my-publications': {
    label: 'My Publications',
    help: 'Blog posts and staff publications you authored.',
    to: '/blogs',
    cta: 'Write first post',
    countKey: 'publications',
    noun: 'publication',
  },
  'lead-pipeline': {
    label: 'Lead Pipeline',
    help: 'Marketing and sales leads.',
    to: '/contacts',
    cta: 'Open lead pipeline',
  },
  'support-inbox': {
    label: 'Support Inbox',
    help: 'Support tickets raised by staff and clients.',
    to: '/contacts',
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
    help: 'Traffic and engagement dashboards.',
    to: '/',
    cta: 'View analytics',
  },
};

export function Workspace() {
  const { access, loading, error, isSuperAdmin } = useEffectiveAccess();

  const grants = (access?.permissions ?? []).filter((p) => p.effect === 'GRANT');
  const widgets = access?.widgets ?? [];
  const counts = access?.assignmentCounts;

  return (
    <div>
      <PageHeader
        title="My Workspace"
        subtitle={
          access
            ? `${access.systemRole} · ${grants.length || 'all'} permissions${isSuperAdmin ? ' (super admin)' : ''}`
            : 'Your permission-driven home'
        }
        actions={
          isSuperAdmin ? <Badge tone="purple">Super Admin</Badge> : <Badge tone="blue">Personalised</Badge>
        }
      />

      {error ? (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      ) : null}

      {loading ? (
        <Card>
          <Spinner />
        </Card>
      ) : !access ? (
        <Card>
          <EmptyState title="Could not load your access profile" />
        </Card>
      ) : (
        <>
          <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Permissions" value={isSuperAdmin ? 'All' : grants.length} />
            <Stat label="Widgets" value={widgets.length} />
            <Stat label="Assigned bookings" value={counts?.bookings ?? 0} />
            <Stat label="Assigned enquiries" value={counts?.enquiries ?? 0} />
          </div>

          {widgets.length === 0 ? (
            <Card>
              <EmptyState title="No modules are enabled for your role yet" />
              <p className="text-center text-xs text-slate-400">
                Ask an administrator to grant permissions on the Roles &amp; Permissions screen.
              </p>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {widgets.map((id) => {
                const meta = WIDGET_META[id] ?? {
                  label: id,
                  help: '',
                  to: '/',
                  cta: 'Open',
                };
                const count = meta.countKey && counts ? counts[meta.countKey] : undefined;
                const isEmpty = typeof count === 'number' && count === 0;

                return (
                  <Card key={id} className="flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-sm font-semibold text-slate-800">{meta.label}</h3>
                        {typeof count === 'number' ? (
                          <Badge tone={count > 0 ? 'blue' : 'slate'}>{count}</Badge>
                        ) : null}
                      </div>
                      <p className="mt-1 text-xs text-slate-500">{meta.help}</p>
                    </div>

                    <div className="mt-4">
                      {isEmpty ? (
                        <div className="rounded-lg border border-dashed border-slate-200 p-3 text-center">
                          <p className="text-xs text-slate-400">
                            No {meta.noun ?? 'record'} yet
                          </p>
                          <Link
                            to={meta.to}
                            className="mt-1 inline-block text-xs font-medium text-[#0875FF] hover:underline"
                          >
                            {meta.cta} →
                          </Link>
                        </div>
                      ) : (
                        <Link
                          to={meta.to}
                          className="inline-block text-xs font-medium text-[#0875FF] hover:underline"
                        >
                          {meta.cta} →
                        </Link>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <Card>
      <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-slate-800">{value}</div>
    </Card>
  );
}

export default Workspace;
