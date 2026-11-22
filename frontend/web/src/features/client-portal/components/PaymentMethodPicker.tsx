import { useMemo, useState } from 'react';
import { useTheme } from '@/lib/theme';

export interface PaymentMethodOption {
  id: string;
  label: string;
  group: string;
  provider: 'PAYPAL' | 'PAYHERO' | 'MPESA';
  kind: 'redirect' | 'stk';
  brands?: string[];
  note?: string;
  available: boolean;
  reason?: string;
  requiresPhone?: boolean;
  requiresEmail?: boolean;
}

interface Props {
  methods: PaymentMethodOption[];
  busy: boolean;
  onPay: (method: PaymentMethodOption, phone: string) => void;
}

/**
 * Capability-driven payment method picker. Every supported method is shown,
 * grouped by how the client pays. Methods the deployment cannot settle are
 * visible but disabled with the exact reason, so the UI never promises a
 * payment method that will fail at initiation.
 */
const PaymentMethodPicker = ({ methods, busy, onPay }: Props) => {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [phone, setPhone] = useState('');

  const groups = useMemo(() => {
    const map = new Map<string, PaymentMethodOption[]>();
    for (const method of methods) {
      const list = map.get(method.group) || [];
      list.push(method);
      map.set(method.group, list);
    }
    return Array.from(map.entries());
  }, [methods]);

  const active = methods.find((m) => m.id === selected) || null;
  const enabledCount = methods.filter((m) => m.available).length;

  if (!methods.length) {
    return <p className="mt-1 text-xs" style={{ color: colors.textMuted }}>Online payments are not configured — contact us to pay.</p>;
  }

  return (
    <div className="mt-2 flex flex-col items-end gap-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={busy}
        className="rounded-full px-4 py-2 text-xs font-bold text-white disabled:opacity-50"
        style={{ background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})` }}
        aria-expanded={open}
      >
        {busy ? 'Starting payment…' : `Pay now · ${enabledCount} methods`}
      </button>

      {open && (
        <div
          className="w-72 max-w-full rounded-2xl p-3 text-left shadow-xl"
          style={{ backgroundColor: colors.cardBg || 'var(--color-card-bg)', border: `1px solid ${colors.borderLight}` }}
        >
          <p className="mb-2 text-xs font-bold uppercase tracking-wider" style={{ color: colors.textMuted }}>Choose a payment method</p>
          <div className="max-h-72 space-y-3 overflow-y-auto pr-1">
            {groups.map(([group, list]) => (
              <div key={group}>
                <p className="mb-1 text-[10px] font-bold uppercase tracking-widest" style={{ color: colors.secondary }}>{group}</p>
                <div className="space-y-1">
                  {list.map((method) => (
                    <button
                      key={method.id}
                      type="button"
                      disabled={!method.available || busy}
                      onClick={() => { setSelected(method.id); setPhone(''); }}
                      className="block w-full rounded-lg px-2 py-2 text-left transition disabled:cursor-not-allowed disabled:opacity-40"
                      style={{
                        backgroundColor: selected === method.id ? `${colors.primary}1a` : 'transparent',
                        border: `1px solid ${selected === method.id ? colors.primary : colors.borderLight}`,
                      }}
                      title={method.reason || method.note || ''}
                    >
                      <span className="block text-xs font-bold" style={{ color: colors.text }}>{method.label}</span>
                      {method.brands?.length ? (
                        <span className="mt-0.5 block text-[10px]" style={{ color: colors.textMuted }}>{method.brands.join(' · ')}</span>
                      ) : null}
                      {method.note && method.available ? (
                        <span className="mt-0.5 block text-[10px]" style={{ color: colors.textMuted }}>{method.note}</span>
                      ) : null}
                      {!method.available && method.reason ? (
                        <span className="mt-0.5 block text-[10px]" style={{ color: colors.textMuted }}>{method.reason}</span>
                      ) : null}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {active?.available && (
            <div className="mt-3 border-t pt-3" style={{ borderColor: colors.borderLight }}>
              {active.requiresPhone && (
                <label className="block text-xs font-semibold" style={{ color: colors.textSecondary }}>
                  Phone number
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    inputMode="tel"
                    placeholder="07xxxxxxxx"
                    className="mt-1 w-full rounded-lg px-3 py-2 text-sm"
                    style={{ backgroundColor: 'var(--color-surface)', color: colors.text, border: `1px solid ${colors.borderLight}` }}
                  />
                </label>
              )}
              <button
                type="button"
                disabled={busy || (Boolean(active.requiresPhone) && phone.trim().length < 9)}
                onClick={() => { onPay(active, phone.trim()); setOpen(false); }}
                className="mt-3 w-full rounded-full px-4 py-2 text-xs font-bold text-white disabled:opacity-50"
                style={{ background: colors.primary }}
              >
                Continue with {active.label}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PaymentMethodPicker;
