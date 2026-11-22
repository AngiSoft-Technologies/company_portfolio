import type { ReactNode } from 'react';
import { Badge } from '@/lib/Badge';
import { formatDateTime } from '@/lib/format';
import { displayName, shortId, type ApiRow } from './shared';

export const CHANNEL_TABS = ['ALL', 'EMAIL', 'WHATSAPP', 'TELEGRAM', 'FACEBOOK', 'INSTAGRAM', 'TIKTOK'];

export function conversationChannel(conversation: ApiRow): string {
  return String(conversation.channel ?? conversation.account?.channel ?? 'UNKNOWN').toUpperCase();
}

export function ConversationList({
  conversations,
  selectedId,
  onSelect,
}: {
  conversations: ApiRow[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  if (conversations.length === 0) {
    return <p className="py-10 text-center text-sm text-[var(--text-muted)]">No conversations on this channel.</p>;
  }
  return (
    <div className="space-y-2">
      {conversations.map((conversation) => {
        const id = String(conversation.id);
        const active = id === selectedId;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onSelect(id)}
            className={`w-full rounded-lg border px-3 py-2 text-left transition-colors ${
              active ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10' : 'border-[var(--border)] hover:bg-[var(--surface-hover)]'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="truncate text-sm font-medium">{displayName(conversation.contact ?? conversation)}</span>
              <Badge>{conversationChannel(conversation)}</Badge>
            </div>
            <div className="mt-1 truncate text-xs text-[var(--text-secondary)]">
              {String(conversation.lastMessagePreview ?? conversation.subject ?? 'No preview')}
            </div>
            <div className="mt-1 flex items-center justify-between text-[11px] text-[var(--text-muted)]">
              <span>{String(conversation.status ?? 'OPEN')}</span>
              <span>{formatDateTime(conversation.lastMessageAt)}</span>
            </div>
          </button>
        );
      })}
    </div>
  );
}

export function MessageBubble({ message }: { message: ApiRow }) {
  const outbound = String(message.direction ?? '').toUpperCase() === 'OUTBOUND';
  return (
    <div className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${outbound ? 'ml-auto bg-[var(--color-primary)]/15' : 'border border-[var(--border)] bg-[var(--bg-primary)]'}`}>
      <div className="whitespace-pre-wrap break-words">{String(message.bodyText ?? message.body ?? '—')}</div>
      <div className="mt-1 text-[11px] text-[var(--text-muted)]">
        {String(message.senderType ?? 'UNKNOWN')} · {String(message.deliveryStatus ?? '')} · {formatDateTime(message.sentAt ?? message.createdAt)}
      </div>
    </div>
  );
}

export function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border-light)] py-1.5 text-xs last:border-0">
      <span className="text-[var(--text-muted)]">{label}</span>
      <span className="text-right text-[var(--text-secondary)]">{children}</span>
    </div>
  );
}

export function WindowBadge({ conversation }: { conversation: ApiRow | null }) {
  if (!conversation) return null;
  const expires = conversation.windowExpiresAt as string | null | undefined;
  if (!expires) return null;
  const open = new Date(expires).getTime() > Date.now();
  return <Badge tone={open ? 'green' : 'amber'}>{open ? '24h window open' : 'Template-only window'}</Badge>;
}

export function ConversationId({ id }: { id: string | null }) {
  return <span className="font-mono text-xs text-[var(--text-muted)]">{id ? shortId(id) : '—'}</span>;
}
