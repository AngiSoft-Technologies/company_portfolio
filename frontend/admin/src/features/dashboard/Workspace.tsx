import { Link } from 'react-router-dom';
import { Card, EmptyState, PageHeader, Spinner } from '@/components';
import { Badge } from '@/lib/Badge';
import { useEffectiveAccess } from '@/lib/permissions';
import { widgetCount, widgetMeta } from './widgetCatalogue';

/**
 * Unified workspace shell (plan Phase 1.6).
 *
 * Everything here is derived from the versioned effective-access payload
 * (plan §8): widget IDs come from the server, counts are the real assignment
 * aggregates, and the copy/links live in the shared `widgetCatalogue` used by
 * the staff dashboard too. A granted permission with zero assignments renders
 * an explicit empty state with a "create first …" call to action — it is never
 * silently hidden, because hiding it makes a new starter think the module does
 * not exist. No role comparisons are made here.
 */
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
        <div className="dashboard-inline-alert mb-4" role="status">
          {error}
        </div>
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
              <EmptyState title="No modules are enabled for your access profile" />
              <p className="text-center text-xs text-[var(--text-muted)]">
                Ask an administrator to grant permissions on the Roles &amp; Permissions screen.
              </p>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {widgets.map((id) => {
                const meta = widgetMeta(id);
                const count = widgetCount(id, counts);
                const isEmpty = count === 0;

                return (
                  <Card key={id} className="flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-sm font-semibold text-[var(--text-primary)]">{meta.label}</h3>
                        {typeof count === 'number' ? (
                          <Badge tone={count > 0 ? 'blue' : 'slate'}>{count}</Badge>
                        ) : null}
                      </div>
                      <p className="mt-1 text-xs text-[var(--text-muted)]">{meta.help}</p>
                    </div>

                    <div className="mt-4">
                      {isEmpty ? (
                        <div className="dashboard-empty-widget">
                          <p className="text-xs text-[var(--text-muted)]">
                            No {meta.noun ?? 'record'} assigned yet
                          </p>
                          <Link
                            to={meta.to}
                            className="mt-1 inline-block text-xs font-medium text-[var(--color-primary)] hover:underline"
                          >
                            {meta.emptyCta ?? `Create first ${meta.noun ?? 'record'}`} →
                          </Link>
                        </div>
                      ) : (
                        <Link
                          to={meta.to}
                          className="inline-block text-xs font-medium text-[var(--color-primary)] hover:underline"
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
      <div className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-[var(--text-primary)]">{value}</div>
    </Card>
  );
}

export default Workspace;
