import React from 'react';

/**
 * Reusable section heading used across the About page.
 * eyebrow -> small cyan label, title -> large heading, description -> muted lead.
 */
const SectionHeading = ({
  eyebrow,
  title,
  description,
  align = 'left',
  className = '',
}) => {
  const alignment = align === 'center' ? 'text-center mx-auto' : 'text-left';
  return (
    <header className={`max-w-3xl ${alignment} ${className}`}>
      {eyebrow && (
        <p className="mb-3 text-xs font-bold uppercase tracking-[0.22em] text-[#00C2FF]">
          {eyebrow}
        </p>
      )}
      {title && (
        <h2 className="text-3xl font-black leading-tight text-white md:text-4xl lg:text-[2.75rem]">
          {title}
        </h2>
      )}
      {description && (
        <p className="mt-4 text-base leading-relaxed text-white/65 md:text-lg">
          {description}
        </p>
      )}
    </header>
  );
};

export default SectionHeading;
