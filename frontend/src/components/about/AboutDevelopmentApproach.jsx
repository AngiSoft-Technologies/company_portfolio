import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Link } from 'react-router-dom';
import {
  FaArrowRight,
  FaCheck,
} from 'react-icons/fa';

import { resolveAssetUrl } from '../../utils/constants';
import SmartImage from './SmartImage';

const DEFAULT_CONTENT = {
  enabled: true,

  eyebrow:
    'From Idea to Working Solution',

  title:
    'Our Development Approach',

  description:
    'We move from understanding the real need to planning, implementation, validation, launch and continued improvement.',

  autoplay:
    true,

  autoplayDelay:
    6500,

  stages: [
    {
      id:
        'discovery',

      number:
        '01',

      title:
        'Discovery',

      shortTitle:
        'Discover',

      description:
        'We begin by understanding the problem, intended users, current process, business goals, constraints and expected outcome.',

      imageUrl:
        '/uploads/public/images/about/development-approach/discovery.webp',

      imageAlt:
        'AngiSoft project discovery and requirements discussion',

      points: [
        'Understand the business problem',
        'Identify users and stakeholders',
        'Review current processes and systems',
        'Clarify priorities, risks and constraints',
      ],

      accent:
        '#0A3DFF',
    },

    {
      id:
        'planning',

      number:
        '02',

      title:
        'Planning and Architecture',

      shortTitle:
        'Plan',

      description:
        'We convert the requirements into a workable scope, delivery plan, technical structure and prioritized implementation path.',

      imageUrl:
        '/uploads/public/images/about/development-approach/planning.webp',

      imageAlt:
        'AngiSoft project planning and software architecture',

      points: [
        'Define the project scope',
        'Break work into milestones',
        'Select suitable technologies',
        'Plan data, integrations and permissions',
      ],

      accent:
        '#00C2FF',
    },

    {
      id:
        'design',

      number:
        '03',

      title:
        'Experience and Interface Design',

      shortTitle:
        'Design',

      description:
        'We organize workflows and interfaces around the people who will actually use the system.',

      imageUrl:
        '/uploads/public/images/about/development-approach/design.webp',

      imageAlt:
        'AngiSoft user experience and interface design',

      points: [
        'Map user journeys',
        'Structure pages and workflows',
        'Create responsive interfaces',
        'Align the experience with the brand',
      ],

      accent:
        '#39FF6A',
    },

    {
      id:
        'development',

      number:
        '04',

      title:
        'Development',

      shortTitle:
        'Build',

      description:
        'We implement the approved solution using maintainable code, structured data and secure application workflows.',

      imageUrl:
        '/uploads/public/images/about/development-approach/development.webp',

      imageAlt:
        'AngiSoft software development and implementation',

      points: [
        'Build backend and database logic',
        'Implement web or mobile interfaces',
        'Connect APIs and external services',
        'Apply authentication and permissions',
      ],

      accent:
        '#8A2BE2',
    },

    {
      id:
        'testing',

      number:
        '05',

      title:
        'Testing and Validation',

      shortTitle:
        'Validate',

      description:
        'We check whether the solution works correctly, protects data and supports the intended workflows before release.',

      imageUrl:
        '/uploads/public/images/about/development-approach/testing.webp',

      imageAlt:
        'AngiSoft software testing and workflow validation',

      points: [
        'Test complete user workflows',
        'Validate data and permissions',
        'Check responsive behavior',
        'Resolve defects and usability issues',
      ],

      accent:
        '#FF9F1C',
    },

    {
      id:
        'launch',

      number:
        '06',

      title:
        'Launch and Adoption',

      shortTitle:
        'Launch',

      description:
        'We deploy the solution, verify the live environment and help the intended users begin working with it.',

      imageUrl:
        '/uploads/public/images/about/development-approach/launch.webp',

      imageAlt:
        'AngiSoft software deployment and launch',

      points: [
        'Configure the production environment',
        'Deploy and verify the application',
        'Support data setup or migration',
        'Guide administrators and users',
      ],

      accent:
        '#00C2FF',
    },

    {
      id:
        'support',

      number:
        '07',

      title:
        'Support and Improvement',

      shortTitle:
        'Improve',

      description:
        'After launch, we help address issues, monitor real usage and improve the solution as requirements evolve.',

      imageUrl:
        '/uploads/public/images/about/development-approach/support.webp',

      imageAlt:
        'AngiSoft software support and continuous improvement',

      points: [
        'Resolve production issues',
        'Review user feedback',
        'Improve performance and usability',
        'Plan new features and upgrades',
      ],

      accent:
        '#39FF6A',
    },
  ],

  cta: {
    label:
      'Discuss Your Project',

    to:
      '/booking',
  },
};

