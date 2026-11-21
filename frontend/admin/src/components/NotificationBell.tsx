import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '@/lib/adminApi';

interface NotificationItem {
  id: string;
  _type?: string;
  type?: string;
  title: string;
  message?: string;
  link?: string | null;
  read?: boolean;
  createdAt?: string;
}

interface NotificationsResponse {
  notifications?: NotificationItem[];
  unreadCount?: number;
}

const POLL_MS = 30_000;

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unread, setUnread] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const json = (await apiFetch('/api/notifications')) as NotificationsResponse;
      setItems(json.notifications ?? []);
      setUnread(json.unreadCount ?? 0);
    } catch {
      // Notification polling is best-effort — never break the shell.
    }
  }, []);

  useEffect(() => {
    void load();
    const timer = setInterval(() => void load(), POLL_MS);
    return () => clearInterval(timer);
  }, [load]);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  const markAll = async () => {
    try {
      await apiFetch('/api/notifications/mark-read', { method: 'POST', body: {} });
      setUnread(0);
      setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch {
      // ignore
    }
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={`Notifications${unread ? ` (${unread} unread)` : ''}`}
        className="relative rounded-lg border border-[var(--border)] px-2.5 py-1.5 text-sm text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M8 1.5a4 4 0 0 0-4 4v2.2L2.6 10.5A.8.8 0 0 0 3.3 12h9.4a.8.8 0 0 0 .7-1.5L12 7.7V5.5a4 4 0 0 0-4-4Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
          <path d="M6.5 13a1.5 1.5 0 0 0 3 0" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        </svg>
        {unread > 0 ? (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--color-primary)] px-1 text-[10px] font-bold text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 top-11 z-50 w-80 max-w-[90vw] rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-xl">
          <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-2.5">
            <span className="text-sm font-semibold">Notifications</span>
            {unread > 0 ? (
              <button type="button" onClick={() => void markAll()} className="text-xs text-[var(--color-primary)] hover:underline">
                Mark all read
              </button>
            ) : null}
          </div>
          <ul className="max-h-96 overflow-y-auto">
            {items.length === 0 ? (
              <li className="px-4 py-6 text-center text-sm text-[var(--text-muted)]">No notifications yet.</li>
            ) : (
              items.slice(0, 20).map((n) => {
                const body = (
                  <>
                    <p className={`text-sm ${n.read ? 'text-[var(--text-secondary)]' : 'font-semibold text-[var(--text-primary)]'}`}>
                      {n.title}
                    </p>
                    {n.message ? <p className="mt-0.5 line-clamp-2 text-xs text-[var(--text-muted)]">{n.message}</p> : null}
                    {n.createdAt ? (
                      <p className="mt-1 text-[10px] text-[var(--text-muted)]">{new Date(n.createdAt).toLocaleString()}</p>
                    ) : null}
                  </>
                );
                return (
                  <li key={n.id} className="border-b border-[var(--border-light)] last:border-0">
                    {n.link ? (
                      <Link to={n.link} onClick={() => setOpen(false)} className="block px-4 py-3 hover:bg-[var(--surface-hover)]">
                        {body}
                      </Link>
                    ) : (
                      <div className="px-4 py-3">{body}</div>
                    )}
                  </li>
                );
              })
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

export default NotificationBell;
