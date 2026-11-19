// @ts-nocheck
import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Link } from 'react-router-dom';
import { LuArrowRight, LuScale, LuCalculator, LuClipboardCheck, LuClock, LuNetwork, LuSearch, LuListChecks, LuUserCheck, LuUserCog } from 'react-icons/lu';;

const ICONS = {
  budget:
    LuSearch,

  control:
    LuScale,

  deadline:
    LuClock,

  delivery:
    LuListChecks,

  estimate:
    LuCalculator,

  requirements:
    LuClipboardCheck,

  risk:
    LuNetwork,

  scope:
    LuUserCog,

  team:
    LuUserCheck,
};

const normalizePractice = (
  practice,
  index
) => {
  if (typeof practice === 'string') {
    return {
      id:
        `project-success-${index}`,

      title:
        practice,

      description:
        '',

      icon:
        'requirements',

      to:
        '',

      enabled:
        true,
    };
  }

  return {
    id:
      practice?.id ||
      `project-success-${index}`,

    title:
      practice?.title ||
      practice?.name ||
      '',

    description:
      practice?.description ||
      practice?.text ||
      '',

    icon:
      practice?.icon ||
      'requirements',

    to:
      practice?.to ||
      practice?.href ||
      '',

    enabled:
      practice?.enabled !== false,
  };
};

const AboutWhyGuarantee = ({
  content = {},
}) => {
  const sectionRef =
    useRef(null);

  const [visible, setVisible] =
    useState(false);

  const data = useMemo(
    () => ({
      ...(content || {}),
    }),
    [content]
  );

  const introduction = useMemo(
    () =>
      (
        Array.isArray(
          data.introduction
        )
          ? data.introduction
          : []
      ).filter(Boolean),
    [data.introduction]
  );

  const practices = useMemo(() => {
    const source =
      Array.isArray(
        data.practices
      ) &&
      data.practices.length
        ? data.practices
        : [];

    return source
      .map(normalizePractice)
      .filter(
        (practice) =>
          practice.enabled &&
          practice.title
      );
  }, [data.practices]);

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
          threshold: 0.06,
        }
      );

    observer.observe(node);

    return () =>
      observer.disconnect();
  }, []);

  if (
    data.enabled === false ||
    !practices.length
  ) {
    return null;
  }

  return (
    <section
      ref={sectionRef}
      id="project-success-practices"
      className="about-project-success bg-[var(--bg-primary)] py-16 md:py-20 lg:py-24"
      aria-labelledby="project-success-heading"
    >
      <div className="container">
        <header
          className={`max-w-6xl transition duration-700 ${
            visible
              ? 'translate-y-0 opacity-100'
              : 'translate-y-5 opacity-0'
          }`}
        >
          <div className="relative inline-block">
            <span
              className="absolute -left-4 -top-4 h-14 w-14 bg-[color-mix(in_srgb,var(--color-primary)_15%,transparent)]"
              aria-hidden="true"
            />

            <h2
              id="project-success-heading"
              className="relative text-3xl font-bold leading-tight tracking-[-0.035em] text-[var(--text-primary)] md:text-4xl"
              style={{
                fontFamily:
                  'Sora, sans-serif',
              }}
            >
              {data.title}
            </h2>
          </div>

          {introduction.length > 0 && (
            <div className="mt-7 max-w-6xl space-y-4">
              {introduction.map(
                (
                  paragraph,
                  index
                ) => (
                  <p
                    key={index}
                    className="text-base leading-8 text-[var(--text-secondary)] md:text-lg text-pretty"
                  >
                    {paragraph}
                  </p>
                )
              )}
            </div>
          )}
        </header>

        <div className="mt-9 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
          {practices.map(
            (practice, index) => (
              <ProjectSuccessCard
                key={practice.id}
                practice={practice}
                index={index}
                visible={visible}
              />
            )
          )}
        </div>
      </div>
    </section>
  );
};

const ProjectSuccessCard = ({
  practice,
  index,
  visible,
}) => {
  const Icon =
    ICONS[practice.icon] ||
    LuClipboardCheck;

  const content = (
    <article className="about-project-success-card flex h-full min-h-[285px] flex-col border border-[var(--border-light)] bg-[var(--card-bg)] px-6 py-7">
      <div className="flex justify-center">
        <span className="flex h-14 w-14 items-center justify-center text-[var(--brand-accent-ink)]">
          <Icon
            className="text-[34px]"
            aria-hidden="true"
          />
        </span>
      </div>

      <h3 className="mt-5 text-center text-sm font-bold leading-6 text-[var(--text-primary)]">
        {practice.title}
      </h3>

      {practice.description && (
        <p className="mt-5 text-base leading-7 text-[var(--text-secondary)] text-pretty">
          {practice.description}
        </p>
      )}

      {practice.to && (
        <span className="mt-auto flex justify-end pt-6">
          <span className="inline-flex items-center gap-2 text-xs font-semibold text-[var(--brand-accent-ink)]">
            Details

            <LuArrowRight className="text-[9px] transition-transform duration-300 group-hover:translate-x-1" />
          </span>
        </span>
      )}
    </article>
  );

  const wrapperClass = `
    group block h-full no-underline
    transition duration-700
    focus-visible:outline-none
    focus-visible:ring-2
    focus-visible:ring-[#00C2FF]
    ${
      visible
        ? 'translate-y-0 opacity-100'
        : 'translate-y-6 opacity-0'
    }
  `;

  const style = {
    transitionDelay:
      `${90 + index * 55}ms`,
  };

  if (!practice.to) {
    return (
      <div
        className={wrapperClass}
        style={style}
      >
        {content}
      </div>
    );
  }

  return (
    <Link
      to={practice.to}
      className={wrapperClass}
      style={style}
      aria-label={`Details about ${practice.title}`}
    >
      {content}
    </Link>
  );
};

export default AboutWhyGuarantee;