const ACCENTS = [
  '#0A3DFF',
  '#00C2FF',
  '#39FF6A',
  '#8A2BE2',
  '#FF9F1C',
];

const normalizePoint = (
  point,
  index
) => {
  if (typeof point === 'string') {
    return {
      id:
        `approach-point-${index}`,

      text:
        point,
    };
  }

  return {
    id:
      point?.id ||
      `approach-point-${index}`,

    text:
      point?.text ||
      point?.title ||
      '',
  };
};

const normalizeStage = (
  stage,
  index
) => ({
  id:
    stage?.id ||
    `development-stage-${index}`,

  number:
    stage?.number ||
    String(index + 1).padStart(
      2,
      '0'
    ),

  title:
    stage?.title ||
    stage?.name ||
    '',

  shortTitle:
    stage?.shortTitle ||
    stage?.title ||
    stage?.name ||
    '',

  description:
    stage?.description ||
    stage?.text ||
    '',

  imageUrl:
    stage?.imageUrl ||
    '',

  mobileImageUrl:
    stage?.mobileImageUrl ||
    '',

  imageAlt:
    stage?.imageAlt ||
    `${stage?.title || stage?.name || 'Development stage'} illustration`,

  objectPosition:
    stage?.objectPosition ||
    'center',

  points:
    (
      Array.isArray(stage?.points)
        ? stage.points
        : Array.isArray(
            stage?.items
          )
          ? stage.items
          : []
    )
      .map(normalizePoint)
      .filter((point) => point.text),

  accent:
    stage?.accent ||
    ACCENTS[
      index % ACCENTS.length
    ],

  enabled:
    stage?.enabled !== false,
});

