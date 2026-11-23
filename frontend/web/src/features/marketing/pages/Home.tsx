// @ts-nocheck
import React, { Suspense, lazy, useEffect, useRef, useState } from 'react';

import HeroSlider from '../components/landing/HeroSlider';
import ServicesSection from '@/features/marketing/components/sections/ServicesSection';

const DeferredHomeSections = lazy(() => import('./DeferredHomeSections'));

const DEFERRED_PLACEHOLDER = <div aria-hidden="true" className="angi-home-deferred-placeholder" />;

const Home = () => {
  const anchorRef = useRef<HTMLDivElement>(null);
  const [showDeferred, setShowDeferred] = useState(false);

  useEffect(() => {
    if (showDeferred) return undefined;
    const anchor = anchorRef.current;
    if (!anchor) return undefined;

    // Load the rest of the landing page just before it scrolls into view. It
    // stays out of the initial render so its data fallbacks and React commits
    // do not compete with LCP or inflate main-thread blocking time.
    if (typeof IntersectionObserver === 'undefined') {
      const onScroll = () => {
        if (anchor.getBoundingClientRect().top < window.innerHeight + 150) {
          setShowDeferred(true);
          window.removeEventListener('scroll', onScroll);
        }
      };
      window.addEventListener('scroll', onScroll, { passive: true });
      onScroll();
      return () => window.removeEventListener('scroll', onScroll);
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setShowDeferred(true);
          observer.disconnect();
        }
      },
      { rootMargin: '150px 0px' },
    );
    observer.observe(anchor);
    return () => observer.disconnect();
  }, [showDeferred]);

  return (
    <main className="angi-home">
      <HeroSlider />
      <ServicesSection />
      <div ref={anchorRef} aria-hidden="true" style={{ height: '1px' }} />
      <Suspense fallback={DEFERRED_PLACEHOLDER}>
        {showDeferred ? <DeferredHomeSections /> : DEFERRED_PLACEHOLDER}
      </Suspense>
    </main>
  );
};

export default Home;
