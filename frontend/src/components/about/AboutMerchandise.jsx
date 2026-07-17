import React from 'react';
import SectionHeading from './SectionHeading';
import SmartImage from './SmartImage';
import { resolveAssetUrl } from '../../utils/constants';

/**
 * Merchandise gallery — a clean responsive grid of product cards (cover image
 * + title). Placeholder "coming soon" store note; images reuse brand visuals.
 */
const AboutMerchandise = ({ merchandise }) => {
  const data = merchandise || {};
  const items = Array.isArray(data.items) ? data.items : [];
  if (!items.length) return null;

  return (
    <section className="bg-[#07142B] py-20 md:py-28">
      <div className="container">
        <SectionHeading
          align="center"
          eyebrow={data.eyebrow || 'AngiSoft Merch'}
          title={data.title || 'Merchandise Gallery'}
          description={data.description}
        />
        <div className="mt-12 grid grid-cols-2 gap-4 sm:gap-5 md:grid-cols-3 lg:grid-cols-6">
          {items.map((item, i) => (
            <article key={item.id || i} className="group overflow-hidden rounded-2xl border border-white/10 bg-[#0B1E3D]/60">
              <div className="relative aspect-square overflow-hidden">
                <SmartImage
                  src={resolveAssetUrl(item.imageUrl)}
                  alt={item.title}
                  className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                  loading="lazy"
                />
              </div>
              <h3 className="px-3 py-3 text-center text-sm font-semibold text-white">{item.title}</h3>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
};

export default AboutMerchandise;
