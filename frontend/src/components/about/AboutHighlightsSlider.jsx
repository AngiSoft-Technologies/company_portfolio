import React, {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Link } from 'react-router-dom';
import { FaExternalLinkAlt } from 'react-icons/fa';

import {
  resolveAssetUrl,
} from '../../utils/constants';

import SmartImage from './SmartImage';

const DEFAULT_HEADING = {
  title: 'AngiSoft’s Highlights',
};

const DEFAULT_ITEMS = [
  {
    id: 'grassroots-origin',

    year: 'Before 2024',

    shortYear: 'Origins',

    title:
      'Grassroots Technology Work',

    accent:
      '#0A3DFF',

    highlights: [
      {
        id:
          'grassroots-support',

        text:
          'Before AngiSoft officially began, Prof Angera Silas supported students, professionals and community members through coding assistance, debugging, document preparation and digital services.',

        imageUrl:
          '/uploads/public/images/about/highlights/grassroots-support.webp',

        imageAlt:
          'Early AngiSoft coding and technical support work',
      },

      {
        id:
          'early-services',

        text:
          'The early work included data analysis, software installation, Windows and Office activation, online applications, poster design and beginner programming guidance.',

        imageUrl:
          '/uploads/public/images/about/highlights/early-services.webp',

        imageAlt:
          'Early AngiSoft digital and technical services',
      },
    ],
  },

  {
    id: 'founded-2024',

    year: 'December 2024',

    shortYear: '2024',

    title:
      'AngiSoft Technologies Officially Begins',

    accent:
      '#00C2FF',

    highlights: [
      {
        id:
          'official-foundation',

        text:
          'AngiSoft Technologies officially began in December 2024, bringing earlier grassroots technical work under one focused African technology brand.',

        imageUrl:
          '/uploads/public/images/about/highlights/founding-2024.webp',

        imageAlt:
          'AngiSoft Technologies founding milestone',
      },

      {
        id:
          'founder-led-work',

        text:
          'Prof Angera Silas initially handled development, technical support, client communication, project coordination and daily operations.',

        imageUrl:
          '/uploads/public/images/about/highlights/founder-led.webp',

        imageAlt:
          'Founder-led development at AngiSoft Technologies',
      },
    ],
  },

  {
    id: 'growth-2025',

    year: '2025',

    shortYear: '2025',

    title:
      'Expansion into Software Systems',

    accent:
      '#39FF6A',

    highlights: [
      {
        id:
          'software-expansion',

        text:
          'AngiSoft expanded into professional websites, database-backed applications, management systems, dashboards and mobile application development.',

        imageUrl:
          '/uploads/public/images/about/highlights/software-expansion.webp',

        imageAlt:
          'AngiSoft software development expansion',
      },

      {
        id:
          'system-recovery',

        text:
          'The company strengthened its work in code debugging, system upgrades, frontend-backend integration and recovery of difficult legacy software projects.',

        imageUrl:
          '/uploads/public/images/about/highlights/system-recovery.webp',

        imageAlt:
          'AngiSoft legacy system recovery work',
      },

      {
        id:
          'growing-portfolio',

        text:
          'AngiSoft contributed to several client, academic and internal projects while improving its development, deployment and support processes.',

        imageUrl:
          '/uploads/public/images/about/highlights/project-portfolio.webp',

        imageAlt:
          'AngiSoft software project portfolio',
      },
    ],
  },

  {
    id: 'products-2026',

    year: '2026',

    shortYear: '2026',

    title:
      'Building Original Product Ecosystems',

    accent:
      '#0A3DFF',

    highlights: [
      {
        id:
          'petroflow',

        text:
          'AngiSoft continued developing PetroFlow for petrol-station operations, reporting and data automation.',

        imageUrl:
          '/uploads/public/images/about/highlights/petroflow-mark.webp',

        imageAlt:
          'PetroFlow product mark',
      },

      {
        id:
          'dukaflow',

        text:
          'DukaFlow continued taking shape as a retail and business-management solution for shops, SMEs and supermarkets.',

        imageUrl:
          '/uploads/public/images/about/highlights/dukaflow-mark.webp',

        imageAlt:
          'DukaFlow product mark',
      },

      {
        id:
          'kejalink-angitunes',

        text:
          'KejaLink and AngiTunes continued developing around property services and Kenya’s music and creative economy.',

        imageUrl:
          '/uploads/public/images/about/highlights/ecosystems-mark.webp',

        imageAlt:
          'KejaLink and AngiTunes product ecosystem marks',
      },
    ],
  },
];

