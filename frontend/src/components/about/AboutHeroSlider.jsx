import React, {
  useMemo,
  useRef,
} from 'react';
import { Link } from 'react-router-dom';
import {
  Autoplay,
  EffectFade,
  Navigation,
  Pagination,
} from 'swiper/modules';
import {
  Swiper,
  SwiperSlide,
} from 'swiper/react';
import {
  FaArrowLeft,
  FaArrowRight,
} from 'react-icons/fa';

import 'swiper/css';
import 'swiper/css/effect-fade';
import 'swiper/css/navigation';
import 'swiper/css/pagination';

import {
  resolveAssetUrl,
} from '../../utils/constants';

import SmartImage from './SmartImage';

const DEFAULT_INTRO = {
  enabled: true,

  headline:
    'About AngiSoft Technologies –',

  highlight:
    'Your Partner for Digital Success',

  paragraph:
    'Founded in December 2024, AngiSoft Technologies provides software development, digital products, data solutions and practical technology services. Our clients value clear communication, responsible delivery and solutions shaped around real business and community needs.',

  primaryCta: {
    label:
      'Schedule an Introductory Call',

    to:
      '/booking',
  },
};

const normalizeSlide = (
  slide,
  index
) => ({
  id:
    slide?.id ||
    `about-hero-slide-${index}`,

  imageUrl:
    slide?.imageUrl ||
    slide?.images?.[0]?.url ||
    '',

  mobileImageUrl:
    slide?.mobileImageUrl ||
    '',

  imageAlt:
    slide?.imageAlt ||
    slide?.alt ||
    slide?.name ||
    slide?.title ||
    'AngiSoft Technologies leadership',

  name:
    slide?.name ||
    slide?.title ||
    '',

  role:
    slide?.role ||
    slide?.subtitle ||
    '',

  objectPosition:
    slide?.objectPosition ||
    'center',

  to:
    slide?.to ||
    slide?.href ||
    '',

  enabled:
    slide?.enabled !== false,
});

