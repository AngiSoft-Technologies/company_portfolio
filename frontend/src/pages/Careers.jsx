import React, {
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  Link,
  useNavigate,
} from 'react-router-dom';
import {
  FaArrowRight,
  FaBriefcase,
  FaBuilding,
  FaCheck,
  FaChevronDown,
  FaClock,
  FaCode,
  FaEnvelope,
  FaGraduationCap,
  FaLaptop,
  FaLightbulb,
  FaMapMarkerAlt,
  FaMoneyBillWave,
  FaPaintBrush,
  FaRocket,
  FaSearch,
  FaShieldAlt,
  FaUsers,
} from 'react-icons/fa';

import { apiGet } from '../js/httpClient';

import '../css/careers.css';

// Icons are presentation-only (the DB holds text). Map each content `id`
// to its Fa icon so the culture/benefits sections stay visually consistent
// no matter what rows come back from the `careers_content` Setting.
const CULTURE_ICONS = {
  'practical-innovation': FaLightbulb,
  'shared-responsibility': FaUsers,
  'continuous-growth': FaGraduationCap,
  'meaningful-impact': FaRocket,
};

const BENEFIT_ICONS = {
  flexibility: FaLaptop,
  learning: FaGraduationCap,
  compensation: FaMoneyBillWave,
  health: FaShieldAlt,
  ownership: FaBriefcase,
  innovation: FaLightbulb,
};

const ICON_FALLBACK = FaRocket;

const cultureIcon = (id) =>
  CULTURE_ICONS[id] || ICON_FALLBACK;

const benefitIcon = (id) =>
  BENEFIT_ICONS[id] || FaBriefcase;

const DEPARTMENT_ICONS = {
  engineering: FaCode,
  design: FaPaintBrush,
  product: FaRocket,
  operations: FaBuilding,
  default: FaBriefcase,
};

