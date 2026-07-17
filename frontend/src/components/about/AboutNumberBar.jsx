import React, { useEffect, useRef, useState } from 'react';
import AnimatedCounter from './AnimatedCounter';

/**
 * Compact four-metric summary bar shown immediately after the hero.
 * Numbers count up once; labels fade upward slightly after the count finishes.
 */
const AboutNumberBar = ({ stats = [] }) => {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return undefined;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.35 }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  if (!stats.length) return null;

  return (
    <section className="bg-[#0B1E3D] py-12">
      <div
        ref={ref}
        className="container grid grid-cols-2 gap-y-10 md:grid-cols-4"
      >
        {stats.map((stat, index) => (
          <div
            key={stat.id || index}
            className={`relative px-6 text-center md:px-8 ${
              index !== 0 ? 'md:border-l md:border-white/10' : ''
            }`}
          >
            <AnimatedCounter
              end={Number(stat.value) || 0}
              suffix={stat.suffix || ''}
              duration={2.2}
              className="block bg-gradient-to-r from-[#00C2FF] to-[#0A3DFF] bg-clip-text text-5xl font-black text-transparent md:text-6xl"
            />
            <p className={`stat-label ${visible ? 'is-visible' : ''} mt-3 text-sm font-medium text-white/60`}>
              {stat.label}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
};

export default AboutNumberBar;
