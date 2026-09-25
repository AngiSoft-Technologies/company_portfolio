import { useEffect, useState } from 'react';
import { toast as toastManager, type Toast } from '@angisoft/utils';

const ICONS: Record<Toast['type'], string> = {
  success: '✓',
  error: '✕',
  info: 'ℹ',
  warning: '!',
};

const STYLES: Record<Toast['type'], string> = {
  success: 'border-emerald-400/40 bg-emerald-500/10 text-emerald-300',
  error: 'border-red-400/40 bg-red-500/10 text-red-300',
  info: 'border-sky-400/40 bg-sky-500/10 text-sky-300',
  warning: 'border-amber-400/40 bg-amber-500/10 text-amber-300',
};

/** Renders the imperative singleton from @angisoft/utils as React toasts. */
export function ToastHost() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => toastManager.subscribe(setToasts), []);

  if (toasts.length === 0) return null;

  return (
    <div className="pointer-events-none fixed bottom-6 right-6 z-[100] flex flex-col gap-3">
      {toasts.map((t) => (
        <button
          key={t.id}
          onClick={() => toastManager.remove(t.id)}
          className={`pointer-events-auto flex items-center gap-3 rounded-xl border bg-slate-900/95 px-4 py-3 text-left shadow-xl backdrop-blur ${STYLES[t.type]}`}
        >
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-current/10 text-xs font-bold">
            {ICONS[t.type]}
          </span>
          <span className="text-sm text-slate-100">{t.message}</span>
        </button>
      ))}
    </div>
  );
}

export default ToastHost;