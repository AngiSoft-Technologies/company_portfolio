import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Scroll restoration for client-side navigation.
 *
 * React Router does not touch scroll position on route changes, so without
 * this the browser keeps the previous page's offset and every navigation
 * "lands" mid-page (usually near the bottom of a long marketing page).
 * Hash targets (e.g. /about#team) are honoured instead of forced to top.
 */
export function ScrollToTop() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (hash) {
      // Wait a tick for the lazy route chunk + CMS content to mount.
      const id = decodeURIComponent(hash.slice(1));
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }
    }
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
  }, [pathname, hash]);

  return null;
}

export default ScrollToTop;
