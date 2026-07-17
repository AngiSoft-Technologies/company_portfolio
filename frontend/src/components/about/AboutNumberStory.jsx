import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Link } from 'react-router-dom';
import { FaArrowRight } from 'react-icons/fa';

import {
  resolveAssetUrl,
} from '../../utils/constants';

import SmartImage from './SmartImage';

const DEFAULT_ACCENTS = [
  '#0A3DFF',
  '#8A2BE2',
  '#FF9F1C',
  '#00C2FF',
];

const normalizeStory = (
  story,
  index
) => ({
  id:
    story?.id ||
    `number-story-${index}`,

  statistic:
    story?.statistic ??
    story?.value ??
    '',

  prefix:
    story?.prefix ||
    '',

  suffix:
    story?.suffix ||
    '',

  badgeLabel:
    story?.badgeLabel ||
    story?.overline ||
    '',

  title:
    story?.title ||
    '',

  text:
    story?.text ||
    story?.description ||
    '',

  imageUrl:
    story?.imageUrl ||
    story?.images?.[0]?.url ||
    story?.images?.[0]?.imageUrl ||
    '',

  imageAlt:
    story?.imageAlt ||
    story?.images?.[0]?.caption ||
    story?.images?.[0]?.imageAlt ||
    story?.title ||
    'AngiSoft Technologies milestone',

  objectPosition:
    story?.objectPosition ||
    'center',

  link:
    story?.link ||
    null,

  accent:
    story?.accent ||
    DEFAULT_ACCENTS[
      index %
        DEFAULT_ACCENTS.length
    ],

  enabled:
    story?.enabled !== false,
});

