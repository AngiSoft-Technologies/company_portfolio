import React, { useRef, useEffect, useState } from 'react';
import { formatMetricValue } from '../../utils/formatMetricValue';

/**
 * Count-up number that animates once when scrolled into view.
 *
 * Formatting is now TYPE-AWARE. Pass `valueType` (e.g. 'year', 'count',
 * 'percentage', 'currency', 'identifier') and the shared formatter decides
 * grouping/decimals/suffix — we never sniff the label or default to grouped
 * counts (which previously turned 2024 into 2,024).
 */
const AnimatedCounter = ({
  end,
  duration = 2000,
  suffix = '',
  prefix = '',
  decimals = 0,
  className = '',
  // Type-aware formatting (preferred). Legacy fallbacks accepted below.
  valueType,
  type,
  format,
  useGrouping,
  locale = 'en-KE',
  currency = 'KES',
  minimumFractionDigits,
  maximumFractionDigits,
  // Optional label for accessible final value (combined into sr-only text).
  label = '',
}) => {
  const [count, setCount] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const counterRef = useRef(null);
  const hasAnimated = useRef(false);

  const resolvedType =
    valueType || type || format || 'plain';

  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Format helper bound to this component's formatting config.
  const formatWith = (rawValue) =>
    formatMetricValue({
      value: rawValue,
      valueType: resolvedType,
      locale,
      currency,
      minimumFractionDigits,
      maximumFractionDigits,
      useGrouping,
      prefix,
      suffix,
    });

  // Non-animated types (dates/identifiers) render as a static final string.
  const isStatic = resolvedType === 'date' || resolvedType === 'identifier';

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated.current) {
          setIsVisible(true);
          hasAnimated.current = true;
        }
      },
      { threshold: 0.3 }
    );

    if (counterRef.current) {
      observer.observe(counterRef.current);
    }

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    // Reduced motion OR static types: show final value immediately, no animation.
    if (prefersReducedMotion || isStatic) {
      setCount(Number(end) || 0);
      return;
    }
    if (!isVisible) return;

    const startTime = Date.now();
    const startValue = 0;

    const animate = () => {
      const now = Date.now();
      const progress = Math.min((now - startTime) / duration, 1);

      // Easing function (ease-out-cubic)
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const currentValue = startValue + (Number(end) - startValue) * easeOut;

      setCount(currentValue);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setCount(Number(end) || 0);
      }
    };

    requestAnimationFrame(animate);
  }, [isVisible, end, duration, prefersReducedMotion, isStatic]);

  // Final, fully-formatted value (used for sr-only + static render).
  const finalValue = formatWith(Number(end) || 0);

  // During animation, format the current interpolated number with the same
  // type rules so grouping/decimals stay consistent (no commas on years).
  const displayValue =
    decimals > 0
      ? count.toFixed(decimals)
      : formatMetricValue({
          value: Math.round(count),
          valueType: resolvedType,
          locale,
          currency,
          minimumFractionDigits,
          maximumFractionDigits,
          useGrouping,
          prefix: '',
          suffix: '',
        });

  // For grouped/percentage/currency types the prefix+suffix are applied only
  // on the final frame to avoid mid-animation jitter; for plain/year/count we
  // apply prefix/suffix per frame for visual consistency.
  const animatedText =
    resolvedType === 'percentage' || resolvedType === 'currency'
      ? formatMetricValue({
          value: Math.round(count),
          valueType: resolvedType,
          locale,
          currency,
          minimumFractionDigits,
          maximumFractionDigits,
          useGrouping,
          prefix,
          suffix,
        })
      : `${prefix}${displayValue}${suffix}`;

  return (
    <span className={className}>
      <span aria-hidden="true" ref={counterRef}>
        {isStatic ? finalValue : animatedText}
      </span>
      <span className="sr-only">{`${finalValue}${label ? `, ${label}` : ''}`}</span>
    </span>
  );
};

export default AnimatedCounter;