const YEAR_ACCENTS = [
  '#0A3DFF',
  '#00C2FF',
  '#39FF6A',
  '#8A2BE2',
];

const normalizeHighlight = (
  highlight,
  index,
  prefix,
  fallbackImage = null
) => {
  if (
    typeof highlight ===
    'string'
  ) {
    return {
      id:
        `${prefix}-highlight-${index}`,

      text:
        highlight,

      imageUrl:
        fallbackImage?.imageUrl ||
        fallbackImage?.url ||
        '',

      imageAlt:
        fallbackImage?.imageAlt ||
        fallbackImage?.caption ||
        'AngiSoft milestone image',
    };
  }

  return {
    id:
      highlight?.id ||
      `${prefix}-highlight-${index}`,

    text:
      highlight?.text ||
      highlight?.description ||
      highlight?.title ||
      '',

    imageUrl:
      highlight?.imageUrl ||
      highlight?.logoUrl ||
      fallbackImage?.imageUrl ||
      fallbackImage?.url ||
      '',

    imageAlt:
      highlight?.imageAlt ||
      fallbackImage?.imageAlt ||
      fallbackImage?.caption ||
      highlight?.title ||
      'AngiSoft milestone image',
  };
};

const normalizeItem = (
  item,
  index
) => {
  const itemId =
    item?.id ||
    `highlight-${index}`;

  const sourceHighlights =
    Array.isArray(
      item?.highlights
    )
      ? item.highlights
      : item?.description
        ? [item.description]
        : [];

  const sourceImages =
    Array.isArray(item?.images)
      ? item.images
      : [];

  const highlights =
    sourceHighlights
      .map(
        (
          highlight,
          highlightIndex
        ) =>
          normalizeHighlight(
            highlight,
            highlightIndex,
            itemId,
            sourceImages[
              highlightIndex
            ] ||
              sourceImages[0] ||
              null
          )
      )
      .filter(
        (highlight) =>
          highlight.text
      );

  return {
    id: itemId,

    year:
      item?.year ||
      '',

    shortYear:
      item?.shortYear ||
      item?.year ||
      '',

    title:
      item?.title ||
      '',

    accent:
      item?.accent ||
      YEAR_ACCENTS[
        index %
          YEAR_ACCENTS.length
      ],

    highlights,

    link:
      item?.link ||
      null,

    enabled:
      item?.enabled !== false,
  };
};