const AboutNumberStory = ({
  stories = [],
  title = 'AngiSoft in Numbers',
  description = '',
}) => {
  const sectionRef =
    useRef(null);

  const animationFrameRef =
    useRef(null);

  const previousIndexRef =
    useRef(0);

  const [
    activeIndex,
    setActiveIndex,
  ] = useState(0);

  const [
    direction,
    setDirection,
  ] = useState('forward');

  const [
    isDesktop,
    setIsDesktop,
  ] = useState(false);

  const safeStories = useMemo(
    () =>
      (
        Array.isArray(stories)
          ? stories
          : []
      )
        .filter(Boolean)
        .map(normalizeStory)
        .filter(
          (story) =>
            story.enabled &&
            String(
              story.statistic
            ).trim() &&
            story.title
        ),
    [stories]
  );

  /*
  |--------------------------------------------------------------------------
  | Detect sticky desktop layout
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    const query =
      window.matchMedia(
        '(min-width: 1024px)'
      );

    const updateLayout = () => {
      setIsDesktop(
        query.matches
      );
    };

    updateLayout();

    query.addEventListener(
      'change',
      updateLayout
    );

    return () => {
      query.removeEventListener(
        'change',
        updateLayout
      );
    };
  }, []);

  /*
  |--------------------------------------------------------------------------
  | Resolve active story from section scroll progress
  |--------------------------------------------------------------------------
  */

  const updateActiveStory =
    useCallback(() => {
      const section =
        sectionRef.current;

      if (
        !section ||
        !isDesktop ||
        safeStories.length < 2
      ) {
        return;
      }

      const sectionRect =
        section.getBoundingClientRect();

      const availableScroll =
        Math.max(
          section.offsetHeight -
            window.innerHeight,
          1
        );

      const travelled =
        Math.min(
          Math.max(
            -sectionRect.top,
            0
          ),
          availableScroll
        );

      const progress =
        travelled /
        availableScroll;

      const transitionCount =
        Math.max(
          safeStories.length - 1,
          1
        );

      const nextIndex =
        Math.min(
          safeStories.length - 1,
          Math.max(
            0,
            Math.round(
              progress *
                transitionCount
            )
          )
        );

      if (
        nextIndex ===
        previousIndexRef.current
      ) {
        return;
      }

      setDirection(
        nextIndex >
          previousIndexRef.current
          ? 'forward'
          : 'backward'
      );

      previousIndexRef.current =
        nextIndex;

      setActiveIndex(
        nextIndex
      );
    }, [
      isDesktop,
      safeStories.length,
    ]);

  /*
  |--------------------------------------------------------------------------
  | Scroll listener
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    if (
      !isDesktop ||
      safeStories.length < 2
    ) {
      return undefined;
    }

    const requestUpdate = () => {
      if (
        animationFrameRef.current !==
        null
      ) {
        return;
      }

      animationFrameRef.current =
        window.requestAnimationFrame(
          () => {
            updateActiveStory();

            animationFrameRef.current =
              null;
          }
        );
    };

    updateActiveStory();

    window.addEventListener(
      'scroll',
      requestUpdate,
      {
        passive: true,
      }
    );

    window.addEventListener(
      'resize',
      requestUpdate
    );

    return () => {
      window.removeEventListener(
        'scroll',
        requestUpdate
      );

      window.removeEventListener(
        'resize',
        requestUpdate
      );

      if (
        animationFrameRef.current !==
        null
      ) {
        window.cancelAnimationFrame(
          animationFrameRef.current
        );
      }
    };
  }, [
    isDesktop,
    safeStories.length,
    updateActiveStory,
  ]);

  if (!safeStories.length) {
    return null;
  }

  /*
  |--------------------------------------------------------------------------
  | Clicking a revealed metric scrolls to its story
  |--------------------------------------------------------------------------
  */

  const scrollToStory = (
    index
  ) => {
    const section =
      sectionRef.current;

    if (
      !section ||
      !isDesktop
    ) {
      return;
    }

    const sectionTop =
      section.getBoundingClientRect()
        .top +
      window.scrollY;

    const availableScroll =
      Math.max(
        section.offsetHeight -
          window.innerHeight,
        1
      );

    const transitionCount =
      Math.max(
        safeStories.length - 1,
        1
      );

    const targetTop =
      sectionTop +
      (
        availableScroll *
        index
      ) /
        transitionCount;

    window.scrollTo({
      top:
        targetTop,

      behavior:
        'smooth',
    });
  };

  return (
    <section
      ref={sectionRef}
      id="about-numbers"
      className="about-numbers-section"
      style={{
        '--number-story-count':
          safeStories.length,
      }}
      aria-labelledby="about-numbers-heading"
    >
      {/* Desktop sticky storytelling */}
      <div className="about-numbers-sticky hidden lg:block">
        <div className="about-numbers-desktop-container container">
          <header className="about-numbers-header">
            <h2
              id="about-numbers-heading"
              className="about-numbers-heading"
            >
              {title}
            </h2>

            {description && (
              <p className="about-numbers-description">
                {description}
              </p>
            )}
          </header>

          <ProgressiveMetrics
            stories={safeStories}
            activeIndex={
              activeIndex
            }
            onSelect={
              scrollToStory
            }
          />

          <div className="about-numbers-stage">
            {safeStories.map(
              (
                story,
                index
              ) => (
                <NumberStorySlide
                  key={story.id}
                  story={story}
                  index={index}
                  activeIndex={
                    activeIndex
                  }
                  direction={
                    direction
                  }
                />
              )
            )}
          </div>
        </div>
      </div>

      {/* Tablet and mobile */}
      <div className="about-numbers-mobile container lg:hidden">
        <header className="about-numbers-mobile-header">
          <h2>
            {title}
          </h2>

          {description && (
            <p>
              {description}
            </p>
          )}
        </header>

        <div className="about-numbers-mobile-list">
          {safeStories.map(
            (
              story,
              index
            ) => (
              <MobileNumberStory
                key={story.id}
                story={story}
                index={index}
              />
            )
          )}
        </div>
      </div>
    </section>
  );
};

/*
|--------------------------------------------------------------------------
| Previously revealed statistics
|--------------------------------------------------------------------------
*/

const ProgressiveMetrics = ({
  stories,
  activeIndex,
  onSelect,
}) => (
  <nav
    className="about-numbers-history"
    aria-label="AngiSoft statistics"
  >
    {stories.map(
      (
        story,
        index
      ) => {
        const revealed =
          index <=
          activeIndex;

        const active =
          index ===
          activeIndex;

        return (
          <button
            key={story.id}
            type="button"
            onClick={() =>
              onSelect(index)
            }
            className={`about-number-history-item ${
              revealed
                ? 'is-revealed'
                : 'is-hidden'
            } ${
              active
                ? 'is-active'
                : ''
            }`}
            aria-current={
              active
                ? 'step'
                : undefined
            }
            disabled={
              !revealed
            }
          >
            <span
              className="about-number-history-stat"
              style={{
                color:
                  story.accent,
              }}
            >
              {story.prefix}
              {story.statistic}
              {story.suffix}
            </span>

            <span className="about-number-history-title">
              {story.title}
            </span>
          </button>
        );
      }
    )}
  </nav>
);