const AboutDevelopmentApproach = ({
  content = {},
}) => {
  const sectionRef =
    useRef(null);

  const [visible, setVisible] =
    useState(false);

  const [
    activeIndex,
    setActiveIndex,
  ] = useState(0);

  const [
    userPaused,
    setUserPaused,
  ] = useState(false);

  const data = useMemo(
    () => ({
      ...DEFAULT_CONTENT,
      ...(content || {}),

      cta: {
        ...DEFAULT_CONTENT.cta,
        ...(content?.cta || {}),
      },
    }),
    [content]
  );

  const stages = useMemo(() => {
    const source =
      Array.isArray(data.stages) &&
      data.stages.length
        ? data.stages
        : DEFAULT_CONTENT.stages;

    return source
      .map(normalizeStage)
      .filter(
        (stage) =>
          stage.enabled &&
          stage.title
      );
  }, [data.stages]);

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
          threshold: 0.08,
        }
      );

    observer.observe(node);

    return () =>
      observer.disconnect();
  }, []);

  useEffect(() => {
    const reduceMotion =
      window.matchMedia(
        '(prefers-reduced-motion: reduce)'
      ).matches;

    if (
      reduceMotion ||
      !visible ||
      userPaused ||
      data.autoplay === false ||
      stages.length < 2
    ) {
      return undefined;
    }

    const timer =
      window.setInterval(() => {
        setActiveIndex(
          (current) =>
            (
              current + 1
            ) % stages.length
        );
      }, Number(data.autoplayDelay) || 6500);

    return () =>
      window.clearInterval(timer);
  }, [
    data.autoplay,
    data.autoplayDelay,
    stages.length,
    userPaused,
    visible,
  ]);

  useEffect(() => {
    if (
      activeIndex >
      stages.length - 1
    ) {
      setActiveIndex(0);
    }
  }, [
    activeIndex,
    stages.length,
  ]);

  if (
    data.enabled === false ||
    !stages.length
  ) {
    return null;
  }

  const activeStage =
    stages[activeIndex] ||
    stages[0];

  const handleStageSelection = (
    index
  ) => {
    setActiveIndex(index);
    setUserPaused(true);
  };

  return (
    <section
      ref={sectionRef}
      id="our-development-approach"
      className="about-development-approach relative overflow-hidden bg-[#0A1B38] py-16 md:py-20 lg:py-24"
      aria-labelledby="development-approach-heading"
    >
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden="true"
      >
        <div className="absolute left-1/2 top-[48%] h-[620px] w-[1100px] -translate-x-1/2 rounded-full bg-[#0A3DFF]/[0.045] blur-[180px]" />

        <div className="absolute bottom-[5%] right-[5%] h-72 w-72 rounded-full bg-[#00C2FF]/[0.05] blur-[130px]" />

        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      </div>

      <div className="container relative">
        <header
          className={`mx-auto max-w-4xl text-center transition duration-700 ${
            visible
              ? 'translate-y-0 opacity-100'
              : 'translate-y-5 opacity-0'
          }`}
        >
          {data.eyebrow && (
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#00C2FF]">
              {data.eyebrow}
            </p>
          )}

          <h2
            id="development-approach-heading"
            className="mt-4 text-3xl font-black tracking-[-0.04em] text-white sm:text-4xl lg:text-[2.8rem]"
            style={{
              fontFamily:
                'Sora, sans-serif',
            }}
          >
            {data.title}
          </h2>

          {data.description && (
            <p className="mx-auto mt-4 max-w-3xl text-base leading-8 text-white/65 md:text-lg">
              {data.description}
            </p>
          )}
        </header>

        {/* Desktop process rail */}
        <div
          className={`mt-12 hidden transition duration-1000 lg:block ${
            visible
              ? 'translate-y-0 opacity-100'
              : 'translate-y-8 opacity-0'
          }`}
          style={{
            transitionDelay:
              '120ms',
          }}
        >
          <div className="about-development-rail relative">
            <div
              className="absolute left-0 right-0 top-[21px] h-px bg-white/15"
              aria-hidden="true"
            />

            <div
              className="absolute left-0 top-[20px] h-[3px] bg-gradient-to-r from-[#0A3DFF] via-[#00C2FF] to-[#39FF6A] transition-[width] duration-700"
              style={{
                width:
                  stages.length > 1
                    ? `${(activeIndex / (stages.length - 1)) * 100}%`
                    : '100%',
              }}
              aria-hidden="true"
            />

            <div
              className="relative grid"
              style={{
                gridTemplateColumns:
                  `repeat(${stages.length}, minmax(0, 1fr))`,
              }}
            >
              {stages.map(
                (stage, index) => {
                  const isActive =
                    index === activeIndex;

                  const isComplete =
                    index <
                    activeIndex;

                  return (
                    <button
                      key={stage.id}
                      type="button"
                      onClick={() =>
                        handleStageSelection(
                          index
                        )
                      }
                      className="group relative px-2 pt-0 text-center"
                      aria-pressed={
                        isActive
                      }
                      aria-controls="development-approach-active-panel"
                    >
                      <span
                        className={`relative z-10 mx-auto flex h-11 w-11 items-center justify-center rounded-full border text-xs font-black transition duration-300 ${
                          isActive
                            ? 'scale-110 text-[#07142B]'
                            : isComplete
                              ? 'text-[#07142B]'
                              : 'bg-[#0A1B38] text-white/55 group-hover:text-white'
                        }`}
                        style={{
                          borderColor:
                            isActive ||
                            isComplete
                              ? stage.accent
                              : 'rgba(255,255,255,0.22)',

                          backgroundColor:
                            isActive ||
                            isComplete
                              ? stage.accent
                              : '#0A1B38',

                          boxShadow:
                            isActive
                              ? `0 0 0 7px ${stage.accent}18`
                              : 'none',
                        }}
                      >
                        {stage.number}
                      </span>

                      <span
                        className={`mt-4 block text-sm font-bold leading-5 transition ${
                          isActive
                            ? 'text-white'
                            : 'text-white/48 group-hover:text-white/75'
                        }`}
                      >
                        {stage.shortTitle}
                      </span>
                    </button>
                  );
                }
              )}
            </div>
          </div>

          <DevelopmentStagePanel
            stage={activeStage}
            activeIndex={
              activeIndex
            }
          />
        </div>

        {/* Mobile timeline */}
        <div className="mt-10 space-y-0 lg:hidden">
          {stages.map(
            (stage, index) => (
              <MobileDevelopmentStage
                key={stage.id}
                stage={stage}
                index={index}
                isLast={
                  index ===
                  stages.length - 1
                }
                visible={visible}
              />
            )
          )}
        </div>

        {data.cta?.label &&
          data.cta?.to && (
            <div
              className={`mt-10 text-center transition duration-700 ${
                visible
                  ? 'translate-y-0 opacity-100'
                  : 'translate-y-5 opacity-0'
              }`}
              style={{
                transitionDelay:
                  '360ms',
              }}
            >
              <Link
                to={data.cta.to}
                className="group inline-flex items-center gap-3 border-b border-[#00C2FF]/50 pb-1 text-sm font-bold text-[#00C2FF] transition hover:border-[#00C2FF]"
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

const DevelopmentStagePanel = ({
  stage,
  activeIndex,
}) => (
  <article
    id="development-approach-active-panel"
    key={stage.id}
    className="about-development-stage-panel mt-12 grid min-h-[470px] overflow-hidden border border-white/10 bg-[#07142B] lg:grid-cols-[0.9fr_1.1fr]"
    style={{
      '--development-accent':
        stage.accent,
    }}
  >
    <div className="about-development-stage-media relative min-h-[390px] overflow-hidden">
      {stage.imageUrl ? (
        <picture>
          {stage.mobileImageUrl && (
            <source
              media="(max-width: 767px)"
              srcSet={resolveAssetUrl(
                stage.mobileImageUrl
              )}
            />
          )}

          <SmartImage
            src={resolveAssetUrl(
              stage.imageUrl
            )}
            alt={stage.imageAlt}
            loading={
              activeIndex === 0
                ? 'eager'
                : 'lazy'
            }
            className="absolute inset-0 h-full w-full object-cover"
            style={{
              objectPosition:
                stage.objectPosition,
            }}
          />
        </picture>
      ) : (
        <DevelopmentStageFallback
          stage={stage}
        />
      )}

      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#07142B]/88 via-transparent to-transparent"
        aria-hidden="true"
      />

      <span
        className="absolute left-0 top-0 h-1 w-[35%]"
        style={{
          backgroundColor:
            stage.accent,
        }}
        aria-hidden="true"
      />

      <div className="absolute bottom-6 left-6 text-[5.5rem] font-black leading-none tracking-[-0.08em] text-white/[0.12]">
        {stage.number}
      </div>
    </div>

    <div className="about-development-stage-copy flex flex-col justify-center px-8 py-10 lg:px-12 xl:px-16">
      <p
        className="text-xs font-bold uppercase tracking-[0.2em]"
        style={{
          color:
            stage.accent,
        }}
      >
        Stage {stage.number}
      </p>

      <h3
        className="mt-4 text-3xl font-black leading-tight tracking-[-0.04em] text-white xl:text-[2.5rem]"
        style={{
          fontFamily:
            'Sora, sans-serif',
        }}
      >
        {stage.title}
      </h3>

      {stage.description && (
        <p className="mt-5 text-base leading-8 text-white/65 md:text-lg">
          {stage.description}
        </p>
      )}

      {stage.points.length > 0 && (
        <ul className="mt-7 grid gap-x-8 gap-y-4 sm:grid-cols-2">
          {stage.points.map(
            (point) => (
              <li
                key={point.id}
                className="flex items-start gap-3 text-sm font-semibold leading-6 text-white/68"
              >
                <FaCheck
                  className="mt-1.5 shrink-0 text-[10px]"
                  style={{
                    color:
                      stage.accent,
                  }}
                />

                <span>
                  {point.text}
                </span>
              </li>
            )
          )}
        </ul>
      )}
    </div>
  </article>
);

const MobileDevelopmentStage = ({
  stage,
  index,
  isLast,
  visible,
}) => (
  <article
    className={`relative grid grid-cols-[46px_1fr] gap-4 transition duration-700 ${
      visible
        ? 'translate-y-0 opacity-100'
        : 'translate-y-5 opacity-0'
    }`}
    style={{
      transitionDelay:
        `${80 + index * 70}ms`,
    }}
  >
    <div className="relative flex justify-center">
      <span
        className="relative z-10 flex h-10 w-10 items-center justify-center rounded-full border text-xs font-black text-[#07142B]"
        style={{
          borderColor:
            stage.accent,

          backgroundColor:
            stage.accent,
        }}
      >
        {stage.number}
      </span>

      {!isLast && (
        <span
          className="absolute bottom-0 top-10 w-px bg-white/15"
          aria-hidden="true"
        />
      )}
    </div>

    <div
      className={`pb-9 ${
        isLast
          ? 'pb-0'
          : ''
      }`}
    >
      <div className="overflow-hidden border border-white/10 bg-[#07142B]">
        {stage.imageUrl && (
          <div className="relative aspect-[16/9] overflow-hidden">
            <SmartImage
              src={resolveAssetUrl(
                stage.mobileImageUrl ||
                stage.imageUrl
              )}
              alt={stage.imageAlt}
              loading="lazy"
              className="absolute inset-0 h-full w-full object-cover"
              style={{
                objectPosition:
                  stage.objectPosition,
              }}
            />

            <div
              className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#07142B]/75 to-transparent"
              aria-hidden="true"
            />

            <span
              className="absolute left-0 top-0 h-1 w-[35%]"
              style={{
                backgroundColor:
                  stage.accent,
              }}
              aria-hidden="true"
            />
          </div>
        )}

        <div className="px-5 py-6">
          <p
            className="text-xs font-bold uppercase tracking-[0.18em]"
            style={{
              color:
                stage.accent,
            }}
          >
            Stage {stage.number}
          </p>

          <h3 className="mt-3 text-xl font-black leading-tight text-white">
            {stage.title}
          </h3>

          {stage.description && (
            <p className="mt-3 text-sm leading-7 text-white/62">
              {stage.description}
            </p>
          )}

          {stage.points.length >
            0 && (
            <ul className="mt-5 space-y-3">
              {stage.points.map(
                (point) => (
                  <li
                    key={point.id}
                    className="flex items-start gap-3 text-sm leading-6 text-white/65"
                  >
                    <FaCheck
                      className="mt-1.5 shrink-0 text-[9px]"
                      style={{
                        color:
                          stage.accent,
                      }}
                    />

                    <span>
                      {point.text}
                    </span>
                  </li>
                )
              )}
            </ul>
          )}
        </div>
      </div>
    </div>
  </article>
);

const DevelopmentStageFallback = ({
  stage,
}) => (
  <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#0A1B38] via-[#0A3DFF]/15 to-[#07142B]">
    <div className="text-center">
      <p
        className="text-7xl font-black tracking-[-0.08em]"
        style={{
          color:
            stage.accent,
        }}
      >
        {stage.number}
      </p>

      <p className="mt-4 text-sm font-bold uppercase tracking-[0.16em] text-white/45">
        {stage.title}
      </p>
    </div>
  </div>
);

export default AboutDevelopmentApproach;