import { createContext, useEffect, useMemo, useRef, type ReactNode } from 'react';
import { useTheme } from '@angisoft/ui';
import type { ThemeMode } from '@angisoft/ui';
import { apiFetch } from '@/lib/adminApi';

interface AdminThemeContextValue {
  mode: ThemeMode;
  toggleMode: () => void;
}

const AdminThemeContext = createContext<AdminThemeContextValue>({ mode: 'light', toggleMode: () => {} });

/** Admin shell theme — defaults to light (data-dense admin UI); user-toggleable. */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const theme = useTheme();
  const restoredRef = useRef(false);

  // Phase 1.7: restore the persisted server-side theme preference once per
  // session. An explicit local choice (localStorage) always wins; 'system'
  // means follow the OS, which getThemeMode() already applied.
  useEffect(() => {
    if (restoredRef.current) return;
    restoredRef.current = true;
    if (localStorage.getItem('angisoft-theme-mode')) return;
    apiFetch('/v1/staff-dashboard/effective-access')
      .then((json) => {
        const t = (json as { preferences?: { theme?: string } } | null)?.preferences?.theme;
        if ((t === 'light' || t === 'dark') && t !== theme.mode) theme.setMode(t);
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleMode = () => {
    const next: ThemeMode = theme.mode === 'dark' ? 'light' : 'dark';
    theme.setMode(next);
    apiFetch('/v1/staff-dashboard/profile', {
      method: 'PUT',
      body: { preferences: { theme: next } },
    }).catch(() => {});
  };

  const value = useMemo(
    () => ({ mode: theme.mode, toggleMode }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [theme.mode],
  );
  return <AdminThemeContext.Provider value={value}>{children}</AdminThemeContext.Provider>;
}

export { AdminThemeContext };
export default ThemeProvider;