/*
|--------------------------------------------------------------------------
| Desktop story
|--------------------------------------------------------------------------
*/

const NumberStorySlide = ({
  story,
  index,
  activeIndex,
  direction,
}) => {
  const state =
    index === activeIndex
      ? 'active'
      : index <
          activeIndex
        ? 'past'
        : 'future';

  return (
    <article
      className={`about-number-slide is-${state} direction-${direction}`}
      style={{
        '--story-accent':
          story.accent,
      }}
      aria-hidden={
        state !== 'active'
      }
    >
      <div className="about-number-composition">
        <div className="about-number-visual">
          <div className="about-number-image-wrap">
            {story.imageUrl ? (
              <SmartImage
                src={resolveAssetUrl(
                  story.imageUrl
                )}
                alt={
                  story.imageAlt
                }
                loading={
                  index === 0
                    ? 'eager'
                    : 'lazy'
                }
                className="about-number-image"
                style={{
                  objectPosition:
                    story.objectPosition,
                }}
              />
            ) : (
              <NumberStoryPlaceholder
                story={story}
              />
            )}
          </div>

          {/*
           * The badge remains outside the image wrapper.
           * This prevents overflow:hidden from clipping it.
           */}
          <StatisticBadge
            story={story}
          />
        </div>

        <div className="about-number-copy">
          <h3 className="about-number-copy-title">
            {story.title}
          </h3>

          {story.text && (
            <p className="about-number-copy-text">
              {story.text}
            </p>
          )}

          {story.link?.to &&
            story.link?.label && (
              <Link
                to={story.link.to}
                className="about-number-copy-link"
              >
                <span>
                  {story.link.label}
                </span>

                <FaArrowRight
                  aria-hidden="true"
                />
              </Link>
            )}
        </div>
      </div>
    </article>
  );
};

/*
|--------------------------------------------------------------------------
| Statistic badge
|--------------------------------------------------------------------------
*/

const StatisticBadge = ({
  story,
}) => (
  <div
    className="about-number-statistic-badge"
    style={{
      backgroundColor:
        story.accent,
    }}
  >
    {story.badgeLabel && (
      <span className="about-number-badge-label">
        {story.badgeLabel}
      </span>
    )}

    <strong>
      {story.prefix}
      {story.statistic}
      {story.suffix}
    </strong>
  </div>
);

/*
|--------------------------------------------------------------------------
| Mobile story
|--------------------------------------------------------------------------
*/

const MobileNumberStory = ({
  story,
  index,
}) => (
  <article
    className="about-number-mobile-card"
    style={{
      '--story-accent':
        story.accent,
    }}
  >
    <div className="about-number-mobile-visual">
      <div className="about-number-mobile-image-wrap">
        {story.imageUrl ? (
          <SmartImage
            src={resolveAssetUrl(
              story.imageUrl
            )}
            alt={
              story.imageAlt
            }
            loading={
              index === 0
                ? 'eager'
                : 'lazy'
            }
            className="about-number-image"
            style={{
              objectPosition:
                story.objectPosition,
            }}
          />
        ) : (
          <NumberStoryPlaceholder
            story={story}
          />
        )}
      </div>

      <StatisticBadge
        story={story}
      />
    </div>

    <div className="about-number-mobile-copy">
      <h3>
        {story.title}
      </h3>

      {story.text && (
        <p>
          {story.text}
        </p>
      )}

      {story.link?.to &&
        story.link?.label && (
          <Link
            to={story.link.to}
          >
            <span>
              {story.link.label}
            </span>

            <FaArrowRight
              aria-hidden="true"
            />
          </Link>
        )}
    </div>
  </article>
);

/*
|--------------------------------------------------------------------------
| Image fallback
|--------------------------------------------------------------------------
*/

const NumberStoryPlaceholder = ({
  story,
}) => (
  <div className="about-number-placeholder">
    <span
      style={{
        color:
          story.accent,
      }}
    >
      {story.prefix}
      {story.statistic}
      {story.suffix}
    </span>
  </div>
);

export default AboutNumberStory;