import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Link } from 'react-router-dom';
import { FaArrowRight } from 'react-icons/fa';

import { resolveAssetUrl } from '../../utils/constants';
import SmartImage from './SmartImage';

const normalizeIndustry = (industry, index) => ({
  id:
    industry?.id ||
    `industry-${index}`,

  title:
    industry?.title ||
    industry?.name ||
    '',

  imageUrl:
    industry?.imageUrl ||
    industry?.iconUrl ||
    '',

  imageAlt:
    industry?.imageAlt ||
    `${industry?.title || industry?.name || 'Industry'} illustration`,

  to:
    industry?.to ||
    industry?.href ||
    '',

  accent:
    industry?.accent ||
    [
      '#00C2FF',
      '#0A3DFF',
      '#39FF6A',
      '#FF9F1C',
      '#8A2BE2',
    ][index % 5],
});

const AboutIndustriesGrid = ({
  industries = [],
  heading = {},
}) => {
  const sectionRef = useRef(null);
  const [visible, setVisible] = useState(false);

  const headingData = useMemo(
    () => ({
      ...(heading || {}),
    }),
    [heading]
  );

  const safeIndustries = useMemo(() => {
    const source =
      Array.isArray(industries) &&
        industries.length
        ? industries
        : [];

    return source
      .map(normalizeIndustry)
      .filter((industry) => industry.title);
  }, [industries]);

  useEffect(() => {
    const node = sectionRef.current;

    if (!node) {
      return undefined;
    }

    const reduceMotion =
      window.matchMedia(
        '(prefers-reduced-motion: reduce)'
      ).matches;

    if (reduceMotion) {
      setVisible(true);
      return undefined;
    }

    const observer =
      new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setVisible(true);
            observer.disconnect();
          }
        },
        {
          threshold: 0.1,
        }
      );

    observer.observe(node);

    return () => observer.disconnect();
  }, []);

  if (!safeIndustries.length) {
    return null;
  }

  return (
    <section
      ref={sectionRef}
      id="industries-angisoft-serves"
      className="about-industries relative overflow-hidden bg-[#07142B] py-16 md:py-20 lg:py-24"
      aria-labelledby="about-industries-heading"
    >
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden="true"
      >
        <div className="absolute left-1/2 top-[45%] h-[560px] w-[1000px] -translate-x-1/2 rounded-full bg-[#0A3DFF]/[0.04] blur-[170px]" />

        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      </div>

      <div className="container relative">
        <header
          className={`max-w-5xl transition duration-700 ${visible
            ? 'translate-y-0 opacity-100'
            : 'translate-y-5 opacity-0'
            }`}
        >
          <div className="relative inline-block">
            <span
              className="absolute -left-4 -top-4 h-14 w-14 bg-[#0A3DFF]/15"
              aria-hidden="true"
            />

            <h2
              id="about-industries-heading"
              className="relative text-3xl font-bold tracking-[-0.035em] text-white md:text-4xl"
              style={{
                fontFamily:
                  'Sora, sans-serif',
              }}
            >
              {headingData.title}
            </h2>
          </div>

          {headingData.description && (
            <p className="mx-auto mt-4 max-w-3xl text-base leading-8 text-white/65 md:text-lg">
              {headingData.description}
            </p>
          )}
        </header>

        <div className="about-industries-grid mt-9 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
          {safeIndustries.map(
            (industry, index) => (
              <IndustryTile
                key={industry.id}
                industry={industry}
                index={index}
                visible={visible}
              />
            )
          )}
        </div>
      </div>
    </section>
  );
};

const IndustryTile = ({
  industry,
  index,
  visible,
}) => {
  const content = (
    <>
      {industry.to && (
        <span
          className="about-industry-arrow"
          style={{
            color: industry.accent,
          }}
          aria-hidden="true"
        >
          <FaArrowRight />
        </span>
      )}

      <div
        className="about-industry-icon-box"
        style={{
          '--industry-accent':
            industry.accent,
        }}
      >
        {industry.imageUrl ? (
          <SmartImage
            src={resolveAssetUrl(
              industry.imageUrl
            )}
            alt=""
            loading="lazy"
            className="about-industry-icon"
          />
        ) : (
          <IndustryFallback
            title={industry.title}
            accent={industry.accent}
          />
        )}
      </div>

      <h3 className="about-industry-title">
        {industry.title}
      </h3>
    </>
  );

  const className = `
    about-industry-tile
    group relative flex min-w-0
    flex-col items-center justify-center
    text-center no-underline
    transition duration-700
    ${visible
      ? 'translate-y-0 opacity-100'
      : 'translate-y-5 opacity-0'
    }
  `;

  const style = {
    '--industry-accent':
      industry.accent,

    transitionDelay:
      `${70 + index * 35}ms`,
  };

  if (industry.to) {
    return (
      <Link
        to={industry.to}
        className={className}
        style={style}
        aria-label={`Explore ${industry.title}`}
      >
        {content}
      </Link>
    );
  }

  return (
    <article
      className={className}
      style={style}
    >
      {content}
    </article>
  );
};

const IndustryFallback = ({
  title,
  accent,
}) => (
  <div
    className="flex h-24 w-24 items-center justify-center rounded-full border text-center text-xs font-bold uppercase tracking-[0.12em]"
    style={{
      color: accent,
      borderColor: `${accent}55`,
      backgroundColor: `${accent}12`,
    }}
  >
    {title
      .split(' ')
      .slice(0, 2)
      .map((word) => word[0])
      .join('')}
  </div>
);

export default AboutIndustriesGrid;