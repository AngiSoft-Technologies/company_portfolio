import React from 'react';
import { Link } from 'react-router-dom';
import ImageReveal from './ImageReveal';
import { resolveAssetUrl } from '../../utils/constants';

/**
 * Digital-empowerment / social-responsibility strip between geography and
 * collaboration. Truthful AngiSoft content with a "Read philosophy" CTA.
 */
const AboutEmpowermentCommitment = ({ content }) => {
  if (!content) return null;
  return (
    <section className="bg-[#0B1E3D] py-16">
      <div className="container grid items-center gap-10 md:grid-cols-2 md:gap-14">
        <div className="order-2 md:order-1">
          {content.eyebrow && (
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.22em] text-[#00C2FF]">
              {content.eyebrow}
            </p>
          )}
          <h2 className="text-3xl font-black text-white md:text-4xl">{content.title}</h2>
          {content.text && (
            <p className="mt-4 max-w-xl text-base leading-relaxed text-white/65">{content.text}</p>
          )}
          {content.cta && (
            <Link
              to={content.cta.to || '/about'}
              className="group mt-6 inline-flex w-fit items-center gap-2 text-sm font-semibold text-[#00C2FF]"
            >
              {content.cta.label}
              <span className="transition group-hover:translate-x-2" aria-hidden>&rarr;</span>
            </Link>
          )}
        </div>

        <div className="order-1 md:order-2">
          <ImageReveal
            src={resolveAssetUrl(content.imageUrl)}
            alt="AngiSoft supporting digital empowerment"
            direction="right"
            className="min-h-[300px] w-full rounded-xl"
          />
        </div>
      </div>
    </section>
  );
};

export default AboutEmpowermentCommitment;
