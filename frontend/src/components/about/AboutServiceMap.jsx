import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Link } from 'react-router-dom';
import {
  FaArrowDown,
  FaChartBar,
  FaCode,
  FaDatabase,
  FaFileAlt,
  FaGlobe,
  FaLaptopCode,
  FaMobileAlt,
  FaPalette,
  FaTools,
  FaUpload,
  FaWindows,
  FaBoxOpen,
} from 'react-icons/fa';

const DEFAULT_CONTENT = {
  enabled: true,

  introTile: {
    title: 'Our Service Map',
    to: '/services',
  },

  services: [
    {
      id: 'web-development',
      title: 'Web Development',
      icon: 'web',
      imageUrl:
        '/uploads/public/images/about/service-map/web-development.webp',
      imageAlt:
        'Web development illustration',
      to:
        '/services/web-development',
    },
    {
      id: 'mobile-development',
      title: 'Mobile Development',
      icon: 'mobile',
      imageUrl:
        '/uploads/public/images/about/service-map/mobile-development.webp',
      imageAlt:
        'Mobile application development illustration',
      to:
        '/services/mobile-development',
    },
    {
      id: 'code-debugging',
      title: 'Code Debugging',
      icon: 'debugging',
      imageUrl:
        '/uploads/public/images/about/service-map/code-debugging.webp',
      imageAlt:
        'Code debugging illustration',
      to:
        '/services/code-debugging',
    },
    {
      id: 'data-analysis',
      title: 'Data Analysis',
      icon: 'data',
      imageUrl:
        '/uploads/public/images/about/service-map/data-analysis.webp',
      imageAlt:
        'Data analysis illustration',
      to:
        '/services/data-analysis',
    },
    {
      id: 'document-editing',
      title: 'Document Editing',
      icon: 'documents',
      imageUrl:
        '/uploads/public/images/about/service-map/document-editing.webp',
      imageAlt:
        'Document editing illustration',
      to:
        '/services/document-editing',
    },
    {
      id: 'database-design',
      title: 'System & Database Design',
      icon: 'database',
      imageUrl:
        '/uploads/public/images/about/service-map/database-design.webp',
      imageAlt:
        'System and database design illustration',
      to:
        '/services/database-design',
    },
    {
      id: 'custom-systems',
      title: 'Custom Systems',
      icon: 'systems',
      imageUrl:
        '/uploads/public/images/about/service-map/custom-systems.webp',
      imageAlt:
        'Custom business systems illustration',
      to:
        '/services/custom-systems',
    },
    {
      id: 'software-installation',
      title: 'Software Installation',
      icon: 'installation',
      imageUrl:
        '/uploads/public/images/about/service-map/software-installation.webp',
      imageAlt:
        'Software installation illustration',
      to:
        '/services/software-installation',
    },
    {
      id: 'system-upgrades',
      title: 'System Upgrades',
      icon: 'upgrades',
      imageUrl:
        '/uploads/public/images/about/service-map/system-upgrades.webp',
      imageAlt:
        'Software and system upgrades illustration',
      to:
        '/services/system-upgrades',
    },
    {
      id: 'posters-graphics',
      title: 'Design Posters & Graphics',
      icon: 'graphics',
      imageUrl:
        '/uploads/public/images/about/service-map/posters-graphics.webp',
      imageAlt:
        'Poster and graphic design illustration',
      to:
        '/services/graphic-design',
    },
    {
      id: 'online-applications',
      title: 'Online Applications',
      icon: 'applications',
      imageUrl:
        '/uploads/public/images/about/service-map/online-applications.webp',
      imageAlt:
        'Online application services illustration',
      to:
        '/services/online-applications',
    },
    {
      id: 'in-house-products',
      title: 'In-House Products',
      icon: 'products',
      imageUrl:
        '/uploads/public/images/about/service-map/in-house-products.webp',
      imageAlt:
        'AngiSoft software products illustration',
      to:
        '/products',
    },
  ],
};

