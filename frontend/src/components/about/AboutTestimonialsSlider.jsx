import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Link } from 'react-router-dom';
import {
  Autoplay,
  Keyboard,
  Navigation,
} from 'swiper/modules';
import {
  Swiper,
  SwiperSlide,
} from 'swiper/react';
import {
  FaArrowLeft,
  FaArrowRight,
  FaExternalLinkAlt,
  FaPlay,
  FaShareAlt,
  FaStar,
} from 'react-icons/fa';

import 'swiper/css';
import 'swiper/css/navigation';

import {
  resolveAssetUrl,
} from '../../utils/constants';

import SmartImage from './SmartImage';

const normalizeTestimonial = (
  testimonial,
  index
) => {
  const client =
    testimonial?.client ||
    testimonial?.author ||
    {};

  const ratingValue = Number(
    testimonial?.rating ??
    testimonial?.stars ??
    5
  );

  return {
    id:
      testimonial?.id ||
      `testimonial-${index}`,

    type:
      testimonial?.type ||
      (
        testimonial?.youtubeId ||
          testimonial?.videoUrl
          ? 'video'
          : 'review'
      ),

    quote:
      testimonial?.quote ||
      testimonial?.review ||
      testimonial?.text ||
      testimonial?.content ||
      '',

    clientName:
      testimonial?.clientName ||
      testimonial?.name ||
      client?.name ||
      '',

    clientRole:
      testimonial?.clientRole ||
      testimonial?.role ||
      testimonial?.position ||
      client?.role ||
      '',

    company:
      testimonial?.company ||
      testimonial?.organization ||
      client?.company ||
      '',

    companyDescription:
      testimonial?.companyDescription ||
      testimonial?.organizationDescription ||
      '',

    rating:
      Number.isFinite(ratingValue)
        ? Math.min(
          Math.max(
            ratingValue,
            0
          ),
          5
        )
        : 5,

    avatarUrl:
      testimonial?.avatarUrl ||
      testimonial?.clientImageUrl ||
      client?.imageUrl ||
      '',

    logoUrl:
      testimonial?.logoUrl ||
      testimonial?.companyLogoUrl ||
      '',

    imageAlt:
      testimonial?.imageAlt ||
      testimonial?.clientName ||
      testimonial?.name ||
      'AngiSoft client testimonial',

    projectUrl:
      testimonial?.projectUrl ||
      testimonial?.caseStudyUrl ||
      testimonial?.to ||
      '',

    reviewUrl:
      testimonial?.reviewUrl ||
      testimonial?.sourceUrl ||
      '',

    shareUrl:
      testimonial?.shareUrl ||
      testimonial?.reviewUrl ||
      testimonial?.projectUrl ||
      '',

    youtubeId:
      testimonial?.youtubeId ||
      '',

    videoUrl:
      testimonial?.videoUrl ||
      '',

    videoThumbnail:
      testimonial?.videoThumbnail ||
      testimonial?.thumbnailUrl ||
      testimonial?.imageUrl ||
      '',

    videoTitle:
      testimonial?.videoTitle ||
      testimonial?.title ||
      testimonial?.clientName ||
      'Client testimonial',

    verified:
      testimonial?.verified === true,

    enabled:
      testimonial?.enabled !== false &&
      testimonial?.published !== false,
  };
};

