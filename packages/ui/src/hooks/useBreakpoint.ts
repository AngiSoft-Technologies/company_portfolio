import { useEffect, useState } from 'react';

interface Breakpoints {
  sm: boolean;
  md: boolean;
  lg: boolean;
  xl: boolean;
}

/**
 * useBreakpoint — reactive viewport breakpoint booleans (Tailwind v4 defaults:
 * sm 640, md 768, lg 1024, xl 1280, 2xl 1536).
 */
export function useBreakpoint(): Breakpoints {
  const query = (min: number) => `(min-width: ${min}px)`;
  const [state, setState] = useState<Breakpoints>(() => ({
    sm: typeof window !== 'undefined' && window.matchMedia(query(640)).matches,
    md: typeof window !== 'undefined' && window.matchMedia(query(768)).matches,
    lg: typeof window !== 'undefined' && window.matchMedia(query(1024)).matches,
    xl: typeof window !== 'undefined' && window.matchMedia(query(1280)).matches,
  }));

  useEffect(() => {
    const mqls: [keyof Breakpoints, MediaQueryList][] = [
      ['sm', window.matchMedia(query(640))],
      ['md', window.matchMedia(query(768))],
      ['lg', window.matchMedia(query(1024))],
      ['xl', window.matchMedia(query(1280))],
    ];
    const updaters = mqls.map(([key, mql]) => {
      const fn = () => setState((s) => ({ ...s, [key]: mql.matches }));
      mql.addEventListener('change', fn);
      return [mql, fn] as const;
    });
    return () => {
      updaters.forEach(([mql, fn]) => mql.removeEventListener('change', fn));
    };
  }, []);

  return state;
}

export default useBreakpoint;