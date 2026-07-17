import React, { useEffect, useRef, useState } from 'react';

/**
 * Count-up number that animates once when scrolled into view.
 * end: numeric target; prefix/suffix: rendered around the number; duration in seconds.
 */
const AnimatedCounter = ({
  end = 0,
  duration = 2.2,
  prefix = '',
  suffix = '',
  className = '',
}) => {
  const ref = useRef(null);
  const [display, setDisplay] = useState(0);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return undefined;

    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) {
      setDisplay(Number(end));
      setStarted(true);
      return undefined;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started) {
          setStarted(true);
          const startTime = performance.now();
          const target = Number(end) || 0;
          const tick = (now) => {
            const progress = Math.min((now - startTime) / (duration * 1000), 1);
            // easeOutCubic
            const eased = 1 - Math.pow(1 - progress, 3);
            setDisplay(Math.round(eased * target));
            if (progress < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
          observer.disconnect();
        }
      },
      { threshold: 0.35 }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [end, duration, started]);

  return (
    <span ref={ref} className={className}>
      {prefix}
      {display}
      {suffix}
    </span>
  );
};

export default AnimatedCounter;
