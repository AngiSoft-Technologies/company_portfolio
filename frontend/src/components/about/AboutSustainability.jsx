import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Link } from 'react-router-dom';
import {
  FaArrowRight,
  FaDownload,
} from 'react-icons/fa';

import {
  resolveAssetUrl,
} from '../../utils/constants';

const AboutSustainability = ({
  content = {},
}) => {
  const sectionRef =
    useRef(null);

  const [visible, setVisible] =
    useState(false);

  const data = useMemo(
    () => ({
      ...(content || {}),

      link: {
        ...((content && content.link) || {}),
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
          threshold: 0.15,
        }
      );

    observer.observe(node);

    return () => {
      observer.disconnect();
    };
  }, []);

  if (
    data.enabled === false ||
    (
      !data.title &&
      !data.description
    )
  ) {
    return null;
  }

  const isDownload =
    data.link?.type ===
    'download';

  const hasLink =
    data.link?.label &&
    data.link?.to;

  return (
    <section
      ref={sectionRef}
      id="about-sustainability"
      className="about-sustainability bg-[#07142B] py-12 md:py-14 lg:py-16"
      aria-labelledby="about-sustainability-heading"
    >
      <div className="container">
        <div
          className={`about-sustainability-panel transition duration-700 ${
            visible
              ? 'translate-y-0 opacity-100'
              : 'translate-y-4 opacity-0'
          }`}
        >
          <div className="about-sustainability-copy">
            <h2
              id="about-sustainability-heading"
              className="about-sustainability-title"
            >
              {data.title}
            </h2>

            {data.description && (
              <p className="about-sustainability-description">
                {data.description}
              </p>
            )}
          </div>

          {hasLink && (
            <div className="about-sustainability-action">
              {isDownload ? (
                <a
                  href={resolveAssetUrl(
                    data.link.to
                  )}
                  download
                  className="about-sustainability-button"
                >
                  <FaDownload
                    aria-hidden="true"
                  />

                  <span>
                    {data.link.label}
                  </span>
                </a>
              ) : (
                <Link
                  to={data.link.to}
                  className="about-sustainability-button"
                >
                  <span>
                    {data.link.label}
                  </span>

                  <FaArrowRight
                    aria-hidden="true"
                  />
                </Link>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default AboutSustainability;