const ICONS = {
  applications: FaGlobe,
  data: FaChartBar,
  database: FaDatabase,
  debugging: FaCode,
  documents: FaFileAlt,
  graphics: FaPalette,
  installation: FaWindows,
  mobile: FaMobileAlt,
  products: FaBoxOpen,
  systems: FaTools,
  upgrades: FaUpload,
  web: FaLaptopCode,
};

const normalizeService = (
  service,
  index
) => ({
  id:
    service?.id ||
    `service-map-${index}`,

  title:
    service?.title ||
    service?.name ||
    '',

  icon:
    service?.icon ||
    'web',

  imageUrl:
    service?.imageUrl ||
    service?.iconUrl ||
    '',

  imageAlt:
    service?.imageAlt ||
    `${service?.title || 'Service'} illustration`,

  to:
    service?.to ||
    service?.href ||
    '',

  enabled:
    service?.enabled !== false,
});

const AboutServiceMap = ({
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

      introTile: {
        ...DEFAULT_CONTENT.introTile,
        ...(content?.introTile || {}),
      },
    }),
    [content]
  );

  const services = useMemo(() => {
    const source =
      Array.isArray(data.services) &&
      data.services.length
        ? data.services
        : DEFAULT_CONTENT.services;

    return source
      .map(normalizeService)
      .filter(
        (service) =>
          service.enabled &&
          service.title
      );
  }, [data.services]);

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
    !services.length
  ) {
    return null;
  }

  return (
    <section
      ref={sectionRef}
      id="about-service-map"
      className="about-service-map bg-[#07142B] py-16 md:py-20 lg:py-24"
      aria-label="AngiSoft service map"
    >
      <div className="container">
        <div
          className={`about-service-map-grid grid grid-cols-1 gap-4 transition duration-700 sm:grid-cols-2 md:grid-cols-4 ${
            visible
              ? 'translate-y-0 opacity-100'
              : 'translate-y-6 opacity-0'
          }`}
        >
          <ServiceMapIntro
            content={data.introTile}
          />

          {services.map(
            (service, index) => (
              <ServiceMapCard
                key={service.id}
                service={service}
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

const ServiceMapIntro = ({
  content,
}) => {
  const innerContent = (
    <>
      <span className="about-service-map-intro-title">
        {content.title}
      </span>

      {content.to && (
        <span
          className="absolute right-3 top-3 text-white/80"
          aria-hidden="true"
        >
          <FaArrowDown className="-rotate-45 text-[9px]" />
        </span>
      )}
    </>
  );

  const className =
    'about-service-map-intro relative flex min-h-[190px] items-center justify-center overflow-hidden bg-[#0067C9] px-8 py-8 text-center no-underline';

  if (content.to) {
    return (
      <Link
        to={content.to}
        className={className}
        aria-label={content.title}
      >
        {innerContent}
      </Link>
    );
  }

  return (
    <div className={className}>
      {innerContent}
    </div>
  );
};

const ServiceMapCard = ({
  service,
  index,
  visible,
}) => {
  const Icon =
    ICONS[service.icon] ||
    FaLaptopCode;

  const cardContent = (
    <>
      <div className="about-service-map-visual relative h-full min-h-[190px] overflow-hidden">
        {service.imageUrl ? (
          <img
            src={service.imageUrl}
            alt={service.imageAlt}
            loading="lazy"
            className="about-service-map-image absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <div className="about-service-map-fallback absolute inset-0 flex items-center justify-center">
            <Icon
              className="text-5xl text-[#0067C9]"
              aria-hidden="true"
            />
          </div>
        )}

        <span className="about-service-map-label">
          {service.title}
        </span>

        {service.to && (
          <span
            className="about-service-map-arrow"
            aria-hidden="true"
          >
            <FaArrowDown className="-rotate-45 text-[8px]" />
          </span>
        )}
      </div>
    </>
  );

  const className = `
    about-service-map-item
    group relative block min-h-[190px]
    overflow-hidden no-underline
    transition duration-700
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

  if (service.to) {
    return (
      <Link
        to={service.to}
        className={className}
        style={style}
        aria-label={service.title}
      >
        {cardContent}
      </Link>
    );
  }

  return (
    <article
      className={className}
      style={style}
    >
      {cardContent}
    </article>
  );
};

export default AboutServiceMap;