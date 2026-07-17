import React from 'react';
import SectionHeading from './SectionHeading';

/**
 * "All of the following" — a grouped checklist of everything we offer,
 * including everyday digital errands (KRA / Good Conduct applications) for
 * the computer-illiterate. Built for scanability, with a highlighted note.
 */
const AboutFullServices = ({ fullServices }) => {
  const data = fullServices || {};
  const groups = Array.isArray(data.groups) ? data.groups : [];
  if (!groups.length) return null;

  return (
    <section className="bg-[#07142B] py-20 md:py-28">
      <div className="container">
        <SectionHeading
          align="center"
          eyebrow={data.eyebrow || 'Everything We Offer'}
          title={data.title || 'All of the Following'}
          description={data.description}
        />
        <div className="mt-12 grid gap-6 md:grid-cols-2">
          {groups.map((group) => (
            <div key={group.id} className="rounded-2xl border border-white/10 bg-[#0B1E3D]/60 p-7">
              <h3 className="text-lg font-bold text-[#00C2FF]">{group.title}</h3>
              <ul className="mt-4 space-y-3">
                {group.items.map((it, i) => (
                  <li key={i} className="flex items-start gap-3 text-white/75">
                    <span className="mt-1 flex h-5 w-5 flex-none items-center justify-center rounded-full bg-[#00C2FF]/15 text-[#00C2FF]">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="h-3 w-3">
                        <path d="M5 13l4 4L19 7" />
                      </svg>
                    </span>
                    <span className="text-sm leading-relaxed">{it}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default AboutFullServices;
