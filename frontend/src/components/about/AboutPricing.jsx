import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Link } from 'react-router-dom';
import { FaArrowRight } from 'react-icons/fa';

const normalizeModel = (
  model,
  index
) => {
  if (typeof model === 'string') {
    return {
      id:
        `pricing-model-${index}`,

      title:
        model,

      description:
        '',

      enabled:
        true,
    };
  }

  return {
    id:
      model?.id ||
      `pricing-model-${index}`,

    title:
      model?.title ||
      model?.name ||
      '',

    description:
      model?.description ||
      model?.text ||
      '',

    enabled:
      model?.enabled !== false,
  };
};

const AboutPricing = ({
  pricing = {},
}) => {
  const sectionRef =
    useRef(null);

  const [visible, setVisible] =
    useState(false);

  const data = useMemo(
    () => ({
      ...(pricing || {}),

      cta: {
        ...(pricing?.cta || {}),
      },
    }),
    [pricing]
  );

  const models = useMemo(() => {
    const source =
      Array.isArray(data.models) &&
      data.models.length
        ? data.models
        : [];

    return source
      .map(normalizeModel)
      .filter(
        (model) =>
          model.enabled &&
          model.title
      );
  }, [data.models]);

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
    !models.length
  ) {
    return null;
  }

  return (
    <section
      ref={sectionRef}
      id="about-pricing-policy"
      className="about-pricing bg-[#07142B] py-16 md:py-20 lg:py-24"
      aria-labelledby="about-pricing-heading"
    >
      <div className="container">
        <header
          className={`max-w-5xl transition duration-700 ${
            visible
              ? 'translate-y-0 opacity-100'
              : 'translate-y-5 opacity-0'
          }`}
        >
          <div className="relative inline-block">
            <span
              className="absolute -left-4 -top-4 h-14 w-14 bg-[#0A3DFF]/15"
              aria-hidden="true"
            />

            <h2
              id="about-pricing-heading"
              className="relative text-3xl font-bold leading-tight tracking-[-0.035em] text-white md:text-4xl"
              style={{
                fontFamily:
                  'Sora, sans-serif',
              }}
            >
              {data.title}
            </h2>
          </div>

          {data.description && (
            <p className="mt-7 max-w-4xl text-sm leading-7 text-white/65 md:text-base">
              {data.description}
            </p>
          )}
        </header>

        <div className="mt-9 grid grid-cols-1 gap-x-8 gap-y-8 sm:grid-cols-2 md:grid-cols-4">
          {models.map(
            (model, index) => (
              <PricingModel
                key={model.id}
                model={model}
                index={index}
                visible={visible}
              />
            )
          )}
        </div>

        {data.cta?.label &&
          data.cta?.to && (
            <div
              className={`mt-10 flex justify-center transition duration-700 ${
                visible
                  ? 'translate-y-0 opacity-100'
                  : 'translate-y-4 opacity-0'
              }`}
              style={{
                transitionDelay:
                  '300ms',
              }}
            >
              <Link
                to={data.cta.to}
                className="group inline-flex min-h-12 items-center justify-center gap-3 bg-[#0A3DFF] px-7 py-3.5 text-sm font-bold text-white no-underline transition hover:bg-[#3B6FFF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00C2FF]"
              >
                {data.cta.label}

                <FaArrowRight className="text-xs transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
            </div>
          )}
      </div>
    </section>
  );
};

const PricingModel = ({
  model,
  index,
  visible,
}) => (
  <article
    className={`about-pricing-model min-w-0 transition duration-700 ${
      visible
        ? 'translate-y-0 opacity-100'
        : 'translate-y-5 opacity-0'
    }`}
    style={{
      transitionDelay:
        `${80 + index * 60}ms`,
    }}
  >
    <h3 className="text-sm font-bold leading-6 text-white">
      {model.title}
    </h3>

    {model.description && (
      <p className="mt-3 text-sm leading-7 text-white/60">
        {model.description}
      </p>
    )}
  </article>
);

export default AboutPricing;