const AboutHeroSlider = ({
  slides = [],
  intro = {},
}) => {
  const previousButtonRef =
    useRef(null);

  const nextButtonRef =
    useRef(null);

  const paginationRef =
    useRef(null);

  const content = useMemo(
    () => ({
      ...DEFAULT_INTRO,
      ...(intro || {}),

      primaryCta: {
        ...DEFAULT_INTRO.primaryCta,
        ...(intro?.primaryCta || {}),
      },
    }),
    [intro]
  );

  const safeSlides = useMemo(
    () =>
      (
        Array.isArray(slides)
          ? slides
          : []
      )
        .filter(Boolean)
        .map(normalizeSlide)
        .filter(
          (slide) =>
            slide.enabled &&
            slide.imageUrl
        ),
    [slides]
  );

  if (
    content.enabled === false ||
    (
      !content.headline &&
      !safeSlides.length
    )
  ) {
    return null;
  }

  const hasMultipleSlides =
    safeSlides.length > 1;

  return (
    <section
      id="about-company-introduction"
      className="about-company-hero"
      aria-labelledby="about-company-heading"
    >
      <div className="container">
        <div className="about-company-hero-layout">
          <div className="about-company-hero-copy">
            <h1
              id="about-company-heading"
              className="about-company-hero-heading"
            >
              {content.headline}

              {content.highlight && (
                <span>
                  {content.highlight}
                </span>
              )}
            </h1>

            {content.paragraph && (
              <p className="about-company-hero-description">
                {content.paragraph}
              </p>
            )}

            {content.primaryCta?.to &&
              content.primaryCta
                ?.label && (
                <Link
                  to={
                    content
                      .primaryCta.to
                  }
                  className="about-company-hero-cta"
                >
                  <span>
                    {
                      content
                        .primaryCta
                        .label
                    }
                  </span>

                  <FaArrowRight
                    aria-hidden="true"
                  />
                </Link>
              )}
          </div>

          <div className="about-company-hero-media">
            {safeSlides.length ? (
              <div className="about-company-hero-slider">
                <Swiper
                  modules={[
                    Autoplay,
                    EffectFade,
                    Navigation,
                    Pagination,
                  ]}
                  slidesPerView={1}
                  effect="fade"
                  fadeEffect={{
                    crossFade: true,
                  }}
                  speed={650}
                  loop={
                    hasMultipleSlides
                  }
                  allowTouchMove={
                    hasMultipleSlides
                  }
                  autoplay={
                    hasMultipleSlides
                      ? {
                          delay: 6000,
                          disableOnInteraction:
                            false,
                          pauseOnMouseEnter:
                            true,
                        }
                      : false
                  }
                  navigation={
                    hasMultipleSlides
                      ? {
                          prevEl:
                            previousButtonRef.current,

                          nextEl:
                            nextButtonRef.current,
                        }
                      : false
                  }
                  pagination={
                    hasMultipleSlides
                      ? {
                          el:
                            paginationRef.current,

                          clickable: true,

                          type:
                            'bullets',
                        }
                      : false
                  }
                  onBeforeInit={(
                    swiper
                  ) => {
                    if (
                      !hasMultipleSlides
                    ) {
                      return;
                    }

                    swiper.params.navigation.prevEl =
                      previousButtonRef.current;

                    swiper.params.navigation.nextEl =
                      nextButtonRef.current;

                    swiper.params.pagination.el =
                      paginationRef.current;
                  }}
                  onInit={(swiper) => {
                    if (
                      !hasMultipleSlides
                    ) {
                      return;
                    }

                    swiper.navigation.init();
                    swiper.navigation.update();

                    swiper.pagination.init();
                    swiper.pagination.render();
                    swiper.pagination.update();
                  }}
                  className="about-hero-swiper"
                >
                  {safeSlides.map(
                    (
                      slide,
                      index
                    ) => (
                      <SwiperSlide
                        key={slide.id}
                      >
                        <HeroMediaSlide
                          slide={slide}
                          eager={
                            index === 0
                          }
                        />
                      </SwiperSlide>
                    )
                  )}
                </Swiper>

                {hasMultipleSlides && (
                  <>
                    <button
                      ref={
                        previousButtonRef
                      }
                      type="button"
                      className="about-hero-prev"
                      aria-label="Previous leadership profile"
                    >
                      <FaArrowLeft />
                    </button>

                    <div
                      ref={
                        paginationRef
                      }
                      className="about-hero-pagination"
                      aria-label="Leadership profiles"
                    />

                    <button
                      ref={
                        nextButtonRef
                      }
                      type="button"
                      className="about-hero-next"
                      aria-label="Next leadership profile"
                    >
                      <FaArrowRight />
                    </button>
                  </>
                )}
              </div>
            ) : (
              <HeroFallback
                imageUrl={
                  content.imageUrl
                }
                imageAlt={
                  content.imageAlt
                }
              />
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

const HeroMediaSlide = ({
  slide,
  eager,
}) => {
  const image = (
    <picture>
      {slide.mobileImageUrl && (
        <source
          media="(max-width: 639px)"
          srcSet={resolveAssetUrl(
            slide.mobileImageUrl
          )}
        />
      )}

      <SmartImage
        src={resolveAssetUrl(
          slide.imageUrl
        )}
        alt={slide.imageAlt}
        loading={
          eager
            ? 'eager'
            : 'lazy'
        }
        fetchPriority={
          eager
            ? 'high'
            : 'auto'
        }
        className="about-hero-image"
        style={{
          objectPosition:
            slide.objectPosition,
        }}
      />
    </picture>
  );

  const content = (
    <>
      {image}

      <div
        className="about-hero-image-shade"
        aria-hidden="true"
      />

      {(slide.name ||
        slide.role) && (
        <div className="about-hero-leader-caption">
          {slide.name && (
            <p className="about-hero-leader-name">
              {slide.name}
            </p>
          )}

          {slide.role && (
            <p className="about-hero-leader-role">
              {slide.role}
            </p>
          )}
        </div>
      )}
    </>
  );

  return (
    <article className="about-hero-slide">
      {slide.to ? (
        <Link
          to={slide.to}
          className="about-hero-slide-link"
          aria-label={
            slide.name
              ? `View ${slide.name}'s profile`
              : 'View leadership profile'
          }
        >
          {content}
        </Link>
      ) : (
        content
      )}
    </article>
  );
};

const HeroFallback = ({
  imageUrl,
  imageAlt,
}) => (
  <div className="about-hero-fallback">
    {imageUrl ? (
      <SmartImage
        src={resolveAssetUrl(
          imageUrl
        )}
        alt={
          imageAlt ||
          'AngiSoft Technologies'
        }
        loading="eager"
        fetchPriority="high"
        className="about-hero-image"
      />
    ) : (
      <div className="about-hero-fallback-content">
        <span
          aria-hidden="true"
        />

        <p>
          AngiSoft Technologies
        </p>
      </div>
    )}
  </div>
);

export default AboutHeroSlider;