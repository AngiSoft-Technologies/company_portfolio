import React from 'react';

/**
 * Editorial pull-quotation block. Large centered quote, optional attribution.
 * Mirrors ScienceSoft's quotation area — a quiet typographic beat between heavy
 * sections.
 */
const AboutQuotation = ({ content }) => {
  if (!content?.quote) return null;

  return (
    <section className="bg-[#0B1E3D] py-20 md:py-28">
      <div className="container max-w-4xl text-center">
        <span className="text-6xl font-black leading-none text-[#0A3DFF]" aria-hidden>
          &ldquo;
        </span>
        <blockquote className="mt-2 text-2xl font-semibold leading-relaxed text-white md:text-[2rem] md:leading-snug">
          {content.quote}
        </blockquote>
        {(content.author || content.role) && (
          <p className="mt-6 text-sm font-semibold uppercase tracking-[0.18em] text-[#00C2FF]">
            {content.author}
            {content.role ? ` · ${content.role}` : ''}
          </p>
        )}
      </div>
    </section>
  );
};

export default AboutQuotation;