const Careers = () => {
  const navigate = useNavigate();

  const [
    positions,
    setPositions,
  ] = useState([]);

  const [
    careersContent,
    setCareersContent,
  ] = useState({
    cultureValues: [],
    benefits: [],
  });

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState('');

  const [searchTerm, setSearchTerm] =
    useState('');

  const [
    selectedDepartment,
    setSelectedDepartment,
  ] = useState('all');

  const [
    selectedType,
    setSelectedType,
  ] = useState('all');

  const [
    selectedWorkplace,
    setSelectedWorkplace,
  ] = useState('all');

  const [
    expandedJob,
    setExpandedJob,
  ] = useState(null);

  useEffect(() => {
    let mounted = true;

    const fetchCareers = async () => {
      setLoading(true);
      setError('');

      try {
        const response =
          await apiGet('/careers');

        if (!mounted) {
          return;
        }

        const records =
          Array.isArray(response)
            ? response
            : response?.data ||
              response?.careers ||
              response?.positions ||
              [];

        setPositions(
          records
            .filter(Boolean)
            .map(normalizePosition)
            .filter(
              (position) =>
                position.status ===
                  'PUBLISHED' &&
                position.isOpen
            )
            .sort(sortPositions)
        );
      } catch (requestError) {
        if (!mounted) {
          return;
        }

        setError(
          requestError?.message ||
            'We could not load the current vacancies.'
        );
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    fetchCareers();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    const fetchCareersContent = async () => {
      try {
        const content = await apiGet(
          '/site/careers_content'
        );

        if (!mounted) {
          return;
        }

        const cultureValues =
          Array.isArray(
            content?.cultureValues
          )
            ? content.cultureValues
            : [];

        const benefits =
          Array.isArray(content?.benefits)
            ? content.benefits
            : [];

        setCareersContent({
          cultureValues,
          benefits,
        });
      } catch {
        // Culture/benefits content is optional; the sections
        // simply stay empty if the Setting is missing.
      }
    };

    fetchCareersContent();

    return () => {
      mounted = false;
    };
  }, []);

  const departments = useMemo(
    () => [
      'all',
      ...Array.from(
        new Set(
          positions
            .map(
              (position) =>
                position.department
            )
            .filter(Boolean)
        )
      ).sort((first, second) =>
        first.localeCompare(second)
      ),
    ],
    [positions]
  );

  const employmentTypes = useMemo(
    () => [
      'all',
      ...Array.from(
        new Set(
          positions
            .map(
              (position) =>
                position.employmentType
            )
            .filter(Boolean)
        )
      ).sort((first, second) =>
        first.localeCompare(second)
      ),
    ],
    [positions]
  );

  const workplaceTypes = useMemo(
    () => [
      'all',
      ...Array.from(
        new Set(
          positions
            .map(
              (position) =>
                position.workplaceType
            )
            .filter(Boolean)
        )
      ).sort((first, second) =>
        first.localeCompare(second)
      ),
    ],
    [positions]
  );

  const filteredPositions = useMemo(
    () => {
      const query =
        searchTerm
          .trim()
          .toLowerCase();

      return positions.filter(
        (position) => {
          const matchesDepartment =
            selectedDepartment ===
              'all' ||
            position.department ===
              selectedDepartment;

          const matchesType =
            selectedType === 'all' ||
            position.employmentType ===
              selectedType;

          const matchesWorkplace =
            selectedWorkplace ===
              'all' ||
            position.workplaceType ===
              selectedWorkplace;

          if (
            !matchesDepartment ||
            !matchesType ||
            !matchesWorkplace
          ) {
            return false;
          }

          if (!query) {
            return true;
          }

          const searchableText = [
            position.title,
            position.department,
            position.location,
            position.employmentType,
            position.workplaceType,
            position.summary,
            position.description,
            ...position.requirements,
            ...position.technologies,
          ]
            .filter(Boolean)
            .join(' ')
            .toLowerCase();

          return searchableText.includes(
            query
          );
        }
      );
    },
    [
      positions,
      searchTerm,
      selectedDepartment,
      selectedType,
      selectedWorkplace,
    ]
  );

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedDepartment('all');
    setSelectedType('all');
    setSelectedWorkplace('all');
  };

  return (
    <main className="careers-page">
      <section className="careers-hero">
        <div className="container">
          <div className="careers-hero-layout">
            <div className="careers-hero-copy">
              <p className="careers-eyebrow">
                Careers at AngiSoft
              </p>

              <h1 className="careers-hero-title">
                Build What Matters
                With Us
              </h1>

              <p className="careers-hero-description">
                Join a growing African
                technology company
                building practical
                software, digital
                products and systems for
                businesses,
                institutions and
                communities.
              </p>

              <a
                href="#open-positions"
                className="careers-hero-action"
              >
                Explore Open Roles

                <FaArrowRight />
              </a>
            </div>

            <div className="careers-hero-summary">
              <CareerStatistic
                value={
                  loading
                    ? '—'
                    : positions.length
                }
                label="Open roles"
              />

              <CareerStatistic
                value={
                  loading
                    ? '—'
                    : Math.max(
                        departments.length -
                          1,
                        0
                      )
                }
                label="Departments"
              />

              <CareerStatistic
                value="Nairobi"
                label="Head office"
              />

              <CareerStatistic
                value="2024"
                label="Founded"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="careers-culture">
        <div className="container">
          <SectionHeading
            eyebrow="How We Work"
            title="A Culture Built Around Contribution"
            description="AngiSoft is still growing. That means every team member has an opportunity to influence how products are designed, developed and delivered."
          />

          <div className="careers-culture-list">
            {careersContent.cultureValues.map(
              (item) => (
                <CultureValue
                  key={item.id}
                  item={item}
                />
              )
            )}
          </div>
        </div>
      </section>

      <section
        id="open-positions"
        className="careers-openings"
      >
        <div className="container">
          <SectionHeading
            eyebrow="Current Opportunities"
            title="Open Positions"
            description="Browse the currently published vacancies and open a role to review its responsibilities, requirements and application details."
          />

          <div className="careers-filter-panel">
            <label className="careers-search">
              <FaSearch />

              <input
                type="search"
                value={searchTerm}
                onChange={(event) =>
                  setSearchTerm(
                    event.target.value
                  )
                }
                placeholder="Search roles, departments, technologies or locations"
                aria-label="Search career opportunities"
              />
            </label>

            <CareerSelect
              label="Department"
              value={
                selectedDepartment
              }
              onChange={
                setSelectedDepartment
              }
              options={departments}
            />

            <CareerSelect
              label="Employment"
              value={selectedType}
              onChange={
                setSelectedType
              }
              options={
                employmentTypes
              }
            />

            <CareerSelect
              label="Workplace"
              value={
                selectedWorkplace
              }
              onChange={
                setSelectedWorkplace
              }
              options={
                workplaceTypes
              }
            />
          </div>

          <div className="careers-results-header">
            <p>
              {loading
                ? 'Loading vacancies…'
                : `${filteredPositions.length} ${
                    filteredPositions.length ===
                    1
                      ? 'position'
                      : 'positions'
                  } found`}
            </p>

            {(searchTerm ||
              selectedDepartment !==
                'all' ||
              selectedType !== 'all' ||
              selectedWorkplace !==
                'all') && (
              <button
                type="button"
                onClick={clearFilters}
              >
                Clear filters
              </button>
            )}
          </div>

          {loading && (
            <CareersLoading />
          )}

          {!loading && error && (
            <CareersMessage
              icon={FaBriefcase}
              title="Vacancies Could Not Be Loaded"
              description={error}
            />
          )}

          {!loading &&
            !error &&
            positions.length ===
              0 && (
              <CareersMessage
                icon={FaBriefcase}
                title="No Published Vacancies"
                description="AngiSoft does not currently have any publicly advertised positions. You may still submit a general application below."
              />
            )}

          {!loading &&
            !error &&
            positions.length > 0 &&
            filteredPositions.length ===
              0 && (
              <CareersMessage
                icon={FaSearch}
                title="No Matching Positions"
                description="No vacancy matches the current search and filter settings."
              />
            )}

          {!loading &&
            !error &&
            filteredPositions.length >
              0 && (
              <div className="careers-job-list">
                {filteredPositions.map(
                  (position) => (
                    <JobAccordion
                      key={position.id}
                      position={
                        position
                      }
                      expanded={
                        expandedJob ===
                        position.id
                      }
                      onToggle={() =>
                        setExpandedJob(
                          expandedJob ===
                            position.id
                            ? null
                            : position.id
                        )
                      }
                    />
                  )
                )}
              </div>
            )}
        </div>
      </section>

      <section className="careers-benefits">
        <div className="container careers-benefits-layout">
          <div className="careers-benefits-intro">
            <SectionHeading
              eyebrow="Benefits and Support"
              title="What Team Members Can Expect"
              description="Our employee benefits will continue developing as AngiSoft grows. The focus is on creating a fair, productive and supportive working environment."
            />
          </div>

          <div className="careers-benefit-list">
            {careersContent.benefits.map(
              (benefit) => (
                <BenefitItem
                  key={benefit.id}
                  benefit={
                    benefit
                  }
                />
              )
            )}
          </div>
        </div>
      </section>

      <section className="careers-general-application">
        <div className="container">
          <div className="careers-general-shell">
            <div>
              <p className="careers-eyebrow">
                General Application
              </p>

              <h2>
                Do Not See the Right
                Role?
              </h2>

              <p>
                Send your resume and a
                short explanation of
                what you can contribute.
                We will keep suitable
                profiles for future
                opportunities.
              </p>
            </div>

            <div className="careers-general-actions">
              <a
                href="mailto:careers@angisoft.co.ke?subject=General Career Application"
                className="careers-general-primary"
              >
                <FaEnvelope />

                Send Your Resume
              </a>

              <button
                type="button"
                onClick={() =>
                  navigate('/contact')
                }
                className="careers-general-secondary"
              >
                Contact AngiSoft

                <FaArrowRight />
              </button>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
};

const CareerStatistic = ({
  value,
  label,
}) => (
  <div className="careers-statistic">
    <strong>
      {value}
    </strong>

    <span>
      {label}
    </span>
  </div>
);

const SectionHeading = ({
  eyebrow,
  title,
  description,
}) => (
  <header className="careers-section-heading">
    {eyebrow && (
      <p className="careers-eyebrow">
        {eyebrow}
      </p>
    )}

    <h2>
      {title}
    </h2>

    {description && (
      <p className="careers-section-description">
        {description}
      </p>
    )}
  </header>
);

const CultureValue = ({
  item,
}) => {
  const Icon = cultureIcon(item.id);

  return (
    <article className="careers-culture-item">
      <span className="careers-culture-number">
        {item.number}
      </span>

      <div className="careers-culture-icon">
        <Icon />
      </div>

      <div>
        <h3>
          {item.title}
        </h3>

        <p>
          {item.description}
        </p>
      </div>
    </article>
  );
};

const CareerSelect = ({
  label,
  value,
  onChange,
  options,
}) => (
  <label className="careers-select">
    <span>
      {label}
    </span>

    <select
      value={value}
      onChange={(event) =>
        onChange(event.target.value)
      }
    >
      {options.map((option) => (
        <option
          key={option}
          value={option}
        >
          {option === 'all'
            ? `All ${label}s`
            : option}
        </option>
      ))}
    </select>
  </label>
);

const JobAccordion = ({
  position,
  expanded,
  onToggle,
}) => {
  const DepartmentIcon =
    getDepartmentIcon(
      position.department
    );

  const salary =
    formatSalary(position);

  return (
    <article
      className={`careers-job ${
        expanded
          ? 'is-expanded'
          : ''
      }`}
    >
      <button
        type="button"
        className="careers-job-trigger"
        onClick={onToggle}
        aria-expanded={expanded}
      >
        <div className="careers-job-icon">
          <DepartmentIcon />
        </div>

        <div className="careers-job-heading">
          <div className="careers-job-title-row">
            <h3>
              {position.title}
            </h3>

            {position.featured && (
              <span className="careers-job-featured">
                Featured
              </span>
            )}
          </div>

          <div className="careers-job-meta">
            {position.department && (
              <span>
                <FaBuilding />

                {
                  position.department
                }
              </span>
            )}

            {position.location && (
              <span>
                <FaMapMarkerAlt />

                {position.location}
              </span>
            )}

            {position.employmentType && (
              <span>
                <FaClock />

                {
                  position.employmentType
                }
              </span>
            )}

            {position.workplaceType && (
              <span>
                <FaLaptop />

                {
                  position.workplaceType
                }
              </span>
            )}
          </div>
        </div>

        <span className="careers-job-toggle">
          <FaChevronDown />
        </span>
      </button>

      <div className="careers-job-panel">
        <div className="careers-job-panel-inner">
          {position.summary && (
            <p className="careers-job-summary">
              {position.summary}
            </p>
          )}

          {position.description && (
            <div className="careers-job-description">
              {
                position.description
              }
            </div>
          )}

          <div className="careers-job-detail-grid">
            {position.responsibilities
              .length > 0 && (
              <JobList
                title="Responsibilities"
                items={
                  position.responsibilities
                }
              />
            )}

            {position.requirements
              .length > 0 && (
              <JobList
                title="Requirements"
                items={
                  position.requirements
                }
              />
            )}

            {position.preferredQualifications
              .length > 0 && (
              <JobList
                title="Preferred Qualifications"
                items={
                  position.preferredQualifications
                }
              />
            )}

            {position.technologies
              .length > 0 && (
              <div className="careers-job-technologies">
                <h4>
                  Technologies and
                  Tools
                </h4>

                <div>
                  {position.technologies.map(
                    (
                      technology
                    ) => (
                      <span
                        key={
                          technology
                        }
                      >
                        {
                          technology
                        }
                      </span>
                    )
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="careers-job-footer">
            <div className="careers-job-facts">
              {salary && (
                <span>
                  <FaMoneyBillWave />

                  {salary}
                </span>
              )}

              {position.experienceLevel && (
                <span>
                  <FaBriefcase />

                  {
                    position.experienceLevel
                  }
                </span>
              )}

              {position.applicationDeadline && (
                <span>
                  <FaClock />

                  Apply by{' '}
                  {formatDate(
                    position.applicationDeadline
                  )}
                </span>
              )}
            </div>

            <div className="careers-job-actions">
              {position.slug && (
                <Link
                  to={`/careers/${position.slug}`}
                  className="careers-job-secondary-action"
                >
                  View Full Details
                </Link>
              )}

              <Link
                to={
                  position.slug
                    ? `/careers/${position.slug}/apply`
                    : `/careers/${position.id}/apply`
                }
                className="careers-job-primary-action"
              >
                Apply for This Role

                <FaArrowRight />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
};

const JobList = ({
  title,
  items,
}) => (
  <div className="careers-job-list-block">
    <h4>
      {title}
    </h4>

    <ul>
      {items.map((item) => (
        <li key={item}>
          <FaCheck />

          <span>
            {item}
          </span>
        </li>
      ))}
    </ul>
  </div>
);

const BenefitItem = ({
  benefit,
}) => {
  const Icon = benefitIcon(benefit.id);

  return (
    <article className="careers-benefit-item">
      <div className="careers-benefit-icon">
        <Icon />
      </div>

      <div>
        <h3>
          {benefit.title}
        </h3>

        <p>
          {benefit.description}
        </p>
      </div>
    </article>
  );
};

const CareersLoading = () => (
  <div className="careers-status">
    <div className="careers-spinner" />

    <p>
      Loading published vacancies…
    </p>
  </div>
);

const CareersMessage = ({
  icon: Icon,
  title,
  description,
}) => (
  <div className="careers-status">
    <Icon />

    <h3>
      {title}
    </h3>

    <p>
      {description}
    </p>
  </div>
);

const normalizePosition = (
  position,
  index
) => {
  const status =
    String(
      position?.status ||
        'PUBLISHED'
    ).toUpperCase();

  const closedStatuses = [
    'CLOSED',
    'ARCHIVED',
    'DRAFT',
    'FILLED',
    'CANCELLED',
  ];

  const deadline =
    position?.applicationDeadline ||
    position?.deadline ||
    '';

  const deadlinePassed =
    deadline &&
    !Number.isNaN(
      new Date(deadline).getTime()
    )
      ? new Date(deadline) <
        new Date()
      : false;

  return {
    ...position,

    id:
      position?.id ||
      position?.slug ||
      `career-${index}`,

    slug:
      position?.slug ||
      '',

    title:
      position?.title ||
      position?.name ||
      'Career Opportunity',

    department:
      position?.department ||
      position?.team ||
      'Other',

    employmentType:
      formatLabel(
        position?.employmentType ||
          position?.type ||
          'Full-Time'
      ),

    workplaceType:
      formatLabel(
        position?.workplaceType ||
          position?.workMode ||
          position?.remoteType ||
          ''
      ),

    location:
      position?.location ||
      '',

    summary:
      position?.summary ||
      position?.shortDescription ||
      '',

    description:
      position?.description ||
      '',

    responsibilities:
      normalizeStringArray(
        position?.responsibilities
      ),

    requirements:
      normalizeStringArray(
        position?.requirements
      ),

    preferredQualifications:
      normalizeStringArray(
        position?.preferredQualifications ||
          position?.preferredRequirements
      ),

    technologies:
      normalizeStringArray(
        position?.technologies ||
          position?.techStack
      ),

    salaryMin:
      toNumber(
        position?.salaryMin
      ),

    salaryMax:
      toNumber(
        position?.salaryMax
      ),

    salaryCurrency:
      position?.salaryCurrency ||
      'KES',

    salaryVisibility:
      position?.salaryVisibility !==
        false,

    experienceLevel:
      position?.experienceLevel ||
      '',

    applicationDeadline:
      deadline,

    openings:
      toNumber(
        position?.openings
      ),

    featured:
      position?.featured === true ||
      position?.isFeatured ===
        true,

    publishedAt:
      position?.publishedAt ||
      position?.createdAt ||
      '',

    status,

    isOpen:
      !closedStatuses.includes(
        status
      ) &&
      position?.isOpen !== false &&
      !deadlinePassed,
  };
};

const normalizeStringArray = (
  value
) => {
  if (Array.isArray(value)) {
    return value
      .map((item) =>
        typeof item === 'string'
          ? item.trim()
          : item?.name ||
            item?.label ||
            item?.title ||
            ''
      )
      .filter(Boolean);
  }

  if (typeof value === 'string') {
    return value
      .split(/\r?\n|,/)
      .map((item) =>
        item
          .replace(/^[-•]\s*/, '')
          .trim()
      )
      .filter(Boolean);
  }

  return [];
};

const sortPositions = (
  first,
  second
) => {
  if (
    first.featured !==
    second.featured
  ) {
    return first.featured
      ? -1
      : 1;
  }

  const firstDate =
    new Date(
      first.publishedAt || 0
    ).getTime();

  const secondDate =
    new Date(
      second.publishedAt || 0
    ).getTime();

  return secondDate - firstDate;
};

const getDepartmentIcon = (
  department
) => {
  const normalized =
    String(
      department || ''
    ).toLowerCase();

  const key =
    Object.keys(
      DEPARTMENT_ICONS
    ).find(
      (departmentKey) =>
        departmentKey !==
          'default' &&
        normalized.includes(
          departmentKey
        )
    );

  return (
    DEPARTMENT_ICONS[key] ||
    DEPARTMENT_ICONS.default
  );
};

const formatSalary = (
  position
) => {
  if (
    position.salaryVisibility ===
      false ||
    (
      !position.salaryMin &&
      !position.salaryMax
    )
  ) {
    return '';
  }

  const formatter =
    new Intl.NumberFormat(
      'en-KE',
      {
        maximumFractionDigits: 0,
      }
    );

  if (
    position.salaryMin &&
    position.salaryMax
  ) {
    return `${
      position.salaryCurrency
    } ${formatter.format(
      position.salaryMin
    )} – ${formatter.format(
      position.salaryMax
    )}`;
  }

  const value =
    position.salaryMin ||
    position.salaryMax;

  return `${
    position.salaryCurrency
  } ${formatter.format(value)}`;
};

const formatDate = (
  value
) => {
  if (!value) {
    return '';
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return String(value);
  }

  return date.toLocaleDateString(
    'en-KE',
    {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }
  );
};

const formatLabel = (
  value
) => {
  if (!value) {
    return '';
  }

  return String(value)
    .replaceAll('_', ' ')
    .replaceAll('-', ' ')
    .toLowerCase()
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase()
    );
};

const toNumber = (
  value
) => {
  const number =
    Number(value);

  return Number.isFinite(number)
    ? number
    : 0;
};

export default Careers;