// @ts-nocheck
import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { LuCheck } from 'react-icons/lu';;

import AboutDeliveryMap from './AboutDeliveryMap';

const DEFAULT_COLORS = 'var(--color-primary)';

const normalizeRegion = (
  region,
  index
) => ({
  id:
    region?.id ||
    `geography-region-${index}`,

  title:
    region?.title ||
    '',

  lineOne:
    region?.lineOne ||
    region?.description ||
    '',

  lineTwo:
    region?.lineTwo ||
    '',

  color:
    region?.color ||
    DEFAULT_COLORS[
      index %
        DEFAULT_COLORS.length
    ],
});

const normalizeBenefit = (
  benefit,
  index
) => {
  if (
    typeof benefit ===
    'string'
  ) {
    return {
      id:
        `delivery-benefit-${index}`,

      title:
        benefit,
    };
  }

  return {
    id:
      benefit?.id ||
      `delivery-benefit-${index}`,

    title:
      benefit?.title ||
      benefit?.text ||
      benefit?.description ||
      '',
  };
};

const AboutGeographyMap = ({
  content = {},
}) => {
  const sectionRef =
    useRef(null);

  const [visible, setVisible] =
    useState(false);

  const data = useMemo(
    () => ({
      ...(content || {}),

      delivery: {
        ...(content?.delivery || {}),
      },
    }),
    [content]
  );

  const regions = useMemo(() => {
    const source =
      Array.isArray(
        data.regions
      ) &&
      data.regions.length
        ? data.regions
        : [];

    return source
      .slice(0, 3)
      .map(normalizeRegion)
      .filter(
        (region) =>
          region.title
      );
  }, [data.regions]);

  const benefits = useMemo(() => {
    const source =
      Array.isArray(
        data.delivery?.benefits
      ) &&
      data.delivery
        .benefits.length
        ? data.delivery
            .benefits
        : [];

    return source
      .map(
        normalizeBenefit
      )
      .filter(
        (benefit) =>
          benefit.title
      );
  }, [
    data.delivery?.benefits,
  ]);

  useEffect(() => {
    const node =
      sectionRef.current;

    if (!node) {
      return undefined;
    }

    const reducedMotion =
      window.matchMedia(
        '(prefers-reduced-motion: reduce)'
      ).matches;

    if (reducedMotion) {
      setVisible(true);
      return undefined;
    }

    const observer =
      new IntersectionObserver(
        ([entry]) => {
          if (
            entry.isIntersecting
          ) {
            setVisible(true);
            observer.disconnect();
          }
        },
        {
          threshold: 0.08,
        }
      );

    observer.observe(node);

    return () => {
      observer.disconnect();
    };
  }, []);

  if (
    data.enabled === false
  ) {
    return null;
  }

  if (
    !data.title &&
    !data.intro &&
    !regions.length &&
    !benefits.length
  ) {
    return null;
  }

  return (
    <section
      ref={sectionRef}
      id="about-geography"
      className="about-geography py-16 md:py-20 lg:py-24"
      aria-labelledby="about-geography-heading"
    >
      <div className="container">
        {/* Heading */}
        <header
          className={`text-center transition duration-700 ${
            visible
              ? 'translate-y-0 opacity-100'
              : 'translate-y-4 opacity-0'
          }`}
        >
          <h2
            id="about-geography-heading"
            className="text-3xl font-bold tracking-[-0.035em] text-[var(--text-primary)] md:text-4xl"
            style={{
              fontFamily:
                'Sora, sans-serif',
            }}
          >
            {data.title}
          </h2>

          {data.intro && (
            <p className="mx-auto mt-5 max-w-4xl text-base leading-8 text-[var(--text-secondary)] md:text-lg text-pretty">
              {data.intro}
            </p>
          )}
        </header>

        {/* Regional summaries */}
        {regions.length > 0 && (
          <div className="about-geography-regions mx-auto mt-8 grid max-w-5xl gap-6 sm:grid-cols-3">
            {regions.map(
              (
                region,
                index
              ) => (
                <article
                  key={region.id}
                  className={`text-center transition duration-700 ${
                    visible
                      ? 'translate-y-0 opacity-100'
                      : 'translate-y-4 opacity-0'
                  }`}
                  style={{
                    transitionDelay:
                      `${
                        80 +
                        index *
                          80
                      }ms`,
                  }}
                >
                  <h3
                    className="text-sm font-bold md:text-base"
                    style={{
                      color:
                        region.color,
                    }}
                  >
                    {region.title}
                  </h3>

                  {region.lineOne && (
                    <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">
                      {region.lineOne}
                    </p>
                  )}

                  {region.lineTwo && (
                    <p className="text-xs leading-5 text-[var(--text-muted)]">
                      {region.lineTwo}
                    </p>
                  )}
                </article>
              )
            )}
          </div>
        )}

        {/* Real delivery map */}
        <div
          className={`about-geography-map mt-8 transition duration-1000 ${
            visible
              ? 'translate-y-0 opacity-100'
              : 'translate-y-6 opacity-0'
          }`}
          style={{
            transitionDelay:
              '220ms',
          }}
        >
          <AboutDeliveryMap />
        </div>

        {/* Delivery copy and benefits — same section */}
        {data.delivery
          ?.enabled !== false &&
          (
            data.delivery
              ?.introduction ||
            benefits.length > 0
          ) && (
            <div
              className={`about-geography-delivery mt-10 border-t border-[var(--border-light)] pt-8 transition duration-700 md:mt-12 md:pt-10 ${
                visible
                  ? 'translate-y-0 opacity-100'
                  : 'translate-y-5 opacity-0'
              }`}
              style={{
                transitionDelay:
                  '300ms',
              }}
            >
              {data.delivery
                ?.introduction && (
                <p className="max-w-6xl text-base leading-8 text-[var(--text-secondary)] md:text-lg text-pretty">
                  {
                    data.delivery
                      .introduction
                  }
                </p>
              )}

              {benefits.length >
                0 && (
                <div className="mt-6 grid gap-x-10 gap-y-3 md:grid-cols-2">
                  {benefits.map(
                    (
                      benefit
                    ) => (
                      <article
                        key={
                          benefit.id
                        }
                        className="about-geography-benefit flex items-start gap-3"
                      >
                        <span
                          className="mt-[7px] flex h-4 w-4 shrink-0 items-center justify-center border border-[#00C2FF]/55 text-[7px] text-[var(--brand-accent-ink)]"
                          aria-hidden="true"
                        >
                          <LuCheck />
                        </span>

                        <p className="text-xs leading-6 text-[var(--text-secondary)] md:text-sm">
                          {
                            benefit.title
                          }
                        </p>
                      </article>
                    )
                  )}
                </div>
              )}
            </div>
          )}
      </div>
    </section>
  );
};

export default AboutGeographyMap;