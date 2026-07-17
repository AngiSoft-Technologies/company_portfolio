import React from 'react';
import SectionHeading from './SectionHeading';
import SmartImage from './SmartImage';
import { resolveAssetUrl } from '../../utils/constants';

/**
 * Partnerships & recognitions grid. Each award is a bordered card with a logo
 * tile and a description. Mirrors ScienceSoft's apr-* static grid (no slider).
 * Logos degrade to monochrome text via SmartImage fallback when not supplied.
 */
const AboutAwardsPartners = ({ content }) => {
  const items = content?.items || [];
  if (!items.length) return null;

  return (
    <section className="bg-[#07142B] py-20 md:py-28">
      <div className="container">
        <SectionHeading
          eyebrow={content?.eyebrow}
          title={content?.title || 'Partnerships & Recognitions'}
          description={content?.description}
        />

        <div className="mt-12 overflow-hidden rounded-2xl border border-white/10">
          <div className="grid divide-y divide-white/10 md:grid-cols-2 md:divide-y-0 md:divide-x">
            {items.map((item, i) => (
              <a
                key={item.id || i}
                href={item.url || '#'}
                target={item.url ? '_blank' : undefined}
                rel="noreferrer"
                className="group flex items-center gap-6 bg-[#0B1E3D]/50 p-7 transition hover:bg-[#0B1E3D]"
              >
                <div className="flex h-20 w-28 flex-none items-center justify-center rounded-xl bg-white/5 p-3">
                  <SmartImage
                    src={resolveAssetUrl(item.logoUrl)}
                    alt={item.title}
                    className="max-h-12 w-auto object-contain opacity-80 grayscale transition group-hover:opacity-100"
                    fallbackText="★"
                  />
                </div>
                <p className="text-sm font-semibold leading-relaxed text-white/80">
                  {item.title}
                </p>
              </a>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default AboutAwardsPartners;
