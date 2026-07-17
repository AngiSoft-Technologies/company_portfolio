import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Link } from 'react-router-dom';
import { FaArrowDown } from 'react-icons/fa';

const DEFAULT_CONTENT = {
  enabled: true,

  title: 'Solutions We Cover',

  description:
    'From business operations to customer-facing platforms, AngiSoft builds practical digital solutions across areas including:',

  solutions: [
    {
      id: 'business-management',
      title: 'Business Management Systems',
      to: '/solutions/business-management',
    },
    {
      id: 'point-of-sale',
      title: 'Point of Sale Systems',
      to: '/solutions/point-of-sale',
    },
    {
      id: 'customer-management',
      title: 'Customer Management',
      to: '/solutions/customer-management',
    },
    {
      id: 'operations-management',
      title: 'Operations Management',
      to: '/solutions/operations-management',
    },
    {
      id: 'financial-tracking',
      title: 'Financial Tracking',
      to: '/solutions/financial-tracking',
    },
    {
      id: 'payments-billing',
      title: 'Payments and Billing',
      to: '/solutions/payments-billing',
    },
    {
      id: 'asset-management',
      title: 'Asset Management',
      to: '/solutions/asset-management',
    },
    {
      id: 'document-management',
      title: 'Document Management',
      to: '/solutions/document-management',
    },
    {
      id: 'staff-portals',
      title: 'Staff Portals',
      to: '/solutions/staff-portals',
    },
    {
      id: 'human-resource-systems',
      title: 'Human Resource Systems',
      to: '/solutions/human-resource-systems',
    },
    {
      id: 'learning-platforms',
      title: 'Learning Platforms',
      to: '/solutions/learning-platforms',
    },
    {
      id: 'ecommerce',
      title: 'eCommerce',
      to: '/solutions/ecommerce',
    },
    {
      id: 'inventory-management',
      title: 'Inventory Management',
      to: '/solutions/inventory-management',
    },
    {
      id: 'property-platforms',
      title: 'Property Platforms',
      to: '/products/kejalink',
    },
    {
      id: 'data-analytics',
      title: 'Data Analytics',
      to: '/services/data-analysis',
    },
    {
      id: 'web-portals',
      title: 'Web Portals',
      to: '/solutions/web-portals',
    },
  ],
};

const normalizeSolution = (
  solution,
  index
) => {
  if (typeof solution === 'string') {
    return {
      id: `solution-${index}`,
      title: solution,
      to: '',
      enabled: true,
    };
  }

  return {
    id:
      solution?.id ||
      `solution-${index}`,

    title:
      solution?.title ||
      solution?.name ||
      solution?.label ||
      '',

    to:
      solution?.to ||
      solution?.href ||
      '',

    enabled:
      solution?.enabled !== false,
  };
};

const AboutSolutionTypes = ({
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

  const solutions = useMemo(() => {
    const source =
      Array.isArray(data.solutions) &&
      data.solutions.length
        ? data.solutions
        : DEFAULT_CONTENT.solutions;

    return source
      .map(normalizeSolution)
      .filter(
        (solution) =>
          solution.enabled &&
          solution.title
      );
  }, [data.solutions]);

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
          threshold: 0.08,
        }
      );

    observer.observe(node);

    return () =>
      observer.disconnect();
  }, []);

  if (
    data.enabled === false ||
    !solutions.length
  ) {
    return null;
  }

  return (
    <section
      ref={sectionRef}
      id="solutions-we-cover"
      className="about-solutions-we-cover bg-[#07142B] py-16 md:py-20 lg:py-24"
      aria-labelledby="solutions-we-cover-heading"
    >
      <div className="container">
        <header
          className={`max-w-4xl transition duration-700 ${
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
              id="solutions-we-cover-heading"
              className="relative text-3xl font-bold tracking-[-0.035em] text-white md:text-4xl"
              style={{
                fontFamily:
                  'Sora, sans-serif',
              }}
            >
              {data.title}
            </h2>
          </div>

          {data.description && (
            <p className="mt-7 max-w-3xl text-sm leading-7 text-white/65 md:text-base">
              {data.description}
            </p>
          )}
        </header>

        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
          {solutions.map(
            (solution, index) => (
              <SolutionCard
                key={solution.id}
                solution={solution}
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

const SolutionCard = ({
  solution,
  index,
  visible,
}) => {
  const cardContent = (
    <>
      <span className="relative z-10 block px-3 text-center text-sm font-semibold leading-6 text-white/88">
        {solution.title}
      </span>

      {solution.to && (
        <span
          className="absolute bottom-3 right-3 flex h-4 w-4 items-center justify-center text-[#00C2FF]"
          aria-hidden="true"
        >
          <FaArrowDown className="-rotate-45 text-[9px] transition-transform duration-300 group-hover:translate-x-0.5 group-hover:translate-y-0.5" />
        </span>
      )}
    </>
  );

  const className = `
    group relative flex min-h-[100px] items-center justify-center
    overflow-hidden border border-white/15 bg-white/[0.025]
    px-5 py-5 no-underline transition duration-300
    hover:border-[#00C2FF]/65 hover:bg-white/[0.045]
    focus-visible:outline-none focus-visible:ring-2
    focus-visible:ring-[#00C2FF]
    ${visible
      ? 'translate-y-0 opacity-100'
      : 'translate-y-5 opacity-0'}
  `;

  const style = {
    transitionDelay:
      `${80 + index * 35}ms`,
  };

  if (!solution.to) {
    return (
      <div
        className={className}
        style={style}
      >
        {cardContent}
      </div>
    );
  }

  return (
    <Link
      to={solution.to}
      className={className}
      style={style}
    >
      {cardContent}
    </Link>
  );
};

export default AboutSolutionTypes;