import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Link } from 'react-router-dom';
import {
  FaArrowRight,
  FaEnvelope,
  FaPhoneAlt,
  FaWhatsapp,
} from 'react-icons/fa';

import {
  resolveAssetUrl,
} from '../../utils/constants';

import SmartImage from './SmartImage';


const AboutFinalCTA = ({
  content = {},
}) => {
  const sectionRef =
    useRef(null);

  const [visible, setVisible] =
    useState(false);

  const data = useMemo(
    () => ({
      ...(content || {}),

      primaryCta: {
        ...(content?.primaryCta || {}),
      },

      secondaryCta: {
        ...(content?.secondaryCta || {}),
      },

      contact: {
        ...(content?.contact || {}),
      },
    }),
    [content]
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
          threshold: 0.12,
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
    !data.description
  ) {
    return null;
  }

  const phoneHref =
    data.contact?.phone
      ? `tel:${String(
          data.contact.phone
        ).replace(/[^\d+]/g, '')}`
      : '';

  const emailHref =
    data.contact?.email
      ? `mailto:${data.contact.email}`
      : '';

  const whatsappNumber =
    data.contact?.whatsapp
      ? String(
          data.contact.whatsapp
        ).replace(/\D/g, '')
      : '';

  const whatsappUrl =
    whatsappNumber
      ? `https://wa.me/${whatsappNumber}${
          data.contact
            ?.whatsappMessage
            ? `?text=${encodeURIComponent(
                data.contact
                  .whatsappMessage
              )}`
            : ''
        }`
      : '';

  return (
    <section
      ref={sectionRef}
      id="about-final-cta"
      className="about-final-cta"
      aria-labelledby="about-final-cta-heading"
    >
      <div className="container">
        <div
          className={`about-final-cta-shell ${
            visible
              ? 'is-visible'
              : ''
          }`}
        >
          <div className="about-final-cta-copy">
            {data.eyebrow && (
              <p className="about-final-cta-eyebrow">
                {data.eyebrow}
              </p>
            )}

            <h2
              id="about-final-cta-heading"
              className="about-final-cta-title"
            >
              {data.title}
            </h2>

            {data.description && (
              <p className="about-final-cta-description">
                {data.description}
              </p>
            )}

            <div className="about-final-cta-actions">
              {data.primaryCta?.label &&
                data.primaryCta?.to && (
                  <Link
                    to={
                      data.primaryCta.to
                    }
                    className="about-final-cta-primary"
                  >
                    <span>
                      {
                        data.primaryCta
                          .label
                      }
                    </span>

                    <FaArrowRight
                      aria-hidden="true"
                    />
                  </Link>
                )}

              {data.secondaryCta
                ?.label &&
                data.secondaryCta
                  ?.to && (
                  <Link
                    to={
                      data.secondaryCta
                        .to
                    }
                    className="about-final-cta-secondary"
                  >
                    <span>
                      {
                        data.secondaryCta
                          .label
                      }
                    </span>

                    <FaArrowRight
                      aria-hidden="true"
                    />
                  </Link>
                )}
            </div>

            <div className="about-final-cta-contact">
              {phoneHref && (
                <a
                  href={phoneHref}
                  className="about-final-contact-link"
                >
                  <span className="about-final-contact-icon">
                    <FaPhoneAlt />
                  </span>

                  <span>
                    {data.contact
                      .phoneLabel ||
                      data.contact.phone}
                  </span>
                </a>
              )}

              {emailHref && (
                <a
                  href={emailHref}
                  className="about-final-contact-link"
                >
                  <span className="about-final-contact-icon">
                    <FaEnvelope />
                  </span>

                  <span>
                    {
                      data.contact
                        .email
                    }
                  </span>
                </a>
              )}

              {whatsappUrl && (
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="about-final-contact-link is-whatsapp"
                >
                  <span className="about-final-contact-icon">
                    <FaWhatsapp />
                  </span>

                  <span>
                    WhatsApp AngiSoft
                  </span>
                </a>
              )}
            </div>

            {data.reassurance && (
              <p className="about-final-cta-reassurance">
                {data.reassurance}
              </p>
            )}
          </div>

          <div className="about-final-cta-media">
            {data.imageUrl ? (
              <picture>
                {data.mobileImageUrl && (
                  <source
                    media="(max-width: 639px)"
                    srcSet={resolveAssetUrl(
                      data.mobileImageUrl
                    )}
                  />
                )}

                <SmartImage
                  src={resolveAssetUrl(
                    data.imageUrl
                  )}
                  alt={
                    data.imageAlt ||
                    data.title
                  }
                  loading="lazy"
                  className="about-final-cta-image"
                  style={{
                    objectPosition:
                      data.objectPosition ||
                      'center',
                  }}
                />
              </picture>
            ) : (
              <FinalCtaFallback />
            )}

            <div
              className="about-final-cta-media-overlay"
              aria-hidden="true"
            />

            <div className="about-final-cta-media-label">
              <span>
                AngiSoft Technologies
              </span>

              <strong>
                Powering your digital
                world
              </strong>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

const FinalCtaFallback = () => (
  <div className="about-final-cta-fallback">
    <div
      aria-hidden="true"
      className="about-final-cta-fallback-grid"
    />

    <p>
      Innovate • Build • Empower
    </p>
  </div>
);

export default AboutFinalCTA;