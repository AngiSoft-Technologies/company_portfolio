import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

const normalizeTechnology = (
  technology,
  index,
  prefix
) => {
  if (typeof technology === 'string') {
    return {
      id:
        `${prefix}-technology-${index}`,

      name:
        technology,

      enabled:
        true,
    };
  }

  return {
    id:
      technology?.id ||
      `${prefix}-technology-${index}`,

    name:
      technology?.name ||
      technology?.title ||
      technology?.label ||
      '',

    enabled:
      technology?.enabled !== false,
  };
};

const normalizeGroup = (
  group,
  index,
  prefix
) => ({
  id:
    group?.id ||
    `${prefix}-group-${index}`,

  title:
    group?.title ||
    '',

  enabled:
    group?.enabled !== false,

  technologies:
    (
      Array.isArray(
        group?.technologies
      )
        ? group.technologies
        : []
    )
      .map(
        (
          technology,
          technologyIndex
        ) =>
          normalizeTechnology(
            technology,
            technologyIndex,
            `${prefix}-${index}`
          )
      )
      .filter(
        (technology) =>
          technology.enabled &&
          technology.name
      ),
});

const normalizeSection = (
  section,
  index,
  prefix
) => ({
  id:
    section?.id ||
    `${prefix}-section-${index}`,

  title:
    section?.title ||
    section?.name ||
    '',

  enabled:
    section?.enabled !== false,

  groups:
    (
      Array.isArray(
        section?.groups
      )
        ? section.groups
        : []
    )
      .map(
        (group, groupIndex) =>
          normalizeGroup(
            group,
            groupIndex,
            `${prefix}-${index}`
          )
      )
      .filter(
        (group) =>
          group.enabled &&
          group.technologies.length
      ),
});

const normalizeColumn = (
  column,
  index
) => ({
  id:
    column?.id ||
    `technology-column-${index}`,

  enabled:
    column?.enabled !== false,

  sections:
    (
      Array.isArray(
        column?.sections
      )
        ? column.sections
        : []
    )
      .map(
        (section, sectionIndex) =>
          normalizeSection(
            section,
            sectionIndex,
            `technology-column-${index}`
          )
      )
      .filter(
        (section) =>
          section.enabled &&
          section.title &&
          section.groups.length
      ),
});

const AboutTechnologies = ({
  content = {},
}) => {
  const sectionRef = useRef(null);

  const [visible, setVisible] =
    useState(false);

  const data = useMemo(
    () => ({
      ...(content || {}),
    }),
    [content]
  );

  const columns = useMemo(() => {
    const source =
      Array.isArray(data.columns) &&
        data.columns.length
        ? data.columns
        : [];

    return source
      .map(normalizeColumn)
      .filter(
        (column) =>
          column.enabled &&
          column.sections.length
      );
  }, [data.columns]);

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
          threshold: 0.06,
        }
      );

    observer.observe(node);

    return () =>
      observer.disconnect();
  }, []);

  if (
    data.enabled === false ||
    !columns.length
  ) {
    return null;
  }

  return (
    <section
      ref={sectionRef}
      id="about-technological-expertise"
      className="about-technologies-matrix bg-[#07142B] py-16 md:py-20 lg:py-24"
      aria-labelledby="about-technologies-heading"
    >
      <div className="container">
        <header
          className={`max-w-4xl transition duration-700 ${visible
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
              id="about-technologies-heading"
              className="relative text-3xl font-bold leading-tight tracking-[-0.035em] text-white md:text-4xl"
              style={{
                fontFamily:
                  'Sora, sans-serif',
              }}
            >
              {data.title}
            </h2>
          </div>
        </header>

        <div
          className={`about-technologies-grid mt-9 grid grid-cols-1 gap-3 transition duration-1000 sm:grid-cols-2 md:grid-cols-3 ${visible
              ? 'translate-y-0 opacity-100'
              : 'translate-y-7 opacity-0'
            }`}
          style={{
            transitionDelay: '100ms',
          }}
        >
          {columns.map(
            (column, columnIndex) => (
              <TechnologyColumn
                key={column.id}
                column={column}
                columnIndex={columnIndex}
              />
            )
          )}
        </div>
      </div>
    </section>
  );
};

const TechnologyColumn = ({
  column,
  columnIndex,
}) => (
  <div
    className="about-technology-column flex min-w-0 flex-col gap-3"
    style={{
      transitionDelay:
        `${120 + columnIndex * 80}ms`,
    }}
  >
    {column.sections.map(
      (section) => (
        <TechnologySection
          key={section.id}
          section={section}
        />
      )
    )}
  </div>
);

const TechnologySection = ({
  section,
}) => (
  <article className="about-technology-section min-w-0 border border-white/12 bg-[#0A1B38] px-4 py-4 md:px-5 md:py-5">
    <h3 className="text-sm font-bold leading-5 text-white">
      {section.title}
    </h3>

    <div className="mt-4 space-y-4">
      {section.groups.map(
        (group) => (
          <TechnologyGroup
            key={group.id}
            group={group}
          />
        )
      )}
    </div>
  </article>
);

const TechnologyGroup = ({
  group,
}) => (
  <section>
    {group.title && (
      <h4 className="mb-2 text-[11px] font-semibold text-white/72">
        {group.title}
      </h4>
    )}

    <div className="flex flex-wrap gap-2">
      {group.technologies.map(
        (technology) => (
          <TechnologyPill
            key={technology.id}
            technology={technology}
          />
        )
      )}
    </div>
  </section>
);

const TechnologyPill = ({
  technology,
}) => (
  <span className="about-technology-pill inline-flex max-w-full items-center rounded-full border border-[#BEDBF2] bg-[#F4FAFF] px-2.5 py-1 text-[10px] font-medium leading-[1.25] text-[#163057] shadow-sm transition hover:border-[#80BCE8] hover:bg-white sm:text-[11px]">
    <span className="break-words">
      {technology.name}
    </span>
  </span>
);

export default AboutTechnologies;