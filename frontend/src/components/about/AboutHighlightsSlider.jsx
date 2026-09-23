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
          : [];

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