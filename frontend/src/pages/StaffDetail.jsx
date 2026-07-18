import React, {
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  Link,
  useNavigate,
  useParams,
} from 'react-router-dom';
import {
  FaArrowLeft,
  FaArrowRight,
  FaAward,
  FaBriefcase,
  FaCalendarAlt,
  FaCertificate,
  FaDownload,
  FaEnvelope,
  FaExternalLinkAlt,
  FaGithub,
  FaGlobe,
  FaGraduationCap,
  FaLinkedinIn,
  FaMapMarkerAlt,
  FaNewspaper,
  FaPhoneAlt,
  FaProjectDiagram,
  FaTools,
  FaTwitter,
  FaUser,
} from 'react-icons/fa';

import { apiGet } from '../js/httpClient';
import {
  resolveAssetUrl,
} from '../utils/constants';
import {
  getBlogDetailPath,
  getProjectDetailPath,
  getServiceDetailPath,
} from '../utils/detailPaths';

import '../css/staff-detail.css';

const DEFAULT_SECTION_ORDER = [
  'about',
  'experience',
  'projects',
  'services',
  'skills',
  'education',
  'certifications',
  'achievements',
  'articles',
  'documents',
  'contact',
];

const SECTION_DEFINITIONS = {
  about: {
    label: 'About',
    icon: FaUser,
  },

  experience: {
    label: 'Experience',
    icon: FaBriefcase,
  },

  projects: {
    label: 'Projects',
    icon: FaProjectDiagram,
  },

  services: {
    label: 'Services',
    icon: FaTools,
  },

  skills: {
    label: 'Skills',
    icon: FaTools,
  },

  education: {
    label: 'Education',
    icon: FaGraduationCap,
  },

  certifications: {
    label: 'Certifications',
    icon: FaCertificate,
  },

  achievements: {
    label: 'Achievements',
    icon: FaAward,
  },

  articles: {
    label: 'Articles',
    icon: FaNewspaper,
  },

  documents: {
    label: 'Documents',
    icon: FaDownload,
  },

  contact: {
    label: 'Contact',
    icon: FaEnvelope,
  },
};