const AboutHighlightsSlider = ({
  items = [],
  heading = {},
}) => {
  const sectionRef =
    useRef(null);

  const railViewportRef =
    useRef(null);

  const railRef =
    useRef(null);

  const yearButtonRefs =
    useRef([]);

  const contentTimerRef =
    useRef(null);

  const safeItems = useMemo(
    () => {
      const source =
        Array.isArray(items) &&
        items.length
          ? items
          : DEFAULT_ITEMS;

      return source
        .filter(Boolean)
        .map(normalizeItem)
        .filter(
          (item) =>
            item.enabled &&
            item.shortYear &&
            item.highlights.length
        );
    },
    [items]
  );

  const headingData =
    useMemo(
      () => ({
        ...DEFAULT_HEADING,
        ...(heading || {}),
      }),
      [heading]
    );

  const initialIndex =
    Math.max(
      safeItems.length - 1,
      0
    );

  const [
    activeIndex,
    setActiveIndex,
  ] = useState(initialIndex);

  const [
    displayedIndex,
    setDisplayedIndex,
  ] = useState(initialIndex);

  const [
    contentVisible,
    setContentVisible,
  ] = useState(true);

  const [
    railTranslate,
    setRailTranslate,
  ] = useState(0);

  const [
    railSidePadding,
    setRailSidePadding,
  ] = useState(0);

  const [
    sectionVisible,
    setSectionVisible,
  ] = useState(false);

  const activeItem =
    safeItems[
      displayedIndex
    ] ||
    safeItems[0];

  const updateRailPosition =
    () => {
      const viewport =
        railViewportRef.current;

      const activeButton =
        yearButtonRefs.current[
          activeIndex
        ];

      if (
        !viewport ||
        !activeButton
      ) {
        return;
      }

      const viewportWidth =
        viewport.clientWidth;

      const sidePadding =
        Math.max(
          viewportWidth / 2 -
            activeButton
              .offsetWidth /
              2,
          0
        );

      setRailSidePadding(
        sidePadding
      );

      requestAnimationFrame(
        () => {
          const currentButton =
            yearButtonRefs
              .current[
              activeIndex
            ];

          if (!currentButton) {
            return;
          }

          const activeCenter =
            currentButton
              .offsetLeft +
            currentButton
              .offsetWidth /
              2;

          const viewportCenter =
            viewportWidth / 2;

          setRailTranslate(
            viewportCenter -
              activeCenter
          );
        }
      );
    };

  useLayoutEffect(() => {
    updateRailPosition();

    const viewport =
      railViewportRef.current;

    if (!viewport) {
      return undefined;
    }

    const resizeObserver =
      new ResizeObserver(() => {
        updateRailPosition();
      });

    resizeObserver.observe(
      viewport
    );

    return () => {
      resizeObserver.disconnect();
    };
  }, [
    activeIndex,
    safeItems.length,
  ]);

  useEffect(() => {
    const node =
      sectionRef.current;

    if (!node) {
      return undefined;
    }

    const reduceMotion =
      window.matchMedia(
        '(prefers-reduced-motion: reduce)'
      ).matches;

    if (reduceMotion) {
      setSectionVisible(true);
      return undefined;
    }

    const observer =
      new IntersectionObserver(
        ([entry]) => {
          if (
            entry.isIntersecting
          ) {
            setSectionVisible(
              true
            );

            observer.disconnect();
          }
        },
        {
          threshold: 0.1,
        }
      );

    observer.observe(node);

    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(
    () => () => {
      if (
        contentTimerRef.current
      ) {
        window.clearTimeout(
          contentTimerRef.current
        );
      }
    },
    []
  );

  if (!safeItems.length) {
    return null;
  }

  const selectYear = (
    nextIndex
  ) => {
    if (
      nextIndex <
        0 ||
      nextIndex >=
        safeItems.length ||
      nextIndex ===
        activeIndex
    ) {
      return;
    }

    setActiveIndex(
      nextIndex
    );

    setContentVisible(
      false
    );

    if (
      contentTimerRef.current
    ) {
      window.clearTimeout(
        contentTimerRef.current
      );
    }

    contentTimerRef.current =
      window.setTimeout(
        () => {
          setDisplayedIndex(
            nextIndex
          );

          requestAnimationFrame(
            () => {
              setContentVisible(
                true
              );
            }
          );
        },
        220
      );
  };

  return (
    <section
      ref={sectionRef}
      id="angisoft-highlights"
      className="about-highlights bg-[#0A1B38] py-16 md:py-20 lg:py-24"
      aria-labelledby="about-highlights-heading"
    >
      <div className="container">
        <header
          className={`text-center transition duration-700 ${
            sectionVisible
              ? 'translate-y-0 opacity-100'
              : 'translate-y-4 opacity-0'
          }`}
        >
          <h2
            id="about-highlights-heading"
            className="text-2xl font-semibold text-white md:text-3xl"
            style={{
              fontFamily:
                'Georgia, "Times New Roman", serif',
            }}
          >
            {headingData.title}
          </h2>
        </header>

        <div
          className={`mt-10 transition duration-700 ${
            sectionVisible
              ? 'translate-y-0 opacity-100'
              : 'translate-y-5 opacity-0'
          }`}
          style={{
            transitionDelay:
              '100ms',
          }}
        >
          <div
            ref={
              railViewportRef
            }
            className="about-highlight-rail-viewport"
          >
            <div
              ref={railRef}
              className="about-highlight-rail"
              style={{
                paddingLeft:
                  `${railSidePadding}px`,

                paddingRight:
                  `${railSidePadding}px`,

                transform:
                  `translate3d(${railTranslate}px, 0, 0)`,
              }}
            >
              {safeItems.map(
                (
                  item,
                  index
                ) => {
                  const distance =
                    Math.abs(
                      index -
                        activeIndex
                    );

                  const yearLabel =
                    String(
                      item.shortYear
                    );

                  const isRange =
                    yearLabel.includes(
                      '–'
                    ) ||
                    /^\d{4}\s*-\s*\d{4}$/.test(
                      yearLabel
                    );

                  return (
                    <button
                      key={item.id}
                      ref={(node) => {
                        yearButtonRefs
                          .current[
                          index
                        ] = node;
                      }}
                      type="button"
                      onClick={() =>
                        selectYear(
                          index
                        )
                      }
                      className={`about-highlight-year ${
                        index ===
                        activeIndex
                          ? 'is-active'
                          : ''
                      } ${
                        isRange
                          ? 'is-range'
                          : ''
                      }`}
                      style={{
                        '--highlight-accent':
                          item.accent,

                        '--year-opacity':
                          getYearOpacity(
                            distance
                          ),

                        '--year-scale':
                          getYearScale(
                            distance
                          ),
                      }}
                      aria-current={
                        index ===
                        activeIndex
                          ? 'step'
                          : undefined
                      }
                    >
                      {yearLabel}
                    </button>
                  );
                }
              )}

              <div className="about-highlight-future">
                Let&apos;s build
                <br />
                the future
                <br />
                together
              </div>
            </div>

            <div
              className="about-highlight-edge about-highlight-edge-left"
              aria-hidden="true"
            />

            <div
              className="about-highlight-edge about-highlight-edge-right"
              aria-hidden="true"
            />
          </div>

          <div className="about-highlight-content-wrap">
            <div
              className={`about-highlight-content-panel ${
                contentVisible
                  ? 'is-visible'
                  : 'is-changing'
              }`}
              style={{
                '--highlight-accent':
                  activeItem.accent,
              }}
            >
              {activeItem.title && (
                <h3 className="about-highlight-content-title">
                  {
                    activeItem.title
                  }
                </h3>
              )}

              <div className="about-highlight-content-list">
                {activeItem.highlights.map(
                  (
                    highlight
                  ) => (
                    <article
                      key={
                        highlight.id
                      }
                      className="about-highlight-entry"
                    >
                      <div className="about-highlight-entry-media">
                        {highlight.imageUrl ? (
                          <SmartImage
                            src={resolveAssetUrl(
                              highlight.imageUrl
                            )}
                            alt={
                              highlight.imageAlt
                            }
                            loading="lazy"
                            className="about-highlight-entry-image"
                          />
                        ) : (
                          <HighlightEntryFallback
                            label={
                              activeItem.shortYear
                            }
                            accent={
                              activeItem.accent
                            }
                          />
                        )}
                      </div>

                      <p className="about-highlight-entry-text">
                        {
                          highlight.text
                        }
                      </p>
                    </article>
                  )
                )}
              </div>

              {activeItem.link
                ?.to &&
                activeItem.link
                  ?.label && (
                  <Link
                    to={
                      activeItem
                        .link.to
                    }
                    className="about-highlight-link"
                  >
                    {
                      activeItem
                        .link.label
                    }

                    <FaExternalLinkAlt />
                  </Link>
                )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

const HighlightEntryFallback = ({
  label,
  accent,
}) => (
  <div
    className="about-highlight-entry-fallback"
    style={{
      color: accent,

      borderColor:
        `${accent}55`,

      backgroundColor:
        `${accent}12`,
    }}
    aria-hidden="true"
  >
    {label}
  </div>
);

const getYearOpacity = (
  distance
) => {
  if (distance === 0) {
    return 1;
  }

  if (distance === 1) {
    return 0.86;
  }

  if (distance === 2) {
    return 0.56;
  }

  if (distance === 3) {
    return 0.26;
  }

  return 0.05;
};

const getYearScale = (
  distance
) => {
  if (distance === 0) {
    return 1;
  }

  if (distance === 1) {
    return 0.985;
  }

  if (distance === 2) {
    return 0.96;
  }

  if (distance === 3) {
    return 0.93;
  }

  return 0.9;
};

export default AboutHighlightsSlider;