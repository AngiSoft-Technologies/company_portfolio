import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Link } from 'react-router-dom';
import {
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
} from 'react-icons/fa';

import 'swiper/css';
import 'swiper/css/navigation';

import {
  resolveAssetUrl,
} from '../../utils/constants';

import SmartImage from './SmartImage';

const normalizeClient = (
  client,
  index
) => ({
  id:
    client?.id ||
    `about-client-${index}`,

  name:
    client?.name ||
    client?.title ||
    '',

  logoUrl:
    client?.logoUrl ||
    client?.imageUrl ||
    '',

  logoAlt:
    client?.logoAlt ||
    `${client?.name || client?.title || 'Client'} logo`,

  websiteUrl:
    client?.websiteUrl ||
    client?.url ||
    '',

  projectUrl:
    client?.projectUrl ||
    client?.to ||
    '',

  approved:
    client?.approved === true,

  featured:
    client?.featured !== false,
});

const normalizeMarket = (
  market,
  index
) => {
  if (typeof market === 'string') {
    return {
      id:
        `target-market-${index}`,

      title:
        market,
    };
  }

  return {
    id:
      market?.id ||
      `target-market-${index}`,

    title:
      market?.title ||
      market?.name ||
      '',
  };
};

const AboutClientsSlider = ({
  clients = [],
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

  const safeClients = useMemo(
    () =>
      (
        Array.isArray(clients)
          ? clients
          : []
      )
        .map(normalizeClient)
        .filter(
          (client) =>
            client.approved &&
            client.featured &&
            client.name &&
            client.logoUrl
        ),
    [clients]
  );

  const targetMarkets = useMemo(
    () =>
      (
        Array.isArray(
          headingData.targetMarkets
        )
          ? headingData.targetMarkets
          : []
      )
        .map(normalizeMarket)
        .filter(
          (market) =>
            market.title
        ),
    [headingData.targetMarkets]
  );

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
          threshold: 0.1,
        }
      );

    observer.observe(node);

    return () =>
      observer.disconnect();
  }, []);

  if (
    headingData.enabled === false ||
    (
      !safeClients.length &&
      !targetMarkets.length
    )
  ) {
    return null;
  }

  const hasMultipleClients =
    safeClients.length > 1;

  return (
    <section
      ref={sectionRef}
      id="about-clients"
      className="about-clients bg-[#07142B] py-14 md:py-16 lg:py-20"
      aria-labelledby="about-clients-heading"
    >
      <div className="container">
        <header
          className={`max-w-5xl transition duration-700 ${
            visible
              ? 'translate-y-0 opacity-100'
              : 'translate-y-4 opacity-0'
          }`}
        >
          <div className="relative inline-block">
            <span
              className="absolute -left-4 -top-4 h-14 w-14 bg-[#0A3DFF]/15"
              aria-hidden="true"
            />

            <h2
              id="about-clients-heading"
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
            <p className="mt-7 max-w-5xl text-sm leading-7 text-white/65 md:text-base">
              {headingData.description}
            </p>
          )}
        </header>

        {safeClients.length > 0 && (
          <div
            className={`about-clients-slider-wrap relative mt-9 transition duration-700 ${
              visible
                ? 'translate-y-0 opacity-100'
                : 'translate-y-5 opacity-0'
            }`}
            style={{
              transitionDelay:
                '100ms',
            }}
          >
            {hasMultipleClients && (
              <button
                type="button"
                className="about-client-prev absolute left-0 top-1/2 z-10 flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center border border-white/15 bg-[#0A1B38] text-white transition hover:border-[#00C2FF] hover:text-[#00C2FF] max-md:left-2 max-md:translate-x-0"
                aria-label="Previous clients"
              >
                <FaArrowLeft className="text-[10px]" />
              </button>
            )}

            <Swiper
              modules={[
                Keyboard,
                Navigation,
              ]}
              slidesPerView={2}
              spaceBetween={0}
              keyboard={{
                enabled: true,
              }}
              navigation={
                hasMultipleClients
                  ? {
                      previousEl:
                        '.about-client-prev',

                      nextEl:
                        '.about-client-next',
                    }
                  : false
              }
              onBeforeInit={(swiper) => {
                if (
                  !hasMultipleClients
                ) {
                  return;
                }

                swiper.params.navigation.prevEl =
                  '.about-client-prev';

                swiper.params.navigation.nextEl =
                  '.about-client-next';
              }}
              breakpoints={{
                480: {
                  slidesPerView: 2.5,
                },

                640: {
                  slidesPerView: 3,
                },

                768: {
                  slidesPerView: 4,
                },

                1024: {
                  slidesPerView: 6,
                },
              }}
              className="about-clients-swiper border-l border-t border-white/12"
            >
              {safeClients.map(
                (client) => (
                  <SwiperSlide
                    key={client.id}
                    className="!h-auto"
                  >
                    <ClientLogoItem
                      client={client}
                    />
                  </SwiperSlide>
                )
              )}
            </Swiper>

            {hasMultipleClients && (
              <button
                type="button"
                className="about-client-next absolute right-0 top-1/2 z-10 flex h-9 w-9 translate-x-1/2 -translate-y-1/2 items-center justify-center border border-white/15 bg-[#0A1B38] text-white transition hover:border-[#00C2FF] hover:text-[#00C2FF] max-md:right-2 max-md:translate-x-0"
                aria-label="Next clients"
              >
                <FaArrowRight className="text-[10px]" />
              </button>
            )}
          </div>
        )}

        {targetMarkets.length > 0 && (
          <div
            className={`mt-9 border-t border-white/10 pt-7 transition duration-700 ${
              visible
                ? 'translate-y-0 opacity-100'
                : 'translate-y-4 opacity-0'
            }`}
            style={{
              transitionDelay:
                '180ms',
            }}
          >
            {headingData.targetMarketLabel && (
              <p className="text-sm font-semibold text-white/75">
                {
                  headingData
                    .targetMarketLabel
                }
              </p>
            )}

            <div className="mt-4 flex flex-wrap gap-2.5">
              {targetMarkets.map(
                (market) => (
                  <span
                    key={market.id}
                    className="about-target-market inline-flex items-center border border-white/12 bg-white/[0.025] px-4 py-2 text-xs font-semibold text-white/68"
                  >
                    {market.title}
                  </span>
                )
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

const ClientLogoItem = ({
  client,
}) => {
  const content = (
    <div className="about-client-logo-inner flex min-h-[105px] items-center justify-center px-5 py-6 sm:min-h-[120px]">
      <SmartImage
        src={resolveAssetUrl(
          client.logoUrl
        )}
        alt={client.logoAlt}
        loading="lazy"
        className="about-client-logo max-h-14 w-auto max-w-[135px] object-contain sm:max-h-16"
      />
    </div>
  );

  const className =
    'about-client-logo-item group block h-full border-b border-r border-white/12 bg-[#0A1B38] no-underline transition';

  if (client.projectUrl) {
    return (
      <Link
        to={client.projectUrl}
        className={className}
        aria-label={`View AngiSoft work for ${client.name}`}
      >
        {content}
      </Link>
    );
  }

  if (client.websiteUrl) {
    return (
      <a
        href={client.websiteUrl}
        target="_blank"
        rel="noreferrer"
        className={className}
        aria-label={`Visit ${client.name}`}
      >
        {content}
      </a>
    );
  }

  return (
    <div
      className={className}
      title={client.name}
    >
      {content}
    </div>
  );
};

export default AboutClientsSlider;