const AboutTestimonialsSlider = ({
  testimonials = [],
  heading = {},
}) => {
  const sectionRef =
    useRef(null);

  const [visible, setVisible] =
    useState(false);

  const headingData = useMemo(
    () => ({
      ...(heading || {}),
    }),
    [heading]
  );

  const safeTestimonials =
    useMemo(
      () =>
        (
          Array.isArray(
            testimonials
          )
            ? testimonials
            : []
        )
          .map(
            normalizeTestimonial
          )
          .filter(
            (testimonial) =>
              testimonial.enabled &&
              (
                testimonial.quote ||
                testimonial.type ===
                'video'
              )
          ),
      [testimonials]
    );

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

    return () =>
      observer.disconnect();
  }, []);

  if (
    headingData.enabled === false ||
    !safeTestimonials.length
  ) {
    return null;
  }

  const hasMultiple =
    safeTestimonials.length > 1;

  return (
    <section
      ref={sectionRef}
      id="client-testimonials"
      className="about-testimonials bg-[#07142B] py-14 md:py-16 lg:py-20"
      aria-labelledby="about-testimonials-heading"
    >
      <div className="container">
        {(headingData.title ||
          headingData.description) && (
            <header
              className={`mb-9 max-w-4xl transition duration-700 ${visible
                ? 'translate-y-0 opacity-100'
                : 'translate-y-4 opacity-0'
                }`}
            >
              {headingData.title && (
                <h3
                  id="about-testimonials-heading"
                  className="text-3xl font-bold tracking-[-0.035em] text-white md:text-4xl"
                  style={{
                    fontFamily: 'Sora, sans-serif',
                  }}
                >
                  {headingData.title}
                </h3>
              )}

              {headingData.description && (
                <p className="mt-4 max-w-3xl text-sm leading-7 text-white/65 md:text-base">
                  {headingData.description}
                </p>
              )}
            </header>
          )}

        <div
          className={`about-testimonials-slider relative px-12 transition duration-700 sm:px-14 ${visible
              ? 'translate-y-0 opacity-100'
              : 'translate-y-5 opacity-0'
            }`}
          style={{
            transitionDelay: '100ms',
          }}
        >
          {hasMultiple && (
            <button
              type="button"
              className="about-testimonial-prev absolute left-0 top-1/2 z-30 flex h-10 w-10 -translate-y-1/2 items-center justify-center"
              aria-label="Previous testimonial"
            >
              <FaArrowLeft className="text-xs" />
            </button>
          )}

          <Swiper
            modules={[
              Autoplay,
              Keyboard,
              Navigation,
            ]}
            slidesPerView={1}
            spaceBetween={18}
            speed={650}
            loop={safeTestimonials.length > 3}
            keyboard={{
              enabled: true,
            }}
            autoplay={
              safeTestimonials.length > 3
                ? {
                  delay: 6500,
                  disableOnInteraction: false,
                  pauseOnMouseEnter: true,
                }
                : false
            }
            navigation={
              hasMultiple
                ? {
                  prevEl:
                    '.about-testimonial-prev',
                  nextEl:
                    '.about-testimonial-next',
                }
                : false
            }
            onBeforeInit={(swiper) => {
              if (!hasMultiple) {
                return;
              }

              swiper.params.navigation.prevEl =
                '.about-testimonial-prev';

              swiper.params.navigation.nextEl =
                '.about-testimonial-next';
            }}
            breakpoints={{
              640: {
                slidesPerView: 2,
                spaceBetween: 18,
              },

              900: {
                slidesPerView: 3,
                spaceBetween: 20,
              },
            }}
            className="about-testimonials-swiper"
          >
            {safeTestimonials.map(
              (testimonial, index) => (
                <SwiperSlide
                  key={testimonial.id}
                  className="!h-auto"
                >
                  {testimonial.type ===
                    'video' ? (
                    <VideoTestimonialCard
                      testimonial={
                        testimonial
                      }
                      index={index}
                    />
                  ) : (
                    <ReviewTestimonialCard
                      testimonial={
                        testimonial
                      }
                      index={index}
                    />
                  )}
                </SwiperSlide>
              )
            )}
          </Swiper>

          {hasMultiple && (
            <button
              type="button"
              className="about-testimonial-next absolute right-0 top-1/2 z-30 flex h-10 w-10 -translate-y-1/2 items-center justify-center"
              aria-label="Next testimonial"
            >
              <FaArrowRight className="text-xs" />
            </button>
          )}
        </div>
      </div>
    </section>
  );
};

