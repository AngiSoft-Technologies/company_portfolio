import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Link } from 'react-router-dom';
import {
  FaArrowDown,
  FaBrain,
  FaChartBar,
  FaCloud,
  FaCodeBranch,
  FaDatabase,
  FaMobileAlt,
  FaProjectDiagram,
  FaRobot,
} from 'react-icons/fa';

const DEFAULT_CONTENT = {
  enabled: true,

  introduction:
    'We eagerly put in use specialized technology capabilities',

  capabilities: [
    {
      id: 'ai-assisted-engineering',
      title: 'AI-Assisted Engineering',
      icon: 'ai',
      to: '/capabilities/ai-assisted-engineering',
    },
    {
      id: 'data-analysis',
      title: 'Data Analysis',
      icon: 'data',
      to: '/services/data-analysis',
    },
    {
      id: 'legacy-modernization',
      title: 'Legacy Modernization',
      icon: 'modernization',
      to: '/services/software-modernization',
    },
    {
      id: 'multi-role-systems',
      title: 'Multi-Role Systems',
      icon: 'roles',
      to: '/capabilities/role-based-systems',
    },
    {
      id: 'api-integration',
      title: 'API Integration',
      icon: 'integration',
      to: '/services/system-integration',
    },
    {
      id: 'cross-platform-apps',
      title: 'Cross-Platform Apps',
      icon: 'mobile',
      to: '/services/mobile-development',
    },
    {
      id: 'workflow-automation',
      title: 'Workflow Automation',
      icon: 'automation',
      to: '/solutions/workflow-automation',
    },
    {
      id: 'cloud-deployment',
      title: 'Cloud Deployment',
      icon: 'cloud',
      to: '/services/cloud-deployment',
    },
  ],
};

const ICONS = {
  ai: FaBrain,
  automation: FaRobot,
  cloud: FaCloud,
  data: FaChartBar,
  integration: FaDatabase,
  mobile: FaMobileAlt,
  modernization: FaCodeBranch,
  roles: FaProjectDiagram,
};

const normalizeCapability = (
  capability,
  index
) => {
  if (typeof capability === 'string') {
    return {
      id: `specialized-capability-${index}`,
      title: capability,
      icon: 'ai',
      to: '',
      enabled: true,
    };
  }

  return {
    id:
      capability?.id ||
      `specialized-capability-${index}`,

    title:
      capability?.title ||
      capability?.name ||
      '',

    icon:
      capability?.icon ||
      'ai',

    to:
      capability?.to ||
      capability?.href ||
      '',

    enabled:
      capability?.enabled !== false,
  };
};

const AboutSpecializedCapabilities = ({
  content = {},
}) => {
  const sectionRef = useRef(null);

  const [visible, setVisible] =
    useState(false);

  const data = useMemo(
    () => ({
      ...DEFAULT_CONTENT,
      ...(content || {}),
    }),
    [content]
  );

  const capabilities = useMemo(() => {
    const source =
      Array.isArray(data.capabilities) &&
      data.capabilities.length
        ? data.capabilities
        : DEFAULT_CONTENT.capabilities;

    return source
      .map(normalizeCapability)
      .filter(
        (capability) =>
          capability.enabled &&
          capability.title
      );
  }, [data.capabilities]);

  useEffect(() => {
    const node = sectionRef.current;

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
          if (entry.isIntersecting) {
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
    !capabilities.length
  ) {
    return null;
  }

  return (
    <section
      ref={sectionRef}
      id="about-specialized-capabilities"
      className="about-specialized-capabilities bg-[#07142B] py-14 md:py-16 lg:py-20"
      aria-labelledby="specialized-capabilities-heading"
    >
      <div className="container">
        <p
          id="specialized-capabilities-heading"
          className={`text-sm font-medium leading-6 text-white/75 transition duration-700 ${
            visible
              ? 'translate-y-0 opacity-100'
              : 'translate-y-4 opacity-0'
          }`}
        >
          {data.introduction}
        </p>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
          {capabilities.map(
            (capability, index) => (
              <CapabilityCard
                key={capability.id}
                capability={capability}
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

const CapabilityCard = ({
  capability,
  index,
  visible,
}) => {
  const Icon =
    ICONS[capability.icon] ||
    FaBrain;

  const content = (
    <>
      <span
        className="absolute right-3 top-3 text-[#00C2FF]"
        aria-hidden="true"
      >
        <FaArrowDown className="-rotate-45 text-[8px] transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
      </span>

      <Icon
        className="text-[28px] text-[#00C2FF]"
        aria-hidden="true"
      />

      <span className="mt-5 text-center text-sm font-semibold leading-5 text-white">
        {capability.title}
      </span>
    </>
  );

  const className = `
    about-specialized-capability
    group relative flex min-h-[122px]
    flex-col items-center justify-center
    border border-white/15 bg-[#0A1B38]
    px-5 py-5 text-center no-underline
    transition duration-500
    hover:border-[#00C2FF]/60
    hover:bg-[#0C2142]
    focus-visible:outline-none
    focus-visible:ring-2
    focus-visible:ring-[#00C2FF]
    ${
      visible
        ? 'translate-y-0 opacity-100'
        : 'translate-y-5 opacity-0'
    }
  `;

  const style = {
    transitionDelay:
      `${80 + index * 45}ms`,
  };

  if (!capability.to) {
    return (
      <article
        className={className}
        style={style}
      >
        {content}
      </article>
    );
  }

  return (
    <Link
      to={capability.to}
      className={className}
      style={style}
      aria-label={capability.title}
    >
      {content}
    </Link>
  );
};

export default AboutSpecializedCapabilities;