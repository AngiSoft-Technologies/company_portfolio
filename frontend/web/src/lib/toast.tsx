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

  // Render a single, absolutely positioned toast slot. Optional public-content
  // requests can fail in parallel; a growing flex stack pushed visible toasts
  // around and produced a large late CLS. Keeping the overlay mounted with a
  // stable box avoids layout work and shift when those failures arrive.
  const toast = toasts[toasts.length - 1];

  return (
    <div
      className="pointer-events-none fixed bottom-6 right-6 z-[100] h-12 w-[min(360px,calc(100vw-32px))]"
      aria-live="polite"
    >
      {toast && (
        <button
          key={toast.id}
          onClick={() => toastManager.remove(toast.id)}
          className={`pointer-events-auto absolute bottom-0 right-0 flex w-full items-center gap-3 rounded-xl border bg-slate-900/95 px-4 py-3 text-left shadow-xl backdrop-blur ${STYLES[toast.type]}`}
        >
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-current/10 text-xs font-bold">
            {ICONS[toast.type]}
          </span>
          <span className="text-sm text-slate-100">{toast.message}</span>
        </button>
      )}
    </div>
  );
}

export default ToastHost;