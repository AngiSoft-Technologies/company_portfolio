import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Link } from 'react-router-dom';
import {
  FaArrowRight,
  FaBalanceScale,
  FaCalculator,
  FaClipboardCheck,
  FaClock,
  FaProjectDiagram,
  FaSearchDollar,
  FaTasks,
  FaUserCheck,
  FaUsersCog,
} from 'react-icons/fa';

const DEFAULT_CONTENT = {
  enabled: true,

  title:
    'What We Do to Support Project Success',

  introduction: [
    'At AngiSoft, we apply practical engineering, project coordination and quality controls to support successful software delivery.',

    'Our approach is adapted to the project’s size, requirements, technical risks and business priorities. We focus on keeping responsibilities clear, progress visible and important decisions properly communicated.',

    'These practices help us build reliable solutions while reducing avoidable delays, uncontrolled changes and technical uncertainty.',
  ],

  practices: [
    {
      id:
        'requirements-engineering',

      title:
        'Engaged Requirements Engineering',

      description:
        'We work closely with the client to understand the problem, users, workflows and expected results before major implementation begins.',

      icon:
        'requirements',

      to:
        '/services/requirements-analysis',
    },

    {
      id:
        'cost-estimation',

      title:
        'Accurate and Realistic Cost Estimation',

      description:
        'We assess the expected scope, technical complexity, integrations and delivery requirements before preparing a quotation.',

      icon:
        'estimate',

      to:
        '/booking',
    },

    {
      id:
        'project-scoping',

      title:
        'Dynamic Yet Controllable Project Scoping',

      description:
        'We allow requirements to evolve while reviewing how every approved change affects cost, effort and delivery time.',

      icon:
        'scope',

      to:
        '/services/project-planning',
    },

    {
      id:
        'project-team',

      title:
        'Competence-Based Project Team Selection',

      description:
        'Project responsibilities are assigned according to the skills, experience and technical knowledge required for the work.',

      icon:
        'team',

      to:
        '/about/company',
    },

    {
      id:
        'risk-management',

      title:
        'Comprehensive Risk Management',

      description:
        'We identify technical, operational and delivery risks early and plan practical actions to reduce their impact.',

      icon:
        'risk',

      to:
        '/services/project-planning',
    },

    {
      id:
        'agile-delivery',

      title:
        'Agile Delivery',

      description:
        'We divide larger projects into manageable stages so that progress can be reviewed, tested and improved continuously.',

      icon:
        'delivery',

      to:
        '/services/software-development',
    },

    {
      id:
        'scope-creep',

      title:
        'Prevention of Scope Creep',

      description:
        'New requests are assessed against the agreed scope before implementation to prevent uncontrolled expansion of the project.',

      icon:
        'control',

      to:
        '/services/project-planning',
    },

    {
      id:
        'budget-control',

      title:
        'Budget Control',

      description:
        'We track approved work against the agreed commercial model and communicate changes that may affect the project budget.',

      icon:
        'budget',

      to:
        '/booking',
    },

    {
      id:
        'deadlines',

      title:
        'Responsible Approach to Deadlines',

      description:
        'We plan delivery around realistic requirements, dependencies and available capacity instead of making unsupported promises.',

      icon:
        'deadline',

      to:
        '/services/software-development',
    },
  ],
};

const ICONS = {
  budget:
    FaSearchDollar,

  control:
    FaBalanceScale,

  deadline:
    FaClock,

  delivery:
    FaTasks,

  estimate:
    FaCalculator,

  requirements:
    FaClipboardCheck,

  risk:
    FaProjectDiagram,

  scope:
    FaUsersCog,

  team:
    FaUserCheck,
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
      ...DEFAULT_CONTENT,
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
        : DEFAULT_CONTENT.practices;

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
      className="about-project-success bg-[#07142B] py-16 md:py-20 lg:py-24"
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
              className="absolute -left-4 -top-4 h-14 w-14 bg-[#0A3DFF]/15"
              aria-hidden="true"
            />

            <h2
              id="project-success-heading"
              className="relative text-3xl font-bold leading-tight tracking-[-0.035em] text-white md:text-4xl"
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
                    className="text-sm leading-7 text-white/65 md:text-base"
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
    FaClipboardCheck;

  const content = (
    <article className="about-project-success-card flex h-full min-h-[285px] flex-col border border-white/15 bg-[#0A1B38] px-6 py-7">
      <div className="flex justify-center">
        <span className="flex h-14 w-14 items-center justify-center text-[#00C2FF]">
          <Icon
            className="text-[34px]"
            aria-hidden="true"
          />
        </span>
      </div>

      <h3 className="mt-5 text-center text-sm font-bold leading-6 text-white">
        {practice.title}
      </h3>

      {practice.description && (
        <p className="mt-5 text-sm leading-7 text-white/62">
          {practice.description}
        </p>
      )}

      {practice.to && (
        <span className="mt-auto flex justify-end pt-6">
          <span className="inline-flex items-center gap-2 text-xs font-semibold text-[#00C2FF]">
            Details

            <FaArrowRight className="text-[9px] transition-transform duration-300 group-hover:translate-x-1" />
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