const ReviewTestimonialCard = ({
  testimonial,
}) => (
  <article className="about-testimonial-card flex h-full min-h-[420px] flex-col bg-[#0A1B38] px-5 py-5 text-white">
    <div className="flex min-h-[48px] items-start justify-between gap-4">
      <div className="flex min-h-[42px] items-center">
        {testimonial.logoUrl ? (
          <SmartImage
            src={resolveAssetUrl(
              testimonial.logoUrl
            )}
            alt={
              testimonial.company
                ? `${testimonial.company} logo`
                : 'Client company logo'
            }
            loading="lazy"
            className="about-testimonial-logo max-h-10 max-w-[145px] object-contain"
          />
        ) : (
          <p className="text-sm font-black text-white">
            {testimonial.company ||
              testimonial.clientName}
          </p>
        )}
      </div>

      <Rating
        rating={testimonial.rating}
      />
    </div>

    {testimonial.companyDescription && (
      <p className="mt-3 border-b border-white/10 pb-4 text-xs leading-5 text-white/58">
        {testimonial.companyDescription}
      </p>
    )}

    <div className="mt-5 flex items-start gap-3">
      <ClientAvatar
        testimonial={testimonial}
      />

      <blockquote className="min-w-0 flex-1">
        <p className="text-sm leading-6 text-white/72">
          “{testimonial.quote}”
        </p>
      </blockquote>
    </div>

    <div className="mt-5 text-right">
      <p className="text-xs font-bold text-white">
        {testimonial.clientName}
      </p>

      {(testimonial.clientRole ||
        testimonial.company) && (
          <p className="mt-1 text-[11px] leading-5 text-white/48">
            {[
              testimonial.clientRole,
              testimonial.company,
            ]
              .filter(Boolean)
              .join(', ')}
          </p>
        )}
    </div>

    <div className="mt-auto flex items-center justify-between border-t border-white/10 pt-4">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        {testimonial.reviewUrl && (
          <a
            href={testimonial.reviewUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#00C2FF] no-underline"
          >
            Read review

            <FaExternalLinkAlt className="text-[7px]" />
          </a>
        )}

        {testimonial.projectUrl && (
          <Link
            to={testimonial.projectUrl}
            className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#00C2FF] no-underline"
          >
            View project

            <FaArrowRight className="text-[8px]" />
          </Link>
        )}
      </div>

      {testimonial.shareUrl && (
        <a
          href={testimonial.shareUrl}
          target="_blank"
          rel="noreferrer"
          className="flex h-7 w-7 items-center justify-center border-l border-white/10 text-[#00C2FF]"
          aria-label="Share testimonial"
        >
          <FaShareAlt className="text-[10px]" />
        </a>
      )}
    </div>
  </article>
);

const VideoTestimonialCard = ({
  testimonial,
}) => {
  const [playing, setPlaying] =
    useState(false);

  const youtubeId =
    testimonial.youtubeId;

  const youtubeWatchUrl =
    youtubeId
      ? `https://www.youtube.com/watch?v=${youtubeId}`
      : testimonial.videoUrl;

  const youtubeEmbedUrl =
    youtubeId
      ? `https://www.youtube-nocookie.com/embed/${youtubeId}?autoplay=1&rel=0&modestbranding=1`
      : '';

  const thumbnail =
    testimonial.videoThumbnail ||
    (
      youtubeId
        ? `https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`
        : ''
    );

  return (
    <article className="about-video-testimonial-card relative h-full min-h-[420px] overflow-hidden bg-[#0A1B38]">
      {playing &&
        youtubeEmbedUrl ? (
        <iframe
          src={youtubeEmbedUrl}
          title={
            testimonial.videoTitle
          }
          className="absolute inset-0 h-full w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
        />
      ) : (
        <>
          {thumbnail ? (
            <img
              src={thumbnail}
              alt={
                testimonial.imageAlt
              }
              loading="lazy"
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-[#0A3DFF] via-[#0A1B38] to-[#07142B]" />
          )}

          <div
            className="absolute inset-0 bg-gradient-to-t from-[#07142B]/95 via-[#07142B]/20 to-[#07142B]/45"
            aria-hidden="true"
          />

          <div className="absolute inset-x-0 top-0 p-5">
            <p className="max-w-[90%] text-sm font-bold leading-6 text-white">
              {
                testimonial.videoTitle
              }
            </p>

            {!testimonial.verified && (
              <p className="mt-2 text-[10px] font-bold uppercase tracking-[0.14em] text-[#00C2FF]">
                External layout demo
              </p>
            )}
          </div>

          {youtubeEmbedUrl && (
            <button
              type="button"
              onClick={() =>
                setPlaying(true)
              }
              className="absolute left-1/2 top-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-[#FF0000] text-white shadow-xl transition hover:scale-110"
              aria-label={`Play ${testimonial.videoTitle}`}
            >
              <FaPlay className="ml-1 text-xl" />
            </button>
          )}

          <div className="absolute inset-x-0 bottom-0 p-5">
            <p className="text-sm font-bold text-white">
              {
                testimonial.clientName
              }
            </p>

            {(testimonial.clientRole ||
              testimonial.company) && (
                <p className="mt-1 text-xs leading-5 text-white/65">
                  {[
                    testimonial.clientRole,
                    testimonial.company,
                  ]
                    .filter(Boolean)
                    .join(', ')}
                </p>
              )}

            {youtubeWatchUrl && (
              <a
                href={
                  youtubeWatchUrl
                }
                target="_blank"
                rel="noreferrer"
                className="mt-4 inline-flex items-center gap-2 text-[11px] font-semibold text-[#00C2FF]"
              >
                Watch on YouTube

                <FaExternalLinkAlt className="text-[8px]" />
              </a>
            )}
          </div>
        </>
      )}
    </article>
  );
};

const ClientAvatar = ({
  testimonial,
}) => {
  if (testimonial.avatarUrl) {
    return (
      <SmartImage
        src={resolveAssetUrl(
          testimonial.avatarUrl
        )}
        alt={testimonial.clientName}
        loading="lazy"
        className="h-9 w-9 shrink-0 rounded-full border border-[#00C2FF]/25 object-cover"
      />
    );
  }

  const initials =
    testimonial.clientName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((name) => name[0])
      .join('')
      .toUpperCase();

  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#00C2FF]/30 bg-[#00C2FF]/10 text-[10px] font-bold text-[#00C2FF]">
      {initials || 'AT'}
    </span>
  );
};

const Rating = ({
  rating,
}) => (
  <div
    className="flex shrink-0 items-center gap-1"
    aria-label={`${rating} out of 5 stars`}
  >
    {Array.from({
      length: 5,
    }).map((_, index) => (
      <FaStar
        key={index}
        className={`text-[9px] ${index <
            Math.round(rating)
            ? 'text-[#F4B400]'
            : 'text-white/15'
          }`}
      />
    ))}
  </div>
);

export default AboutTestimonialsSlider;