import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Link } from 'react-router-dom';

import {
  resolveAssetUrl,
} from '../../utils/constants';

import SmartImage from './SmartImage';

const normalizeItem = (
  item,
  index,
  prefix
) => ({
  id:
    item?.id ||
    `${prefix}-${index}`,

  title:
    item?.title ||
    item?.name ||
    '',

  caption:
    item?.caption ||
    item?.description ||
    '',

  logoUrl:
    item?.logoUrl ||
    item?.imageUrl ||
    '',

  imageAlt:
    item?.imageAlt ||
    `${item?.title || item?.name || 'Recognition'} logo`,

  to:
    item?.to ||
    item?.detailUrl ||
    '',

  externalUrl:
    item?.externalUrl ||
    item?.sourceUrl ||
    '',

  enabled:
    item?.enabled !== false &&
    item?.published !== false,

  verified:
    item?.verified !== false,
});

const AboutPartnerships = ({
  content = {},
}) => {
  const sectionRef = useRef(null);

  const [visible, setVisible] =
    useState(false);

  const data = useMemo(
    () => ({
      ...(content || {}),
    }),
    [content]
  );

  const featuredItems =
    useMemo(() => {
      const source =
        Array.isArray(
          data.featuredItems
        )
          ? data.featuredItems
          : [];

      return source
        .map((item, index) =>
          normalizeItem(
            item,
            index,
            'featured-recognition'
          )
        )
        .filter(
          (item) =>
            item.enabled &&
            item.verified &&
            item.title &&
            item.logoUrl
        )
        .slice(0, 2);
    }, [data.featuredItems]);

  const supportingItems =
    useMemo(() => {
      const source =
        Array.isArray(
          data.supportingItems
        )
          ? data.supportingItems
          : [];

      return source
        .map((item, index) =>
          normalizeItem(
            item,
            index,
            'supporting-recognition'
          )
        )
        .filter(
          (item) =>
            item.enabled &&
            item.verified &&
            item.title &&
            item.logoUrl
        )
        .slice(0, 6);
    }, [data.supportingItems]);

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
          threshold: 0.1,
        }
      );

    observer.observe(node);

    return () =>
      observer.disconnect();
  }, []);

  if (
    data.enabled === false ||
    (
      !featuredItems.length &&
      !supportingItems.length
    )
  ) {
    return null;
  }

  return (
    <section
      ref={sectionRef}
      id="about-partnerships"
      className="about-partnerships bg-[#07142B] py-14 md:py-16 lg:py-20"
      aria-labelledby="about-partnerships-heading"
    >
      <div className="container">
        <header
          className={`transition duration-700 ${
            visible
              ? 'translate-y-0 opacity-100'
              : 'translate-y-4 opacity-0'
          }`}
        >
          <h2
            id="about-partnerships-heading"
            className="text-base font-semibold leading-7 text-white md:text-lg"
          >
            {data.title}
          </h2>
        </header>

        <div
          className={`about-partnerships-board mt-6 transition duration-700 ${
            visible
              ? 'translate-y-0 opacity-100'
              : 'translate-y-5 opacity-0'
          }`}
          style={{
            transitionDelay: '100ms',
          }}
        >
          {featuredItems.length >
            0 && (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {featuredItems.map(
                (item, index) => (
                  <FeaturedRecognition
                    key={item.id}
                    item={item}
                    index={index}
                  />
                )
              )}
            </div>
          )}

          {supportingItems.length >
            0 && (
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-6">
              {supportingItems.map(
                (item, index) => (
                  <SupportingRecognition
                    key={item.id}
                    item={item}
                    index={index}
                  />
                )
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

const RecognitionWrapper = ({
  item,
  className,
  children,
}) => {
  if (item.externalUrl) {
    return (
      <a
        href={item.externalUrl}
        target="_blank"
        rel="noreferrer"
        className={className}
        aria-label={item.title}
      >
        {children}
      </a>
    );
  }

  if (item.to) {
    return (
      <Link
        to={item.to}
        className={className}
        aria-label={item.title}
      >
        {children}
      </Link>
    );
  }

  return (
    <div className={className}>
      {children}
    </div>
  );
};

const FeaturedRecognition = ({
  item,
}) => (
  <RecognitionWrapper
    item={item}
    className="about-featured-recognition group flex min-h-[190px] flex-col items-center justify-center border border-white/15 bg-[#0A1B38] px-6 py-7 text-center no-underline transition"
  >
    <div className="flex min-h-[92px] items-center justify-center">
      <SmartImage
        src={resolveAssetUrl(
          item.logoUrl
        )}
        alt={item.imageAlt}
        loading="lazy"
        className="about-recognition-logo max-h-[88px] max-w-[250px] object-contain"
      />
    </div>

    {item.caption && (
      <p className="mt-5 max-w-md text-xs leading-5 text-white/65">
        {item.caption}
      </p>
    )}
  </RecognitionWrapper>
);

const SupportingRecognition = ({
  item,
}) => (
  <RecognitionWrapper
    item={item}
    className="about-supporting-recognition group flex min-h-[105px] items-center justify-center border border-white/15 bg-[#0A1B38] px-4 py-5 no-underline transition"
  >
    <SmartImage
      src={resolveAssetUrl(
        item.logoUrl
      )}
      alt={item.imageAlt}
      loading="lazy"
      className="about-recognition-logo max-h-[58px] max-w-full object-contain"
    />
  </RecognitionWrapper>
);

export default AboutPartnerships;