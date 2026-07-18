import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Link,
  useNavigate,
} from 'react-router-dom';
import {
  FaArrowLeft,
  FaArrowRight,
  FaBriefcase,
  FaEnvelope,
  FaGithub,
  FaGlobe,
  FaLinkedinIn,
  FaMapMarkerAlt,
  FaSearch,
  FaTwitter,
  FaUsers,
} from 'react-icons/fa';

import { apiGet } from '../js/httpClient';
import {
  resolveAssetUrl,
} from '../utils/constants';
import {
  getStaffDetailPath,
} from '../utils/detailPaths';

import '../css/staff-list.css';

const StaffList = () => {
  const navigate = useNavigate();

  const spotlightViewportRef =
    useRef(null);

  const [staff, setStaff] =
    useState([]);

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

  useEffect(() => {
    let mounted = true;

    const fetchStaff = async () => {
      setLoading(true);
      setError('');

      try {
        const response =
          await apiGet('/staff');

        if (!mounted) {
          return;
        }

        const records =
          Array.isArray(response)
            ? response
            : response?.data ||
              response?.staff ||
              [];

        setStaff(
          records
            .filter(Boolean)
            .map(normalizeStaffMember)
            .filter(
              (member) =>
                member.profileVisibility !==
                'PRIVATE'
            )
        );
      } catch (requestError) {
        if (!mounted) {
          return;
        }

        setError(
          requestError?.message ||
            'We could not load the AngiSoft team profiles.'
        );
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    fetchStaff();

    return () => {
      mounted = false;
    };
  }, []);

  const departments = useMemo(() => {
    const values = staff
      .map(
        (member) =>
          member.department
      )
      .filter(Boolean);

    return [
      'all',
      ...Array.from(
        new Set(values)
      ).sort((a, b) =>
        a.localeCompare(b)
      ),
    ];
  }, [staff]);

  const filteredStaff = useMemo(() => {
    const query =
      searchTerm
        .trim()
        .toLowerCase();

    return staff.filter((member) => {
      const matchesDepartment =
        selectedDepartment === 'all' ||
        member.department ===
          selectedDepartment;

      if (!matchesDepartment) {
        return false;
      }

      if (!query) {
        return true;
      }

      const searchableText = [
        member.fullName,
        member.publicTitle,
        member.department,
        member.location,
        member.publicSummary,
        ...member.skills,
        ...member.specialties,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return searchableText.includes(
        query
      );
    });
  }, [
    searchTerm,
    selectedDepartment,
    staff,
  ]);

  const featuredMember = useMemo(() => {
    const explicitlyFeatured =
      filteredStaff
        .filter(
          (member) =>
            member.isFeatured
        )
        .sort(
          (
            first,
            second
          ) =>
            first.directoryPriority -
            second.directoryPriority
        )[0];

    return (
      explicitlyFeatured ||
      filteredStaff[0] ||
      null
    );
  }, [filteredStaff]);

  const spotlightStaff = useMemo(
    () =>
      filteredStaff
        .filter(
          (member) =>
            member.id !==
            featuredMember?.id
        )
        .sort(
          (
            first,
            second
          ) =>
            first.directoryPriority -
            second.directoryPriority
        )
        .slice(0, 10),
    [
      filteredStaff,
      featuredMember,
    ]
  );

  const departmentGroups =
    useMemo(() => {
      const groups =
        new Map();

      filteredStaff.forEach(
        (member) => {
          const department =
            member.department ||
            'Other Team Members';

          if (
            !groups.has(
              department
            )
          ) {
            groups.set(
              department,
              []
            );
          }

          groups
            .get(department)
            .push(member);
        }
      );

      return Array.from(
        groups.entries()
      )
        .map(
          ([
            department,
            members,
          ]) => ({
            department,
            members:
              members.sort(
                (
                  first,
                  second
                ) =>
                  first.directoryPriority -
                    second.directoryPriority ||
                  first.fullName.localeCompare(
                    second.fullName
                  ),
              ),
          })
        )
        .sort(
          (
            first,
            second
          ) =>
            first.department.localeCompare(
              second.department
            ),
        );
    }, [filteredStaff]);

  const scrollSpotlight = (
    direction
  ) => {
    const viewport =
      spotlightViewportRef.current;

    if (!viewport) {
      return;
    }

    const distance =
      Math.max(
        viewport.clientWidth *
          0.78,
        280
      );

    viewport.scrollBy({
      left:
        direction === 'next'
          ? distance
          : -distance,
      behavior: 'smooth',
    });
  };

  const openMember = (
    member
  ) => {
    navigate(
      getStaffDetailPath(member)
    );
  };

  return (
    <main className="staff-directory">
      <section className="staff-directory-hero">
        <div className="container">
          <div className="staff-directory-hero-layout">
            <div>
              <p className="staff-directory-eyebrow">
                Our People
              </p>

              <h1 className="staff-directory-title">
                Meet the People
                Building AngiSoft
              </h1>

              <p className="staff-directory-intro">
                Discover the
                developers, engineers,
                designers, technology
                professionals and
                collaborators behind
                AngiSoft’s products,
                client projects and
                digital services.
              </p>
            </div>

            {!loading &&
              staff.length > 0 && (
                <div className="staff-directory-statistics">
                  <DirectoryStatistic
                    value={
                      staff.length
                    }
                    label="Public profiles"
                  />

                  <DirectoryStatistic
                    value={
                      departments.length -
                      1
                    }
                    label="Departments"
                    bordered
                  />
                </div>
              )}
          </div>
        </div>
      </section>

      <section className="staff-directory-toolbar">
        <div className="container staff-directory-toolbar-inner">
          <label className="staff-directory-search">
            <FaSearch
              aria-hidden="true"
            />

            <input
              type="search"
              value={searchTerm}
              onChange={(event) =>
                setSearchTerm(
                  event.target.value
                )
              }
              placeholder="Search by name, skill, role or department"
              aria-label="Search team profiles"
            />
          </label>

          <div
            className="staff-role-filters"
            aria-label="Filter staff by department"
          >
            {departments.map(
              (department) => (
                <button
                  key={
                    department
                  }
                  type="button"
                  onClick={() =>
                    setSelectedDepartment(
                      department
                    )
                  }
                  className={`staff-role-filter ${
                    selectedDepartment ===
                    department
                      ? 'is-active'
                      : ''
                  }`}
                >
                  {department ===
                  'all'
                    ? 'All Team'
                    : department}
                </button>
              )
            )}
          </div>
        </div>
      </section>

      {loading && (
        <DirectoryLoading />
      )}

      {!loading && error && (
        <DirectoryMessage
          icon={FaUsers}
          title="Unable to Load Team Profiles"
          description={error}
        />
      )}

      {!loading &&
        !error &&
        filteredStaff.length ===
          0 && (
          <DirectoryMessage
            icon={FaSearch}
            title="No Matching Profiles"
            description="No public team profile matches the current search and department filter."
          />
        )}

      {!loading &&
        !error &&
        featuredMember && (
          <>
            <FeaturedStaffProfile
              member={
                featuredMember
              }
              onOpen={() =>
                openMember(
                  featuredMember
                )
              }
            />

            {spotlightStaff.length >
              0 && (
              <section className="staff-spotlight">
                <div className="container">
                  <div className="staff-section-heading">
                    <div>
                      <p className="staff-section-eyebrow">
                        Team Spotlight
                      </p>

                      <h2>
                        Explore More
                        Profiles
                      </h2>
                    </div>

                    <div className="staff-spotlight-controls">
                      <button
                        type="button"
                        onClick={() =>
                          scrollSpotlight(
                            'previous'
                          )
                        }
                        aria-label="Scroll to previous staff profiles"
                      >
                        <FaArrowLeft />
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          scrollSpotlight(
                            'next'
                          )
                        }
                        aria-label="Scroll to next staff profiles"
                      >
                        <FaArrowRight />
                      </button>
                    </div>
                  </div>

                  <div
                    ref={
                      spotlightViewportRef
                    }
                    className="staff-spotlight-viewport"
                  >
                    <div className="staff-spotlight-track">
                      {spotlightStaff.map(
                        (member) => (
                          <SpotlightStaffCard
                            key={
                              member.id
                            }
                            member={
                              member
                            }
                            onOpen={() =>
                              openMember(
                                member
                              )
                            }
                          />
                        )
                      )}
                    </div>
                  </div>
                </div>
              </section>
            )}

            <section className="staff-departments">
              <div className="container">
                <div className="staff-section-heading">
                  <div>
                    <p className="staff-section-eyebrow">
                      Team Directory
                    </p>

                    <h2>
                      Browse by
                      Department
                    </h2>
                  </div>
                </div>

                {departmentGroups.map(
                  (group) => (
                    <DepartmentGroup
                      key={
                        group.department
                      }
                      group={group}
                    />
                  )
                )}
              </div>
            </section>
          </>
        )}

      <section className="staff-careers">
        <div className="container staff-careers-layout">
          <div>
            <p className="staff-section-eyebrow">
              Careers at AngiSoft
            </p>

            <h2>
              Interested in Building
              Technology With Us?
            </h2>

            <p>
              Explore available
              opportunities or contact
              AngiSoft when you believe
              your skills can contribute
              to our products, projects
              and long-term vision.
            </p>
          </div>

          <div className="staff-careers-actions">
            <Link
              to="/careers"
              className="staff-careers-primary"
            >
              <FaBriefcase />

              <span>
                View Open Roles
              </span>
            </Link>

            <a
              href="mailto:careers@angisoft.co.ke"
              className="staff-careers-secondary"
            >
              <FaEnvelope />

              <span>
                Contact Careers
              </span>
            </a>
          </div>
        </div>
      </section>
    </main>
  );
};

const FeaturedStaffProfile = ({
  member,
  onOpen,
}) => (
  <section className="staff-featured">
    <div className="container">
      <article className="staff-featured-card">
        <ProfileImage
          member={member}
          className="staff-featured-media"
          imageClassName=""
        />

        <div className="staff-featured-copy">
          <p className="staff-featured-label">
            Featured Profile
          </p>

          <h2 className="staff-featured-name">
            {member.fullName}
          </h2>

          {member.publicTitle && (
            <p className="staff-featured-role">
              {
                member.publicTitle
              }
            </p>
          )}

          {member.location && (
            <p className="staff-featured-location">
              <FaMapMarkerAlt />

              {member.location}
            </p>
          )}

          {member.publicSummary && (
            <p className="staff-featured-summary">
              {
                member.publicSummary
              }
            </p>
          )}

          {member.skills.length >
            0 && (
            <div className="staff-featured-skills">
              {member.skills
                .slice(0, 6)
                .map((skill) => (
                  <span
                    key={skill}
                    className="staff-featured-skill"
                  >
                    {skill}
                  </span>
                ))}
            </div>
          )}

          <div className="staff-featured-actions">
            <button
              type="button"
              onClick={onOpen}
              className="staff-profile-action"
            >
              View Full Portfolio

              <FaArrowRight />
            </button>

            <SocialLinks
              member={member}
            />
          </div>
        </div>
      </article>
    </div>
  </section>
);

const SpotlightStaffCard = ({
  member,
  onOpen,
}) => (
  <article
    className="staff-spotlight-card"
    role="button"
    tabIndex={0}
    onClick={onOpen}
    onKeyDown={(event) => {
      if (
        event.key === 'Enter' ||
        event.key === ' '
      ) {
        event.preventDefault();
        onOpen();
      }
    }}
  >
    <ProfileImage
      member={member}
      className="staff-spotlight-image"
      imageClassName=""
    />

    <div
      className="staff-spotlight-shade"
      aria-hidden="true"
    />

    <div className="staff-spotlight-copy">
      <h3>
        {member.fullName}
      </h3>

      {member.publicTitle && (
        <p>
          {member.publicTitle}
        </p>
      )}

      {member.department && (
        <span>
          {member.department}
        </span>
      )}

      <div className="staff-spotlight-link">
        View Portfolio

        <FaArrowRight />
      </div>
    </div>
  </article>
);

const DepartmentGroup = ({
  group,
}) => (
  <section className="staff-department">
    <div className="staff-department-title">
      <h3>
        {group.department}
      </h3>

      <span>
        {group.members.length}{' '}
        {group.members.length ===
        1
          ? 'profile'
          : 'profiles'}
      </span>
    </div>

    <div>
      {group.members.map(
        (member) => (
          <Link
            key={member.id}
            to={getStaffDetailPath(
              member
            )}
            className="staff-directory-row"
          >
            <ProfileImage
              member={member}
              className="staff-directory-row-image"
              imageClassName=""
            />

            <div>
              <p className="staff-directory-row-name">
                {member.fullName}
              </p>

              {member.location && (
                <p className="staff-directory-row-location">
                  {member.location}
                </p>
              )}
            </div>

            <p className="staff-directory-row-role">
              {member.publicTitle ||
                'AngiSoft Team Member'}
            </p>

            <div className="staff-directory-row-skills">
              {member.skills
                .slice(0, 2)
                .map((skill) => (
                  <span
                    key={skill}
                  >
                    {skill}
                  </span>
                ))}
            </div>

            <FaArrowRight className="staff-directory-row-arrow" />
          </Link>
        )
      )}
    </div>
  </section>
);

const ProfileImage = ({
  member,
  className,
  imageClassName,
}) => {
  if (member.avatarUrl) {
    return (
      <div className={className}>
        <img
          src={resolveAssetUrl(
            member.avatarUrl
          )}
          alt={member.fullName}
          loading="lazy"
          decoding="async"
          className={imageClassName}
        />
      </div>
    );
  }

  return (
    <div
      className={`${className} staff-profile-image-fallback`}
      aria-label={`${member.fullName} profile image placeholder`}
    >
      <span>
        {member.initials ||
          'AT'}
      </span>
    </div>
  );
};

const SocialLinks = ({
  member,
}) => {
  const links = [
    {
      label: 'LinkedIn',
      href: member.linkedinUrl,
      icon: FaLinkedinIn,
    },
    {
      label: 'GitHub',
      href: member.githubUrl,
      icon: FaGithub,
    },
    {
      label: 'Twitter',
      href: member.twitterUrl,
      icon: FaTwitter,
    },
    {
      label: 'Website',
      href: member.websiteUrl,
      icon: FaGlobe,
    },
  ].filter(
    (item) => item.href
  );

  if (!links.length) {
    return null;
  }

  return (
    <div className="staff-social-links">
      {links.map((item) => {
        const Icon = item.icon;

        return (
          <a
            key={item.label}
            href={item.href}
            target="_blank"
            rel="noreferrer"
            aria-label={`${member.fullName} on ${item.label}`}
          >
            <Icon />
          </a>
        );
      })}
    </div>
  );
};

const DirectoryStatistic = ({
  value,
  label,
  bordered = false,
}) => (
  <div
    className={`staff-directory-statistic ${
      bordered
        ? 'is-bordered'
        : ''
    }`}
  >
    <strong>
      {value}
    </strong>

    <span>
      {label}
    </span>
  </div>
);

const DirectoryLoading = () => (
  <section className="staff-directory-status">
    <div className="staff-loading-spinner" />

    <p>
      Loading team profiles…
    </p>
  </section>
);

const DirectoryMessage = ({
  icon: Icon,
  title,
  description,
}) => (
  <section className="staff-directory-status">
    <Icon />

    <h2>
      {title}
    </h2>

    <p>
      {description}
    </p>
  </section>
);

const normalizeStaffMember = (
  member,
  index
) => {
  const firstName =
    member?.firstName ||
    member?.first_name ||
    '';

  const lastName =
    member?.lastName ||
    member?.last_name ||
    '';

  const fullName =
    member?.fullName ||
    member?.displayName ||
    [firstName, lastName]
      .filter(Boolean)
      .join(' ') ||
    member?.username ||
    `Team Member ${index + 1}`;

  return {
    ...member,

    id:
      member?.id ||
      member?.username ||
      `staff-${index}`,

    firstName,
    lastName,
    fullName,

    initials: fullName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join('')
      .toUpperCase(),

    publicTitle:
      member?.publicTitle ||
      member?.title ||
      formatRole(member?.role),

    department:
      member?.department ||
      member?.team ||
      member?.division ||
      'Other Team Members',

    publicSummary:
      member?.publicSummary ||
      member?.summary ||
      member?.bio ||
      '',

    avatarUrl:
      member?.avatarUrl ||
      member?.profileImageUrl ||
      member?.photoUrl ||
      '',

    skills: normalizeStringArray(
      member?.skills
    ),

    specialties:
      normalizeStringArray(
        member?.specialties
      ),

    isFeatured:
      member?.isFeatured ===
        true,

    directoryPriority:
      Number.isFinite(
        Number(
          member?.directoryPriority
        )
      )
        ? Number(
            member.directoryPriority
          )
        : 999,

    profileVisibility:
      member?.profileVisibility ||
      'PUBLIC',
  };
};

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

export default StaffList;