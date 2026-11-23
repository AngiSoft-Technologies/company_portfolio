import { useCallback, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { toast } from '@angisoft/utils';
import { Button, Card, EmptyState, PageHeader, Spinner, Table } from '@/components';
import { apiFetch } from '@/lib/adminApi';
import { formatDateTime } from '@/lib/format';

/**
 * Self-service notification inbox for the signed-in staff member.
 *
 * Both endpoints are scoped to the authenticated user on the server, so this
 * screen never assumes admin-wide visibility and needs no permission key:
 *   GET  /v1/notifications          -> { notifications, unreadCount }
 *   GET  /v1/notifications?unread=true
 *   POST /v1/notifications/mark-read { notificationId? }  (omitted = all read)
 */

interface NotificationItem {
  id: string;
  /** Prisma 8 contract exposes the model's `type` column as `_type`; older
   *  payloads (and the realtime event) may use `type`. Accept both. */
  type?: string;
  _type?: string;
  title: string;
  message?: string | null;
  link?: string | null;
  read?: boolean;
  createdAt?: string;
}

interface NotificationsResponse {
  notifications?: NotificationItem[];
  unreadCount?: number;
}

type Filter = 'all' | 'unread';
type LinkTarget = { kind: 'internal'; to: string } | { kind: 'external'; href: string };

function kindOf(row: NotificationItem): string {
  return row.type ?? row._type ?? 'notification';
}

/** Only render links we can safely navigate to; ignore other schemes. */
function linkTarget(link: string | null | undefined): LinkTarget | null {
  if (!link) return null;
  if (link.startsWith('/') && !link.startsWith('//')) return { kind: 'internal', to: link };
  if (/^https?:\/\//i.test(link)) return { kind: 'external', href: link };
  return null;
}

export function NotificationsAdmin() {
  const [filter, setFilter] = useState<Filter>('all');
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [markingAll, setMarkingAll] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const path = filter === 'unread' ? '/v1/notifications?unread=true' : '/v1/notifications';
      const json = (await apiFetch(path)) as NotificationsResponse;
      setItems(json?.notifications ?? []);
      setUnreadCount(json?.unreadCount ?? 0);
    } catch (e) {
      setItems([]);
      setError(e instanceof Error ? e.message : 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    void load();
  }, [load]);

  const markOne = async (row: NotificationItem) => {
    setBusyId(row.id);
    try {
      await apiFetch('/v1/notifications/mark-read', {
        method: 'POST',
        body: { notificationId: row.id },
      });
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to mark notification as read');
    } finally {
      setBusyId(null);
    }
  };

  const markAll = async () => {
    setMarkingAll(true);
    try {
      // Omitting notificationId is the API's contract for "mark all read".
      await apiFetch('/v1/notifications/mark-read', { method: 'POST', body: {} });
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to mark all notifications as read');
    } finally {
      setMarkingAll(false);
    }
  };

  const renderTitle = (row: NotificationItem): ReactNode => {
    const heading = (
      <span className="flex items-center gap-2">
        {row.read ? null : (
          <span
            aria-hidden="true"
            className="h-2 w-2 shrink-0 rounded-full bg-[var(--color-primary)]"
          />
        )}
        <span className={row.read ? 'text-[var(--text-secondary)]' : 'font-semibold text-[var(--text-primary)]'}>
          {row.title}
        </span>
      </span>
    );
    const target = linkTarget(row.link);
    const withLink = (content: ReactNode, className: string) => (
      target?.kind === 'internal' ? (
        <Link to={target.to} className={className}>{content}</Link>
      ) : target?.kind === 'external' ? (
        <a href={target.href} target="_blank" rel="noopener noreferrer" className={className}>{content}</a>
      ) : content
    );

    return (
      <div>
        {withLink(heading, 'hover:underline')}
        {row.message ? (
          <p className="mt-1 line-clamp-2 text-xs text-[var(--text-muted)]">{row.message}</p>
        ) : null}
      </div>
    );
  };

  return (
    <div>
      <PageHeader
        title="Notifications"
        subtitle="Your personal alerts and updates. Only notifications addressed to you are shown."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <div
              role="group"
              aria-label="Notification filter"
              className="inline-flex rounded-lg border border-[var(--border)] p-0.5"
            >
              {(['all', 'unread'] as Filter[]).map((value) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={filter === value}
                  onClick={() => setFilter(value)}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                    filter === value
                      ? 'bg-[var(--surface-hover)] text-[var(--text-primary)]'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                  }`}
                >
                  {value === 'all' ? 'All' : `Unread${unreadCount > 0 ? ` (${unreadCount})` : ''}`}
                </button>
              ))}
            </div>
            <Button variant="outline" onClick={() => void load()} disabled={loading}>
              Refresh
            </Button>
            <Button
              variant="outline"
              onClick={() => void markAll()}
              disabled={loading || markingAll || unreadCount === 0}
            >
              {markingAll ? 'Marking…' : 'Mark all read'}
            </Button>
          </div>
        }
      />

      {loading ? (
        <div role="status" aria-label="Loading notifications" aria-busy="true">
          <Spinner />
        </div>
      ) : null}

      {!loading && error ? (
        <div
          role="alert"
          className="mb-4 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-4 text-sm text-[var(--text-secondary)]"
        >
          <span className="font-semibold text-[var(--color-error)]">Error:</span> {error}
        </div>
      ) : null}

      {!loading && !error && items.length === 0 ? (
        <Card>
          <EmptyState
            title={
              filter === 'unread'
                ? 'You have no unread notifications.'
                : 'No notifications yet. New alerts will appear here.'
            }
          />
        </Card>
      ) : null}

      {!loading && !error && items.length > 0 ? (
        <>
          <p className="mb-3 text-xs text-[var(--text-muted)]">
            Showing {items.length} most recent {items.length === 1 ? 'notification' : 'notifications'} ·{' '}
            {unreadCount} unread
          </p>
          <Table<NotificationItem>
            rows={items}
            columns={[
              { key: 'title', header: 'Notification', render: renderTitle },
              {
                key: 'type',
                header: 'Type',
                render: (row) => <span className="text-xs text-[var(--text-muted)]">{kindOf(row)}</span>,
              },
              {
                key: 'createdAt',
                header: 'Received',
                render: (row) => (
                  <span className="whitespace-nowrap text-xs text-[var(--text-muted)]">
                    {formatDateTime(row.createdAt)}
                  </span>
                ),
              },
              {
                key: 'read',
                header: 'Status',
                render: (row) => (
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs ${
                      row.read
                        ? 'bg-[var(--surface-hover)] text-[var(--text-muted)]'
                        : 'text-[var(--color-primary)]'
                    }`}
                  >
                    {row.read ? 'Read' : 'Unread'}
                  </span>
                ),
              },
              {
                key: 'actions',
                header: 'Action',
                render: (row) => (
                  <button
                    type="button"
                    disabled={row.read || busyId === row.id}
                    aria-label={`Mark "${row.title}" as read`}
                    onClick={() => void markOne(row)}
                    className="whitespace-nowrap rounded border border-[var(--border)] px-2 py-1 text-xs text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] disabled:opacity-50"
                  >
                    {busyId === row.id ? 'Working…' : row.read ? 'Read' : 'Mark read'}
                  </button>
                ),
              },
            ]}
          />
        </>
      ) : null}
    </div>
  );
}

export default NotificationsAdmin;