const StaffDetail = () => {
  const {
    usernameOrId,
  } = useParams();

  const navigate = useNavigate();

  const [staff, setStaff] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState('');

  const [
    activeSection,
    setActiveSection,
  ] = useState('about');

  useEffect(() => {
    let mounted = true;

    const fetchPortfolio =
      async () => {
        setLoading(true);
        setError('');

        try {
          const response =
            await apiGet(
              `/staff/${usernameOrId}`
            );

          if (!mounted) {
            return;
          }

          const record =
            response?.data ||
            response;

          if (
            !record ||
            record.profileVisibility ===
              'PRIVATE'
          ) {
            throw new Error(
              'This portfolio is not publicly available.'
            );
          }

          setStaff(
            normalizeStaffPortfolio(
              record
            )
          );
        } catch (requestError) {
          if (!mounted) {
            return;
          }

          setError(
            requestError?.message ||
              'The requested staff portfolio could not be loaded.'
          );
        } finally {
          if (mounted) {
            setLoading(false);
          }
        }
      };

    if (usernameOrId) {
      fetchPortfolio();
    }

    return () => {
      mounted = false;
    };
  }, [usernameOrId]);

  const publicSections =
    useMemo(() => {
      if (!staff) {
        return [];
      }

      return staff.sectionOrder
        .filter(
          (sectionKey) =>
            isSectionPublic(
              staff,
              sectionKey
            ) &&
            sectionHasContent(
              staff,
              sectionKey
            )
        )
        .map((sectionKey) => ({
          key: sectionKey,
          ...SECTION_DEFINITIONS[
            sectionKey
          ],
          customTitle:
            staff.sectionSettings[
              sectionKey
            ]?.customTitle ||
            '',
        }));
    }, [staff]);

  useEffect(() => {
    if (!publicSections.length) {
      return undefined;
    }

    const observer =
      new IntersectionObserver(
        (entries) => {
          const visibleEntry =
            entries
              .filter(
                (entry) =>
                  entry.isIntersecting
              )
              .sort(
                (
                  first,
                  second
                ) =>
                  second.intersectionRatio -
                  first.intersectionRatio
              )[0];

          if (visibleEntry) {
            setActiveSection(
              visibleEntry.target
                .dataset.section
            );
          }
        },
        {
          rootMargin:
            '-28% 0px -58% 0px',
          threshold: [
            0.05,
            0.2,
            0.5,
          ],
        }
      );

    publicSections.forEach(
      (section) => {
        const node =
          document.getElementById(
            `portfolio-${section.key}`
          );

        if (node) {
          observer.observe(node);
        }
      }
    );

    return () => {
      observer.disconnect();
    };
  }, [publicSections]);

  if (loading) {
    return (
      <PortfolioLoading />
    );
  }

  if (error || !staff) {
    return (
      <PortfolioError
        message={
          error ||
          'Portfolio not found.'
        }
        onBack={() =>
          navigate('/staff')
        }
      />
    );
  }

  const scrollToSection = (
    sectionKey
  ) => {
    const node =
      document.getElementById(
        `portfolio-${sectionKey}`
      );

    if (!node) {
      return;
    }

    node.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  };

  return (
    <main className="staff-portfolio">
      <section className="staff-portfolio-hero">
        <div className="container">
          <button
            type="button"
            onClick={() =>
              navigate('/staff')
            }
            className="staff-portfolio-back"
          >
            <FaArrowLeft />

            Back to Team
          </button>

          <div className="staff-portfolio-hero-layout">
            <PortfolioPortrait
              staff={staff}
            />

            <div className="staff-portfolio-intro">
              <p className="staff-portfolio-company">
                AngiSoft Team
              </p>

              <h1 className="staff-portfolio-name">
                {staff.fullName}
              </h1>

              {staff.publicTitle && (
                <p className="staff-portfolio-title">
                  {
                    staff.publicTitle
                  }
                </p>
              )}

              {staff.publicSummary && (
                <p className="staff-portfolio-summary">
                  {
                    staff.publicSummary
                  }
                </p>
              )}

              <PortfolioContactRow
                staff={staff}
              />

              <PortfolioSocials
                staff={staff}
              />

              {staff.availabilityStatus && (
                <p className="staff-portfolio-availability">
                  <span />

                  {
                    staff.availabilityStatus
                  }
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      {publicSections.length >
        0 && (
        <nav className="staff-portfolio-nav">
          <div className="container staff-portfolio-nav-inner">
            {publicSections.map(
              (section) => (
                <button
                  key={section.key}
                  type="button"
                  onClick={() =>
                    scrollToSection(
                      section.key
                    )
                  }
                  className={`staff-portfolio-nav-link ${
                    activeSection ===
                    section.key
                      ? 'is-active'
                      : ''
                  }`}
                >
                  {section.customTitle ||
                    section.label}
                </button>
              )
            )}
          </div>
        </nav>
      )}

      <section className="staff-portfolio-body">
        <div className="container staff-portfolio-layout">
          <PortfolioSidebar
            staff={staff}
          />

          <div className="staff-portfolio-content">
            {publicSections.map(
              (
                section,
                index
              ) => (
                <PortfolioSectionRenderer
                  key={section.key}
                  section={section}
                  index={index}
                  staff={staff}
                />
              )
            )}
          </div>
        </div>
      </section>
    </main>
  );
};

const PortfolioSectionRenderer = ({
  section,
  index,
  staff,
}) => {
  const commonProps = {
    id:
      `portfolio-${section.key}`,
    sectionKey:
      section.key,
    index,
    title:
      section.customTitle ||
      section.label,
  };

  switch (section.key) {
    case 'about':
      return (
        <AboutSection
          {...commonProps}
          staff={staff}
        />
      );

    case 'experience':
      return (
        <ExperienceSection
          {...commonProps}
          items={
            staff.experience
          }
        />
      );

    case 'projects':
      return (
        <ProjectsSection
          {...commonProps}
          items={
            staff.projects
          }
        />
      );

    case 'services':
      return (
        <ServicesSection
          {...commonProps}
          items={
            staff.services
          }
        />
      );

    case 'skills':
      return (
        <SkillsSection
          {...commonProps}
          skills={
            staff.skills
          }
          specialties={
            staff.specialties
          }
          technologies={
            staff.technologies
          }
        />
      );

    case 'education':
      return (
        <EducationSection
          {...commonProps}
          items={
            staff.education
          }
        />
      );

    case 'certifications':
      return (
        <CertificationsSection
          {...commonProps}
          items={
            staff.certifications
          }
        />
      );

    case 'achievements':
      return (
        <AchievementsSection
          {...commonProps}
          items={
            staff.achievements
          }
        />
      );

    case 'articles':
      return (
        <ArticlesSection
          {...commonProps}
          items={
            staff.posts
          }
        />
      );

    case 'documents':
      return (
        <DocumentsSection
          {...commonProps}
          items={
            staff.documents
          }
        />
      );

    case 'contact':
      return (
        <ContactSection
          {...commonProps}
          staff={staff}
        />
      );

    default:
      return null;
  }
};

const PortfolioSection = ({
  id,
  sectionKey,
  index,
  title,
  children,
}) => (
  <section
    id={id}
    data-section={sectionKey}
    className="staff-portfolio-section"
  >
    <header className="staff-portfolio-section-header">
      <span className="staff-portfolio-section-index">
        {String(index + 1).padStart(
          2,
          '0'
        )}
      </span>

      <h2 className="staff-portfolio-section-title">
        {title}
      </h2>
    </header>

    {children}
  </section>
);

const AboutSection = ({
  staff,
  ...props
}) => (
  <PortfolioSection {...props}>
    <div className="staff-portfolio-prose">
      {staff.bio ||
        staff.publicSummary}
    </div>
  </PortfolioSection>
);

const ExperienceSection = ({
  items,
  ...props
}) => (
  <PortfolioSection {...props}>
    <div className="staff-experience-list">
      {items.map((item) => (
        <article
          key={item.id}
          className="staff-experience-item"
        >
          <p className="staff-experience-period">
            {formatPeriod(
              item.startedAt,
              item.endedAt,
              item.current
            )}
          </p>

          <div className="staff-experience-content">
            <h3>
              {item.role}
            </h3>

            <p className="staff-experience-company">
              {[
                item.company,
                item.location,
              ]
                .filter(Boolean)
                .join(' • ')}
            </p>

            {item.description && (
              <p className="staff-experience-description">
                {
                  item.description
                }
              </p>
            )}

            {item.responsibilities
              .length > 0 && (
              <ul className="staff-experience-responsibilities">
                {item.responsibilities.map(
                  (
                    responsibility
                  ) => (
                    <li
                      key={
                        responsibility
                      }
                    >
                      {
                        responsibility
                      }
                    </li>
                  )
                )}
              </ul>
            )}
          </div>
        </article>
      ))}
    </div>
  </PortfolioSection>
);

const ProjectsSection = ({
  items,
  ...props
}) => (
  <PortfolioSection {...props}>
    <div className="staff-project-list">
      {items.map((project) => (
        <article
          key={project.id}
          className="staff-project-item"
        >
          <div>
            <h3 className="staff-project-title">
              {project.title}
            </h3>

            {project.staffRole && (
              <p className="staff-project-role">
                {
                  project.staffRole
                }
              </p>
            )}

            {(project.startedAt ||
              project.endedAt) && (
              <p className="staff-project-period">
                {formatPeriod(
                  project.startedAt,
                  project.endedAt,
                  project.current
                )}
              </p>
            )}
          </div>

          <div>
            {project.staffSummary ||
            project.description ? (
              <p className="staff-project-summary">
                {project.staffSummary ||
                  project.description}
              </p>
            ) : null}

            {project.responsibilities
              .length > 0 && (
              <ul className="staff-project-responsibilities">
                {project.responsibilities.map(
                  (item) => (
                    <li key={item}>
                      {item}
                    </li>
                  )
                )}
              </ul>
            )}

            {project.technologies
              .length > 0 && (
              <div className="staff-project-technologies">
                {project.technologies.map(
                  (
                    technology
                  ) => (
                    <span
                      key={
                        technology
                      }
                      className="staff-project-technology"
                    >
                      {
                        technology
                      }
                    </span>
                  )
                )}
              </div>
            )}

            {project.outcomes
              .length > 0 && (
              <div className="staff-project-outcomes">
                {project.outcomes.map(
                  (outcome) => (
                    <p
                      key={
                        outcome
                      }
                    >
                      {outcome}
                    </p>
                  )
                )}
              </div>
            )}
          </div>

          <Link
            to={getProjectDetailPath(
              project
            )}
            className="staff-project-link"
          >
            View Project

            <FaArrowRight />
          </Link>
        </article>
      ))}
    </div>
  </PortfolioSection>
);

const ServicesSection = ({
  items,
  ...props
}) => (
  <PortfolioSection {...props}>
    <div className="staff-service-list">
      {items.map((service) => (
        <Link
          key={service.id}
          to={getServiceDetailPath(
            service
          )}
          className="staff-service-item"
        >
          <div>
            <h3>
              {service.title}
            </h3>

            {service.description && (
              <p>
                {
                  service.description
                }
              </p>
            )}
          </div>

          <FaArrowRight />
        </Link>
      ))}
    </div>
  </PortfolioSection>
);

const SkillsSection = ({
  skills,
  specialties,
  technologies,
  ...props
}) => {
  const groups = [
    {
      title: 'Core Skills',
      items: skills,
    },
    {
      title: 'Specialties',
      items: specialties,
    },
    {
      title:
        'Technologies and Tools',
      items: technologies,
    },
  ].filter(
    (group) =>
      group.items.length > 0
  );

  return (
    <PortfolioSection {...props}>
      <div className="staff-skill-groups">
        {groups.map((group) => (
          <article
            key={group.title}
            className="staff-skill-group"
          >
            <h3>
              {group.title}
            </h3>

            <div className="staff-skill-tags">
              {group.items.map(
                (item) => (
                  <span
                    key={item}
                    className="staff-skill-tag"
                  >
                    {item}
                  </span>
                )
              )}
            </div>
          </article>
        ))}
      </div>
    </PortfolioSection>
  );
};

const EducationSection = ({
  items,
  ...props
}) => (
  <PortfolioSection {...props}>
    <div className="staff-education-list">
      {items.map((item) => (
        <article
          key={item.id}
          className="staff-education-item"
        >
          <div className="staff-education-icon">
            <FaGraduationCap />
          </div>

          <div>
            <h3>
              {item.qualification}
            </h3>

            <p>
              {item.institution}
            </p>

            {(item.startedAt ||
              item.endedAt) && (
              <span>
                {formatPeriod(
                  item.startedAt,
                  item.endedAt,
                  item.current
                )}
              </span>
            )}

            {item.description && (
              <div>
                {
                  item.description
                }
              </div>
            )}
          </div>
        </article>
      ))}
    </div>
  </PortfolioSection>
);

const CertificationsSection = ({
  items,
  ...props
}) => (
  <PortfolioSection {...props}>
    <div className="staff-certification-list">
      {items.map((item) => (
        <article
          key={item.id}
          className="staff-certification-item"
        >
          <FaCertificate />

          <div>
            <h3>
              {item.title}
            </h3>

            <p>
              {[
                item.issuer,
                formatDate(
                  item.issuedAt
                ),
              ]
                .filter(Boolean)
                .join(' • ')}
            </p>

            {item.credentialUrl && (
              <a
                href={
                  item.credentialUrl
                }
                target="_blank"
                rel="noreferrer"
              >
                Verify Credential

                <FaExternalLinkAlt />
              </a>
            )}
          </div>
        </article>
      ))}
    </div>
  </PortfolioSection>
);

const AchievementsSection = ({
  items,
  ...props
}) => (
  <PortfolioSection {...props}>
    <div className="staff-achievement-list">
      {items.map((item) => (
        <article
          key={item.id}
          className="staff-achievement-item"
        >
          <span>
            <FaAward />
          </span>

          <div>
            <h3>
              {item.title}
            </h3>

            {item.date && (
              <p>
                {formatDate(
                  item.date
                )}
              </p>
            )}

            {item.description && (
              <div>
                {
                  item.description
                }
              </div>
            )}
          </div>
        </article>
      ))}
    </div>
  </PortfolioSection>
);

const ArticlesSection = ({
  items,
  ...props
}) => (
  <PortfolioSection {...props}>
    <div className="staff-article-list">
      {items.map((post) => (
        <Link
          key={post.id}
          to={getBlogDetailPath(
            post
          )}
          className="staff-article-item"
        >
          <span className="staff-article-date">
            {formatDate(
              post.publishedAt ||
                post.createdAt
            )}
          </span>

          <div>
            <h3 className="staff-article-title">
              {post.title}
            </h3>

            {post.excerpt && (
              <p className="staff-article-excerpt">
                {post.excerpt}
              </p>
            )}
          </div>

          <FaArrowRight className="staff-article-arrow" />
        </Link>
      ))}
    </div>
  </PortfolioSection>
);

const DocumentsSection = ({
  items,
  ...props
}) => (
  <PortfolioSection {...props}>
    <div className="staff-document-list">
      {items.map((document) => (
        <a
          key={document.id}
          href={resolveAssetUrl(
            document.url
          )}
          target="_blank"
          rel="noreferrer"
          className="staff-document-item"
        >
          <FaDownload />

          <div>
            <h3>
              {document.label ||
                document.filename}
            </h3>

            {document.description && (
              <p>
                {
                  document.description
                }
              </p>
            )}
          </div>

          <FaExternalLinkAlt />
        </a>
      ))}
    </div>
  </PortfolioSection>
);

const ContactSection = ({
  staff,
  ...props
}) => (
  <PortfolioSection {...props}>
    <div className="staff-contact-panel">
      <div>
        <h3>
          Work With{' '}
          {staff.firstName ||
            staff.fullName}
        </h3>

        <p>
          Use the public contact
          details selected by this
          staff member to discuss
          projects, collaboration,
          technical work or
          professional opportunities.
        </p>
      </div>

      <div className="staff-contact-actions">
        {staff.publicEmail && (
          <a
            href={`mailto:${staff.publicEmail}`}
          >
            <FaEnvelope />

            {
              staff.publicEmail
            }
          </a>
        )}

        {staff.publicPhone && (
          <a
            href={`tel:${normalizePhone(
              staff.publicPhone
            )}`}
          >
            <FaPhoneAlt />

            {
              staff.publicPhone
            }
          </a>
        )}

        {staff.websiteUrl && (
          <a
            href={
              staff.websiteUrl
            }
            target="_blank"
            rel="noreferrer"
          >
            <FaGlobe />

            Visit Website
          </a>
        )}
      </div>
    </div>
  </PortfolioSection>
);

const PortfolioPortrait = ({
  staff,
}) => (
  <div className="staff-portfolio-portrait">
    {staff.avatarUrl ? (
      <img
        src={resolveAssetUrl(
          staff.avatarUrl
        )}
        alt={staff.fullName}
      />
    ) : (
      <div className="staff-portfolio-portrait-fallback">
        {staff.initials}
      </div>
    )}
  </div>
);

const PortfolioContactRow = ({
  staff,
}) => {
  const items = [
    staff.location && {
      label: staff.location,
      icon: FaMapMarkerAlt,
    },

    staff.publicEmail && {
      label:
        staff.publicEmail,
      href:
        `mailto:${staff.publicEmail}`,
      icon: FaEnvelope,
    },

    staff.publicPhone && {
      label:
        staff.publicPhone,
      href:
        `tel:${normalizePhone(
          staff.publicPhone
        )}`,
      icon: FaPhoneAlt,
    },
  ].filter(Boolean);

  if (!items.length) {
    return null;
  }

  return (
    <div className="staff-portfolio-contact-row">
      {items.map((item) => {
        const Icon = item.icon;

        const content = (
          <>
            <Icon />

            <span>
              {item.label}
            </span>
          </>
        );

        return item.href ? (
          <a
            key={item.label}
            href={item.href}
            className="staff-portfolio-contact"
          >
            {content}
          </a>
        ) : (
          <span
            key={item.label}
            className="staff-portfolio-contact"
          >
            {content}
          </span>
        );
      })}
    </div>
  );
};

const PortfolioSocials = ({
  staff,
}) => {
  const links = [
    {
      label: 'LinkedIn',
      href: staff.linkedinUrl,
      icon: FaLinkedinIn,
    },
    {
      label: 'GitHub',
      href: staff.githubUrl,
      icon: FaGithub,
    },
    {
      label: 'Twitter',
      href: staff.twitterUrl,
      icon: FaTwitter,
    },
    {
      label: 'Website',
      href: staff.websiteUrl,
      icon: FaGlobe,
    },
  ].filter(
    (item) => item.href
  );

  if (!links.length) {
    return null;
  }

  return (
    <div className="staff-portfolio-socials">
      {links.map((item) => {
        const Icon = item.icon;

        return (
          <a
            key={item.label}
            href={item.href}
            target="_blank"
            rel="noreferrer"
            className="staff-portfolio-social"
            aria-label={`${staff.fullName} on ${item.label}`}
          >
            <Icon />
          </a>
        );
      })}
    </div>
  );
};

const PortfolioSidebar = ({
  staff,
}) => {
  const facts = [
    staff.publicTitle && {
      label: 'Role',
      value:
        staff.publicTitle,
    },

    staff.department && {
      label: 'Department',
      value:
        staff.department,
    },

    staff.location && {
      label: 'Location',
      value:
        staff.location,
    },

    staff.yearsOfExperience && {
      label: 'Experience',
      value:
        `${staff.yearsOfExperience}+ years`,
    },

    staff.languages.length >
      0 && {
      label: 'Languages',
      value:
        staff.languages.join(
          ', '
        ),
    },

    staff.availabilityStatus && {
      label: 'Availability',
      value:
        staff.availabilityStatus,
    },
  ].filter(Boolean);

  const cvDocument =
    staff.documents.find(
      (document) =>
        document.type === 'CV' ||
        document.type ===
          'RESUME'
    );

  return (
    <aside className="staff-portfolio-sidebar">
      {facts.length > 0 && (
        <dl className="staff-profile-facts">
          {facts.map((fact) => (
            <div
              key={fact.label}
              className="staff-profile-fact"
            >
              <dt>
                {fact.label}
              </dt>

              <dd>
                {fact.value}
              </dd>
            </div>
          ))}
        </dl>
      )}

      {cvDocument && (
        <a
          href={resolveAssetUrl(
            cvDocument.url
          )}
          target="_blank"
          rel="noreferrer"
          className="staff-portfolio-download"
        >
          <span>
            Download CV
          </span>

          <FaDownload />
        </a>
      )}

      {staff.skills.length >
        0 && (
        <div className="staff-sidebar-skills">
          <h3>
            Key Skills
          </h3>

          <div>
            {staff.skills
              .slice(0, 8)
              .map((skill) => (
                <span
                  key={skill}
                >
                  {skill}
                </span>
              ))}
          </div>
        </div>
      )}
    </aside>
  );
};

const PortfolioLoading = () => (
  <main className="staff-portfolio-loading">
    <div />

    <p>
      Loading portfolio…
    </p>
  </main>
);

const PortfolioError = ({
  message,
  onBack,
}) => (
  <main className="staff-portfolio-error">
    <div>
      <h1>
        Portfolio Unavailable
      </h1>

      <p>
        {message}
      </p>

      <button
        type="button"
        onClick={onBack}
      >
        <FaArrowLeft />

        Back to Team
      </button>
    </div>
  </main>
);

const normalizeStaffPortfolio = (
  record
) => {
  const firstName =
    record?.firstName ||
    record?.first_name ||
    '';

  const lastName =
    record?.lastName ||
    record?.last_name ||
    '';

  const fullName =
    record?.fullName ||
    record?.displayName ||
    [firstName, lastName]
      .filter(Boolean)
      .join(' ') ||
    record?.username ||
    'AngiSoft Team Member';

  const sectionSettings =
    normalizeSectionSettings(
      record?.sectionSettings ||
      record?.publicSections ||
      {}
    );

  const sectionOrder =
    normalizeSectionOrder(
      record?.sectionOrder,
      sectionSettings
    );

  return {
    ...record,

    firstName,
    lastName,
    fullName,

    initials: fullName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((item) => item[0])
      .join('')
      .toUpperCase(),

    publicTitle:
      record?.publicTitle ||
      record?.title ||
      formatRole(record?.role),

    avatarUrl:
      record?.avatarUrl ||
      record?.profileImageUrl ||
      record?.photoUrl ||
      '',

    publicSummary:
      record?.publicSummary ||
      record?.summary ||
      '',

    bio:
      record?.bio ||
      record?.about ||
      '',

    skills:
      normalizeStringArray(
        record?.skills
      ),

    specialties:
      normalizeStringArray(
        record?.specialties
      ),

    technologies:
      normalizeStringArray(
        record?.technologies ||
        record?.tools
      ),

    languages:
      normalizeStringArray(
        record?.languages
      ),

    experience:
      normalizeExperience(
        record?.experience ||
        record?.workExperience
      ),

    education:
      normalizeEducation(
        record?.education
      ),

    certifications:
      normalizeCertifications(
        record?.certifications
      ),

    achievements:
      normalizeAchievements(
        record?.achievements ||
        record?.awards
      ),

    projects:
      normalizeProjects(
        record?.projects
      ),

    services:
      normalizeCollection(
        record?.services
      ),

    posts:
      normalizeCollection(
        record?.posts ||
        record?.articles
      ),

    documents:
      normalizeDocuments(
        record?.documents
      ),

    sectionSettings,
    sectionOrder,
  };
};

const normalizeSectionSettings = (
  settings
) => {
  const output = {};

  DEFAULT_SECTION_ORDER.forEach(
    (key) => {
      const value =
        settings?.[key];

      if (
        typeof value ===
        'boolean'
      ) {
        output[key] = {
          enabled: value,
          visibility:
            value
              ? 'PUBLIC'
              : 'PRIVATE',
          customTitle: '',
        };

        return;
      }

      output[key] = {
        enabled:
          value?.enabled !==
          false,

        visibility:
          value?.visibility ||
          'PUBLIC',

        customTitle:
          value?.customTitle ||
          '',
      };
    }
  );

  return output;
};

const normalizeSectionOrder = (
  order,
  settings
) => {
  const supplied =
    Array.isArray(order)
      ? order.filter(
          (key) =>
            SECTION_DEFINITIONS[
              key
            ]
        )
      : [];

  const remaining =
    DEFAULT_SECTION_ORDER.filter(
      (key) =>
        !supplied.includes(key)
    );

  return [
    ...supplied,
    ...remaining,
  ].filter(
    (key) =>
      settings[key]?.enabled !==
      false
  );
};

const isSectionPublic = (
  staff,
  sectionKey
) => {
  const settings =
    staff.sectionSettings[
      sectionKey
    ];

  return (
    settings?.enabled !== false &&
    settings?.visibility !==
      'PRIVATE'
  );
};

const sectionHasContent = (
  staff,
  sectionKey
) => {
  switch (sectionKey) {
    case 'about':
      return Boolean(
        staff.bio ||
        staff.publicSummary
      );

    case 'experience':
      return (
        staff.experience.length >
        0
      );

    case 'projects':
      return (
        staff.projects.length > 0
      );

    case 'services':
      return (
        staff.services.length > 0
      );

    case 'skills':
      return Boolean(
        staff.skills.length ||
        staff.specialties.length ||
        staff.technologies.length
      );

    case 'education':
      return (
        staff.education.length > 0
      );

    case 'certifications':
      return (
        staff.certifications
          .length > 0
      );

    case 'achievements':
      return (
        staff.achievements.length >
        0
      );

    case 'articles':
      return (
        staff.posts.length > 0
      );

    case 'documents':
      return (
        staff.documents.length > 0
      );

    case 'contact':
      return Boolean(
        staff.publicEmail ||
        staff.publicPhone ||
        staff.websiteUrl
      );

    default:
      return false;
  }
};

const normalizeExperience = (
  value
) =>
  normalizeCollection(value).map(
    (item, index) => ({
      ...item,

      id:
        item.id ||
        `experience-${index}`,

      role:
        item.role ||
        item.title ||
        '',

      company:
        item.company ||
        item.organization ||
        '',

      startedAt:
        item.startedAt ||
        item.startDate ||
        '',

      endedAt:
        item.endedAt ||
        item.endDate ||
        '',

      current:
        item.current === true ||
        item.isCurrent === true,

      responsibilities:
        normalizeStringArray(
          item.responsibilities
        ),
    })
  );

const normalizeEducation = (
  value
) =>
  normalizeCollection(value).map(
    (item, index) => ({
      ...item,

      id:
        item.id ||
        `education-${index}`,

      qualification:
        item.qualification ||
        item.degree ||
        item.course ||
        item.title ||
        '',

      institution:
        item.institution ||
        item.school ||
        item.organization ||
        '',

      startedAt:
        item.startedAt ||
        item.startDate ||
        '',

      endedAt:
        item.endedAt ||
        item.endDate ||
        '',
    })
  );

const normalizeCertifications = (
  value
) =>
  normalizeCollection(value).map(
    (item, index) => ({
      ...item,

      id:
        item.id ||
        `certification-${index}`,

      title:
        item.title ||
        item.name ||
        '',

      issuer:
        item.issuer ||
        item.organization ||
        '',

      issuedAt:
        item.issuedAt ||
        item.date ||
        '',
    })
  );

const normalizeAchievements = (
  value
) =>
  normalizeCollection(value).map(
    (item, index) => ({
      ...item,

      id:
        item.id ||
        `achievement-${index}`,

      title:
        item.title ||
        item.name ||
        '',

      date:
        item.date ||
        item.achievedAt ||
        '',
    })
  );

const normalizeProjects = (
  value
) =>
  normalizeCollection(value).map(
    (project, index) => ({
      ...project,

      id:
        project.id ||
        `project-${index}`,

      title:
        project.title ||
        project.name ||
        '',

      staffRole:
        project.staffRole ||
        project.rolePlayed ||
        project.participationRole ||
        project.role ||
        '',

      staffSummary:
        project.staffSummary ||
        project.contributionSummary ||
        '',

      responsibilities:
        normalizeStringArray(
          project.responsibilities
        ),

      technologies:
        normalizeStringArray(
          project.technologies ||
          project.techStack
        ),

      outcomes:
        normalizeStringArray(
          project.outcomes
        ),

      startedAt:
        project.startedAt ||
        project.startDate ||
        '',

      endedAt:
        project.endedAt ||
        project.endDate ||
        '',
    })
  );

const normalizeDocuments = (
  value
) =>
  normalizeCollection(value).map(
    (document, index) => ({
      ...document,

      id:
        document.id ||
        `document-${index}`,

      label:
        document.label ||
        document.metadata?.label ||
        '',

      url:
        document.url ||
        document.fileUrl ||
        '',

      filename:
        document.filename ||
        document.name ||
        `Document ${index + 1}`,
    })
  );

const normalizeCollection = (
  value
) =>
  Array.isArray(value)
    ? value.filter(Boolean)
    : [];

const normalizeStringArray = (
  value
) => {
  if (Array.isArray(value)) {
    return value
      .map((item) =>
        typeof item === 'string'
          ? item
          : item?.name ||
            item?.label ||
            item?.title ||
            ''
      )
      .filter(Boolean);
  }

  if (typeof value === 'string') {
    return value
      .split(',')
      .map((item) =>
        item.trim()
      )
      .filter(Boolean);
  }

  return [];
};

const formatPeriod = (
  start,
  end,
  current
) => {
  const startLabel =
    formatMonthYear(start);

  const endLabel =
    current
      ? 'Present'
      : formatMonthYear(end);

  return [
    startLabel,
    endLabel,
  ]
    .filter(Boolean)
    .join(' – ');
};

const formatMonthYear = (
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
    undefined,
    {
      year: 'numeric',
      month: 'short',
    }
  );
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
    undefined,
    {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }
  );
};

const normalizePhone = (
  value
) =>
  String(value || '').replace(
    /[^\d+]/g,
    ''
  );

const formatRole = (
  role
) => {
  if (!role) {
    return '';
  }

  return String(role)
    .replaceAll('_', ' ')
    .toLowerCase()
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase()
    );
};

export default StaffDetail;