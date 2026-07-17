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
  FaHandshake,
  FaProjectDiagram,
  FaRegComments,
} from 'react-icons/fa';

const DEFAULT_CONTENT = {
  enabled: true,

  title:
    'How We Collaborate',

  models: [
    {
      id:
        'flexible-models',

      title:
        'Flexible Collaboration Models',

      icon:
        'flexible',

      accent:
        '#0A3DFF',

      items: [
        {
          id:
            'end-to-end',

          label:
            'End-to-end project delivery',
        },

        {
          id:
            'dedicated-development',

          label:
            'Dedicated development support',
        },

        {
          id:
            'staff-augmentation',

          label:
            'Technical team augmentation',

          to:
            '/services/software-development',
        },
      ],
    },

    {
      id:
        'seamless-integration',

      title:
        'Seamless Integration',

      icon:
        'integration',

      accent:
        '#00C2FF',

      items: [
        {
          id:
            'onboarding',

          label:
            'Fast onboarding into existing projects',
        },

        {
          id:
            'workflow-alignment',

          label:
            'Alignment with existing workflows',
        },

        {
          id:
            'timezone-collaboration',

          label:
            'Comfortable collaboration across locations',
        },
      ],
    },

    {
      id:
        'communication',

      title:
        'Strong Communication and Ownership',

      icon:
        'communication',

      accent:
        '#39FF6A',

      items: [
        {
          id:
            'project-coordination',

          label:
            'Proactive project coordination',
        },

        {
          id:
            'reporting',

          label:
            'Transparent progress reporting',
        },

        {
          id:
            'communication',

          label:
            'Clear communication throughout delivery',
        },
      ],
    },
  ],
};

const ICONS = {
  flexible:
    FaProjectDiagram,

  integration:
    FaHandshake,

  communication:
    FaRegComments,
};

const normalizeItem = (
  item,
  index,
  prefix
) => {
  if (typeof item === 'string') {
    return {
      id:
        `${prefix}-item-${index}`,

      label:
        item,

      to:
        '',
    };
  }

  return {
    id:
      item?.id ||
      `${prefix}-item-${index}`,

    label:
      item?.label ||
      item?.title ||
      item?.text ||
      '',

    to:
      item?.to ||
      item?.href ||
      '',

    enabled:
      item?.enabled !== false,
  };
};

const normalizeModel = (
  model,
  index
) => {
  const modelId =
    model?.id ||
    `collaboration-model-${index}`;

  return {
    id:
      modelId,

    title:
      model?.title ||
      model?.name ||
      '',

    icon:
      model?.icon ||
      [
        'flexible',
        'integration',
        'communication',
      ][index % 3],

    accent:
      model?.accent ||
      [
        '#0A3DFF',
        '#00C2FF',
        '#39FF6A',
      ][index % 3],

    enabled:
      model?.enabled !== false,

    items:
      (
        Array.isArray(
          model?.items
        )
          ? model.items
          : []
      )
        .map(
          (
            item,
            itemIndex
          ) =>
            normalizeItem(
              item,
              itemIndex,
              modelId
            )
        )
        .filter(
          (item) =>
            item.enabled !== false &&
            item.label
        ),
  };
};

const AboutCollaboration = ({
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

  const models = useMemo(() => {
    const source =
      Array.isArray(data.models) &&
      data.models.length
        ? data.models
        : DEFAULT_CONTENT.models;

    return source
      .map(normalizeModel)
      .filter(
        (model) =>
          model.enabled &&
          model.title &&
          model.items.length
      )
      .slice(0, 3);
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

    return () => {
      observer.disconnect();
    };
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
      id="about-collaboration"
      className="about-collaboration bg-[#07142B] py-16 md:py-20 lg:py-24"
      aria-labelledby="about-collaboration-heading"
    >
      <div className="container">
        <header
          className={`max-w-4xl transition duration-700 ${
            visible
              ? 'translate-y-0 opacity-100'
              : 'translate-y-4 opacity-0'
          }`}
        >
          <div className="relative inline-block">
            <span
              className="absolute -left-4 -top-4 h-14 w-14 bg-[#0A3DFF]/15"
              aria-hidden="true"
            />

            <h2
              id="about-collaboration-heading"
              className="relative text-3xl font-bold tracking-[-0.035em] text-white md:text-4xl"
              style={{
                fontFamily:
                  'Sora, sans-serif',
              }}
            >
              {data.title}
            </h2>
          </div>
        </header>

        <div className="about-collaboration-grid mt-9 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
          {models.map(
            (model, index) => (
              <CollaborationCard
                key={model.id}
                model={model}
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

const CollaborationCard = ({
  model,
  index,
  visible,
}) => {
  const Icon =
    ICONS[model.icon] ||
    FaHandshake;

  return (
    <article
      className={`about-collaboration-card relative flex min-h-[255px] flex-col border border-white/14 bg-[#0A1B38] px-6 py-7 transition duration-700 ${
        visible
          ? 'translate-y-0 opacity-100'
          : 'translate-y-5 opacity-0'
      }`}
      style={{
        '--collaboration-accent':
          model.accent,

        transitionDelay:
          `${100 + index * 90}ms`,
      }}
    >
      <div className="flex justify-center">
        <span
          className="about-collaboration-icon flex h-14 w-14 items-center justify-center"
          aria-hidden="true"
        >
          <Icon />
        </span>
      </div>

      <h3 className="mt-5 text-center text-sm font-bold leading-6 text-white">
        {model.title}
      </h3>

      <ul className="mt-6 space-y-3">
        {model.items.map(
          (item) => (
            <li
              key={item.id}
              className="text-xs leading-6 text-white/66"
            >
              {item.to ? (
                <Link
                  to={item.to}
                  className="group flex items-start gap-2.5 no-underline transition hover:text-white"
                >
                  <FaCheck
                    className="mt-2 shrink-0 text-[7px]"
                    style={{
                      color:
                        model.accent,
                    }}
                  />

                  <span className="flex-1">
                    {item.label}
                  </span>

                  <FaArrowRight
                    className="mt-2 shrink-0 text-[8px] opacity-55 transition group-hover:translate-x-1 group-hover:opacity-100"
                    style={{
                      color:
                        model.accent,
                    }}
                  />
                </Link>
              ) : (
                <div className="flex items-start gap-2.5">
                  <FaCheck
                    className="mt-2 shrink-0 text-[7px]"
                    style={{
                      color:
                        model.accent,
                    }}
                  />

                  <span>
                    {item.label}
                  </span>
                </div>
              )}
            </li>
          )
        )}
      </ul>
    </article>
  );
};

export default AboutCollaboration;