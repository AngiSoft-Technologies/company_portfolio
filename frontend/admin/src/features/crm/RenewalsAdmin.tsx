import { useCallback, useEffect, useState } from 'react';
import { Button, Card, EmptyState, PageHeader, Spinner, Table } from '@/components';
import { apiFetch } from '@/lib/adminApi';
import { Badge } from '@/lib/Badge';

interface RenewalRow {
  clientId: string;
  name: string;
  email: string;
  org: string | null;
  lastProjectCompletedAt: string | null;
  lastBookingAt: string | null;
  openProjects: number;
  openTickets: number;
  outstandingBalance: number;
  overdueInvoices: number;
  daysSinceActivity: number | null;
  health: 'active' | 'at_risk' | 'renewal_due';
}

interface RenewalsResponse {
  renewalWindowDays?: number;
  reminderCooldownDays?: number;
  clients?: RenewalRow[];
  summary?: { renewal_due: number; at_risk: number; active: number };
}

const HEALTH_BADGE: Record<RenewalRow['health'], { label: string; tone: 'green' | 'amber' | 'red' }> = {
  renewal_due: { label: 'Renewal due', tone: 'amber' },
  at_risk: { label: 'At risk', tone: 'red' },
  active: { label: 'Active', tone: 'green' },
};

const fmtDate = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString() : '—');

export function RenewalsAdmin() {
  const [data, setData] = useState<RenewalsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData((await apiFetch('/admin/renewals')) as RenewalsResponse);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load renewals');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const remind = async (row: RenewalRow) => {
    setSending(row.clientId);
    setNotice(null);
    try {
      await apiFetch('/admin/renewals/remind', { method: 'POST', body: { clientId: row.clientId } });
      setNotice(`Renewal reminder sent to ${row.name}.`);
    } catch (e) {
      setNotice(e instanceof Error ? e.message : 'Failed to send reminder');
    } finally {
      setSending(null);
    }
  };

  const rows = data?.clients ?? [];
  const summary = data?.summary;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Client Renewals"
        subtitle={`Account health and renewal candidates — clients with no active work and ${data?.renewalWindowDays ?? 90}+ days since last activity.`}
      />
      {summary && (
        <div className="grid gap-3 sm:grid-cols-3">
          <Card className="p-4"><div className="text-2xl font-bold text-[var(--color-warning)]">{summary.renewal_due}</div><div className="text-sm text-[var(--text-secondary)]">Renewal due</div></Card>
          <Card className="p-4"><div className="text-2xl font-bold text-red-500">{summary.at_risk}</div><div className="text-sm text-[var(--text-secondary)]">At risk</div></Card>
          <Card className="p-4"><div className="text-2xl font-bold text-green-600">{summary.active}</div><div className="text-sm text-[var(--text-secondary)]">Active</div></Card>
        </div>
      )}
      {notice && <p className="text-sm text-[var(--text-secondary)]">{notice}</p>}
      {error && <p className="text-sm text-red-500">{error}</p>}
      <Card className="p-4">
        {loading ? <Spinner /> : rows.length === 0 ? <EmptyState title="No clients found" /> : (
          <Table<RenewalRow & { id: string }>
            rows={rows.map((r) => ({ ...r, id: r.clientId }))}
            columns={[
              { key: 'name', header: 'Client', render: (r) => (
                <div><div className="font-medium">{r.name}</div><div className="text-xs text-[var(--text-secondary)]">{r.email}{r.org ? ` · ${r.org}` : ''}</div></div>
              )},
              { key: 'health', header: 'Health', render: (r) => <Badge tone={HEALTH_BADGE[r.health].tone}>{HEALTH_BADGE[r.health].label}</Badge> },
              { key: 'daysSinceActivity', header: 'Days idle', render: (r) => r.daysSinceActivity ?? '—' },
              { key: 'lastProjectCompletedAt', header: 'Last project done', render: (r) => fmtDate(r.lastProjectCompletedAt) },
              { key: 'openProjects', header: 'Open projects', render: (r) => r.openProjects },
              { key: 'openTickets', header: 'Open tickets', render: (r) => r.openTickets },
              { key: 'outstandingBalance', header: 'Outstanding', render: (r) => r.outstandingBalance > 0 ? r.outstandingBalance.toLocaleString() : '—' },
              { key: 'overdueInvoices', header: 'Overdue', render: (r) => r.overdueInvoices || '—' },
              { key: 'actions', header: '', render: (r) => (
                <Button
                  variant="outline"
                  disabled={sending === r.clientId || r.health === 'active'}
                  onClick={() => void remind(r)}
                >
                  {sending === r.clientId ? 'Sending…' : 'Send reminder'}
                </Button>
              ) },
            ]}
          />
        )}
      </Card>
    </div>
  );
}

export default RenewalsAdmin;
