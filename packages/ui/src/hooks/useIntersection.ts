import { useEffect, useState } from 'react';

/**
 * useIntersection — observe an element and report whether it is in view.
 * Defaults to once (unobserve after first intersection) unless `once` is false.
 */
export function useIntersection<T extends HTMLElement = HTMLDivElement>(
  options: IntersectionObserverInit & { once?: boolean } = { threshold: 0.2, once: true },
): { ref: (node: T | null) => void; inView: boolean } {
  const [ref, setRef] = useState<T | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    if (!ref) return;
    if (typeof IntersectionObserver === 'undefined') {
      setInView(true);
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setInView(true);
          if (options.once !== false) observer.unobserve(entry.target);
        } else if (options.once === false) {
          setInView(false);
        }
      });
    }, options);
    observer.observe(ref);
    return () => observer.disconnect();
  }, [ref, options.once]);

  return { ref: setRef, inView };
}

export default useIntersection;