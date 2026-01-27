import React, { useRef, useEffect, useState, Children, cloneElement } from 'react';

const ScrollReveal = ({
  children,
  animation = 'fadeUp',
  delay = 0,
  duration = 600,
  threshold = 0.1,
  stagger = 100,
  once = true,
  className = ''
}) => {
  const containerRef = useRef(null);
  const [isVisible, setIsVisible] = useState(false);
  const hasAnimated = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          if (!once || !hasAnimated.current) {
            setIsVisible(true);
            hasAnimated.current = true;
          }
        } else if (!once) {
          setIsVisible(false);
        }
      },
      { threshold }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, [threshold, once]);

  const animations = {
    fadeUp: {
      hidden: { opacity: 0, transform: 'translateY(40px)' },
      visible: { opacity: 1, transform: 'translateY(0)' }
    },
    fadeDown: {
      hidden: { opacity: 0, transform: 'translateY(-40px)' },
      visible: { opacity: 1, transform: 'translateY(0)' }
    },
    fadeLeft: {
      hidden: { opacity: 0, transform: 'translateX(-40px)' },
      visible: { opacity: 1, transform: 'translateX(0)' }
    },
    fadeRight: {
      hidden: { opacity: 0, transform: 'translateX(40px)' },
      visible: { opacity: 1, transform: 'translateX(0)' }
    },
    fadeIn: {
      hidden: { opacity: 0 },
      visible: { opacity: 1 }
    },
    scaleUp: {
      hidden: { opacity: 0, transform: 'scale(0.8)' },
      visible: { opacity: 1, transform: 'scale(1)' }
    },
    rotateIn: {
      hidden: { opacity: 0, transform: 'rotate(-10deg) scale(0.9)' },
      visible: { opacity: 1, transform: 'rotate(0) scale(1)' }
    },
    slideUp: {
      hidden: { opacity: 0, transform: 'translateY(100%)' },
      visible: { opacity: 1, transform: 'translateY(0)' }
    }
  };

  const currentAnimation = animations[animation] || animations.fadeUp;
  const childrenArray = Children.toArray(children);

  // Single child or no stagger
  if (childrenArray.length <= 1 || stagger === 0) {
    const styles = isVisible ? currentAnimation.visible : currentAnimation.hidden;
    
    return (
      <div
        ref={containerRef}
        className={className}
        style={{
          ...styles,
          transition: `all ${duration}ms cubic-bezier(0.4, 0, 0.2, 1) ${delay}ms`
        }}
      >
        {children}
      </div>
    );
  }

  // Multiple children with stagger
  return (
    <div ref={containerRef} className={className}>
      {childrenArray.map((child, index) => {
        const childDelay = delay + (index * stagger);
        const styles = isVisible ? currentAnimation.visible : currentAnimation.hidden;

        return (
          <div
            key={index}
            style={{
              ...styles,
              transition: `all ${duration}ms cubic-bezier(0.4, 0, 0.2, 1) ${childDelay}ms`
            }}
          >
            {child}
          </div>
        );
      })}
    </div>
  );
};

export default ScrollReveal;
