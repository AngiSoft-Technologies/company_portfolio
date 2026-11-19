// @ts-nocheck
import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Link } from 'react-router-dom';
import { LuArrowRight, LuQuote } from 'react-icons/lu';;

import {
  resolveAssetUrl,
} from '@/lib/marketing/constants';

import SmartImage from './SmartImage';


const normalizeListItem = (
  item,
  index,
  prefix
) => {
  if (typeof item === 'string') {
    return {
      id:
        `${prefix}-${index}`,

      text:
        item,
    };
  }

  return {
    id:
      item?.id ||
      `${prefix}-${index}`,

    text:
      item?.text ||
      item?.title ||
      '',

    enabled:
      item?.enabled !== false,
  };
};

const AboutPricingQuotation = ({
  content = {},
}) => {
  const sectionRef =
    useRef(null);

  const [visible, setVisible] =
    useState(false);

  const data = useMemo(
    () => ({
      ...(content || {}),

      person: {
        ...(content?.person || {}),
      },

      cta: {
        ...(content?.cta || {}),
      },
    }),
    [content]
  );

  const businessInvestments =
    useMemo(
      () =>
        (
          Array.isArray(
            data.businessInvestments
          )
            ? data.businessInvestments
            : []
        )
          .map(
            (item, index) =>
              normalizeListItem(
                item,
                index,
                'business-investment'
              )
          )
          .filter(
            (item) =>
              item.enabled !== false &&
              item.text
          ),
      [data.businessInvestments]
    );

  const technicalInvestments =
    useMemo(
      () =>
        (
          Array.isArray(
            data.technicalInvestments
          )
            ? data.technicalInvestments
            : []
        )
          .map(
            (item, index) =>
              normalizeListItem(
                item,
                index,
                'technical-investment'
              )
          )
          .filter(
            (item) =>
              item.enabled !== false &&
              item.text
          ),
      [data.technicalInvestments]
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
    data.enabled === false ||
    !data.quote
  ) {
    return null;
  }

  return (
    <section
      ref={sectionRef}
      id="about-pricing-quotation"
      className="about-pricing-quotation bg-[var(--band-services)] py-16 md:py-20 lg:py-24"
    >
      <div className="container">
        {/* Compact quotation panel */}
        <div
          className={`about-pricing-quote-panel grid border border-[var(--border-light)] bg-[var(--card-bg)] transition duration-700 sm:grid-cols-[190px_1fr] md:grid-cols-[220px_1fr] ${
            visible
              ? 'translate-y-0 opacity-100'
              : 'translate-y-5 opacity-0'
          }`}
        >
          <div className="about-pricing-person border-b border-[var(--border-light)] p-4 sm:border-b-0 sm:border-r sm:p-5">
            <div className="about-pricing-person-image relative mx-auto aspect-[4/3] max-w-[190px] overflow-hidden bg-[var(--bg-secondary)] sm:aspect-[4/5]">
              {data.person?.imageUrl ? (
                <picture>
                  {data.person
                    .mobileImageUrl && (
                    <source
                      media="(max-width: 767px)"
                      srcSet={resolveAssetUrl(
                        data.person
                          .mobileImageUrl
                      )}
                    />
                  )}

                  <SmartImage
                    src={resolveAssetUrl(
                      data.person.imageUrl
                    )}
                    alt={
                      data.person.imageAlt ||
                      data.person.name
                    }
                    loading="lazy"
                    className="h-full w-full object-cover"
                    style={{
                      objectPosition:
                        data.person
                          .objectPosition ||
                        'center top',
                    }}
                  />
                </picture>
              ) : (
                <LeadershipFallback
                  name={
                    data.person?.name
                  }
                />
              )}
            </div>

            <div className="mt-4 text-center">
              <p className="text-sm font-bold text-[var(--text-primary)]">
                {data.person?.name}
              </p>

              {data.person?.role && (
                <p className="mt-1 text-xs text-[var(--text-secondary)]">
                  {data.person.role}
                </p>
              )}

              {data.person?.company && (
                <p className="mt-1 text-xs text-[var(--text-muted)]">
                  {data.person.company}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center px-6 py-8 md:px-10 md:py-9">
            <blockquote className="relative">
              <LuQuote
                className="absolute -left-1 -top-1 text-xl text-[var(--brand-accent-ink)]/45"
                aria-hidden="true"
              />

              <p className="pl-8 text-base leading-8 text-[var(--text-secondary)] md:text-lg text-pretty md:leading-8">
                {data.quote}
              </p>
            </blockquote>
          </div>
        </div>

        {/* Text below quotation */}
        <div
          className={`mt-10 max-w-none transition duration-700 ${
            visible
              ? 'translate-y-0 opacity-100'
              : 'translate-y-5 opacity-0'
          }`}
          style={{
            transitionDelay:
              '120ms',
          }}
        >
          {data.firstIntroduction && (
            <p className="text-base leading-8 text-[var(--text-secondary)] md:text-lg text-pretty">
              {data.firstIntroduction}
            </p>
          )}

          <InvestmentList
            items={businessInvestments}
          />

          {data.secondIntroduction && (
            <p className="mt-7 text-base leading-8 text-[var(--text-secondary)] md:text-lg text-pretty">
              {data.secondIntroduction}
            </p>
          )}

          <InvestmentList
            items={technicalInvestments}
          />

          {data.cta?.label &&
            data.cta?.to && (
              <Link
                to={data.cta.to}
                className="group mt-8 inline-flex items-center gap-3 text-sm font-semibold text-[var(--brand-accent-ink)] no-underline"
              >
                {data.cta.label}

                <LuArrowRight className="text-[10px] transition-transform group-hover:translate-x-1" />
              </Link>
            )}
        </div>
      </div>
    </section>
  );
};

const InvestmentList = ({
  items,
}) => {
  if (!items.length) {
    return null;
  }

  return (
    <ul className="mt-4 space-y-2.5">
      {items.map((item) => (
        <li
          key={item.id}
          className="flex items-start gap-2 text-sm leading-7 text-[var(--text-secondary)]"
        >
          <span
            className="mt-[11px] h-1.5 w-1.5 shrink-0 bg-[var(--color-secondary)]"
            aria-hidden="true"
          />

          <span>
            {item.text}
          </span>
        </li>
      ))}
    </ul>
  );
};

const LeadershipFallback = ({
  name,
}) => {
  const initials = String(
    name || 'AngiSoft'
  )
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

  return (
    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#0A1B38] via-[#0A3DFF]/20 to-[var(--bg-primary)]">
      <span className="flex h-20 w-20 items-center justify-center rounded-full border border-[#00C2FF]/30 bg-[color-mix(in_srgb,var(--brand-accent-ink)_10%,transparent)] text-2xl font-black text-[var(--brand-accent-ink)]">
        {initials}
      </span>
    </div>
  );
};

export default AboutPricingQuotation;