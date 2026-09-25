import { createContext, useMemo, type ReactNode } from 'react';
import { useTheme } from '@angisoft/ui';
import type { ThemeMode } from '@angisoft/ui';

interface AdminThemeContextValue {
  mode: ThemeMode;
  toggleMode: () => void;
}

const AdminThemeContext = createContext<AdminThemeContextValue>({ mode: 'light', toggleMode: () => {} });

/** Admin shell theme — defaults to light (data-dense admin UI); user-toggleable. */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const theme = useTheme();
  const value = useMemo(
    () => ({ mode: theme.mode, toggleMode: theme.toggleMode }),
    [theme.mode, theme.toggleMode],
  );
  return <AdminThemeContext.Provider value={value}>{children}</AdminThemeContext.Provider>;
}

export { AdminThemeContext };
export default ThemeProvider;