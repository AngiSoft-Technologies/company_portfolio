import React, { useEffect, useRef, useState } from 'react';
import SmartImage from './SmartImage';

/**
 * Image wrapper that reveals via a directional clip-path when scrolled into view.
 * direction: 'left' (clip opens from left edge) | 'right' (clip opens from right edge).
 * Respects the global .is-visible pattern and prefers-reduced-motion via index.css.
 */
const ImageReveal = ({
  src,
  alt = '',
  direction = 'left',
  className = '',
  imgClassName = '',
  loading = 'lazy',
  overlay = true,
}) => {
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
      { threshold: 0.25 }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const revealClass =
    direction === 'right' ? 'image-reveal image-reveal-right' : 'image-reveal';

  return (
    <div
      ref={ref}
      className={`relative overflow-hidden ${revealClass} ${visible ? 'is-visible' : ''} ${className}`}
    >
      <SmartImage
        src={src}
        alt={alt}
        loading={loading}
        className={`h-full w-full object-cover ${imgClassName}`}
      />
      {overlay && (
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#07142B]/70 via-transparent to-transparent" />
      )}
    </div>
  );
};

export default ImageReveal;
