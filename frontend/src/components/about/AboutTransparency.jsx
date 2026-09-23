import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Link } from 'react-router-dom';
import {
  FaArrowRight,
  FaExternalLinkAlt,
  FaPlay,
} from 'react-icons/fa';


const normalizeLink = (
  item,
  index
) => ({
  id:
    item?.id ||
    `transparency-link-${index}`,

  label:
    item?.label ||
    item?.title ||
    '',

  to:
    item?.to ||
    item?.href ||
    '',

  external:
    item?.external === true ||
    /^https?:\/\//i.test(
      item?.to ||
      item?.href ||
      ''
    ),
});

const AboutTransparency = ({
  content = {},
}) => {
  const sectionRef = useRef(null);

  const [visible, setVisible] =
    useState(false);

  const [videoPlaying, setVideoPlaying] =
    useState(false);

  const data = useMemo(
    () => ({
      ...(content || {}),

      video: {
        ...(content?.video || {}),
      },
    }),
    [content]
  );

  const paragraphs = useMemo(() => {
    if (
      Array.isArray(data.paragraphs) &&
      data.paragraphs.length
    ) {
      return data.paragraphs.filter(Boolean);
    }

    if (data.description) {
      return [data.description];
    }

    return [];
  }, [
    data.paragraphs,
    data.description,
  ]);

  const links = useMemo(() => {
    const source =
      Array.isArray(data.links)
        ? data.links
        : [];

    return source
      .map(normalizeLink)
      .filter(
        (item) =>
          item.label &&
          item.to
      );
  }, [data.links]);

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
          threshold: 0.12,
        }
      );

    observer.observe(node);

    return () =>
      observer.disconnect();
  }, []);

  if (
    data.enabled === false ||
    (
      !data.title &&
      !paragraphs.length
    )
  ) {
    return null;
  }

  const youtubeId =
    data.video?.youtubeId;

  const youtubeWatchUrl =
    youtubeId
      ? `https://www.youtube.com/watch?v=${youtubeId}`
      : '';

  const youtubeEmbedUrl =
    youtubeId
      ? `https://www.youtube-nocookie.com/embed/${youtubeId}?autoplay=1&rel=0&modestbranding=1`
      : '';

  const thumbnailUrl =
    data.video?.thumbnailUrl ||
    (
      youtubeId
        ? `https://i.ytimg.com/vi/${youtubeId}/maxresdefault.jpg`
        : ''
    );

  return (
    <section
      ref={sectionRef}
      id="building-trust-with-transparency"
      className="about-transparency bg-[#07142B] py-16 md:py-20 lg:py-24"
      aria-labelledby="about-transparency-heading"
    >
      <div className="container">
        <div className="grid items-center gap-10 md:grid-cols-[1fr_1.05fr] lg:gap-14">
          {/* Video — left, matching the mirror */}
          <div
            className={`transition duration-700 ${
              visible
                ? 'translate-x-0 opacity-100'
                : '-translate-x-6 opacity-0'
            }`}
          >
            <div className="about-transparency-video relative aspect-video overflow-hidden bg-black">
              {videoPlaying &&
              youtubeEmbedUrl ? (
                <iframe
                  src={youtubeEmbedUrl}
                  title={
                    data.video?.title ||
                    'Technology partner video'
                  }
                  className="absolute inset-0 h-full w-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              ) : (
                <button
                  type="button"
                  onClick={() =>
                    setVideoPlaying(true)
                  }
                  className="group absolute inset-0 h-full w-full overflow-hidden text-left"
                  aria-label={`Play ${
                    data.video?.title ||
                    'video'
                  }`}
                >
                  {thumbnailUrl && (
                    <img
                      src={thumbnailUrl}
                      alt=""
                      loading="lazy"
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                  )}

                  <span
                    className="absolute inset-0 bg-gradient-to-r from-black/78 via-black/38 to-black/10"
                    aria-hidden="true"
                  />

                  <span
                    className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-black/10"
                    aria-hidden="true"
                  />

                  {/* Overlay text like the reference thumbnail */}
                  <span className="absolute left-5 top-5 max-w-[72%] md:left-6 md:top-6">
                    <span className="inline box-decoration-clone bg-[#FFD632] px-2 py-1 text-lg font-black uppercase leading-[1.4] text-[#07142B] sm:text-xl lg:text-2xl">
                      {data.video
                        ?.overlayTitle}
                    </span>

                    {data.video
                      ?.overlaySubtitle && (
                      <span className="mt-3 block max-w-sm text-xs font-semibold uppercase tracking-[0.12em] text-white/88 sm:text-sm">
                        {
                          data.video
                            .overlaySubtitle
                        }
                      </span>
                    )}
                  </span>

                  <span className="absolute left-1/2 top-1/2 flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-[#FF0000] text-white shadow-xl transition duration-300 group-hover:scale-110 sm:h-16 sm:w-16">
                    <FaPlay className="ml-1 text-lg" />
                  </span>

                  <span className="absolute bottom-4 left-5 text-xs font-bold text-white/85">
                    AngiSoft Technologies
                  </span>
                </button>
              )}
            </div>

            {youtubeWatchUrl && (
              <a
                href={youtubeWatchUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-flex items-center gap-2 text-xs font-semibold text-[#00C2FF] no-underline"
              >
                Watch on YouTube

                <FaExternalLinkAlt className="text-[8px]" />
              </a>
            )}
          </div>

          {/* Copy — right */}
          <div
            className={`transition duration-700 ${
              visible
                ? 'translate-x-0 opacity-100'
                : 'translate-x-6 opacity-0'
            }`}
            style={{
              transitionDelay:
                '100ms',
            }}
          >
            <h2
              id="about-transparency-heading"
              className="text-3xl font-bold leading-tight tracking-[-0.035em] text-white md:text-4xl"
              style={{
                fontFamily:
                  'Sora, sans-serif',
              }}
            >
              {data.title}
            </h2>

            <div className="mt-6 space-y-4">
              {paragraphs.map(
                (paragraph, index) => (
                  <p
                    key={index}
                    className="text-sm leading-7 text-white/65 md:text-base"
                  >
                    {paragraph}
                  </p>
                )
              )}
            </div>

            {links.length > 0 && (
              <div className="mt-7 flex flex-wrap gap-x-6 gap-y-3">
                {links.map((link) =>
                  link.external ? (
                    <a
                      key={link.id}
                      href={link.to}
                      target="_blank"
                      rel="noreferrer"
                      className="group inline-flex items-center gap-2 text-xs font-semibold text-[#00C2FF] no-underline"
                    >
                      {link.label}

                      <FaExternalLinkAlt className="text-[8px]" />
                    </a>
                  ) : (
                    <Link
                      key={link.id}
                      to={link.to}
                      className="group inline-flex items-center gap-2 text-xs font-semibold text-[#00C2FF] no-underline"
                    >
                      {link.label}

                      <FaArrowRight className="text-[9px] transition-transform group-hover:translate-x-1" />
                    </Link>
                  )
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default AboutTransparency;