// @ts-nocheck
import React, {
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  Link,
} from 'react-router-dom';
import {
  FaArrowRight,
  FaBriefcase,
  FaEnvelope,
  FaMapMarkerAlt,
  FaSearch,
} from 'react-icons/fa';

import { apiGet } from '@/lib/httpClient';
import {
  resolveAssetUrl,
} from '@/lib/marketing/constants';
import { getStaffDetailPath } from '@/lib/marketing/detailPaths';
import { LoadingIndicator, VisualState } from '@angisoft/ui';
import { Badge } from '@/components/ui';

import '@/styles/marketing/staff-list.css';

const StaffList = () => {
  const [staff, setStaff] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState('');

  const [searchTerm, setSearchTerm] =
    useState('');

  const [selectedDepartment, setSelectedDepartment] =
    useState('all');

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
          requestError?.message || 'request_failed'
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

    return staff
      .filter((member) => {
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
      })
      .sort(
        (first, second) =>
          Number(second.isFeatured) -
            Number(first.isFeatured) ||
          first.directoryPriority -
            second.directoryPriority ||
          first.fullName.localeCompare(
            second.fullName
          )
      );
  }, [
    searchTerm,
    selectedDepartment,
    staff,
  ]);

  return (
    <main className="staff-directory">
      <section className="staff-directory-hero">
        <div className="container">
          <p className="staff-directory-eyebrow">
            Our People
          </p>

          <h1 className="staff-directory-title">
            The people behind
            the work
          </h1>

          <p className="staff-directory-intro">
            Developers, designers and
            operators who design,
            build and run the
            products AngiSoft ships for
            clients across East Africa.
          </p>

          {!loading &&
            staff.length > 0 && (
              <p className="staff-directory-count">
                {staff.length}{' '}
                {staff.length === 1
                  ? 'person'
                  : 'people'}{' '}
                on the team
              </p>
            )}
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
              placeholder="Search by name, skill or role"
              aria-label="Search team profiles"
            />
          </label>

          {departments.length > 2 && (
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
                      ? 'All'
                      : department}
                  </button>
                )
              )}
            </div>
          )}
        </div>
      </section>

      {loading && (
        <DirectoryLoading />
      )}

      {!loading && error && (
        <DirectoryMessage
          title="We couldn't load the team"
          description="The directory is temporarily unavailable. Try again in a moment."
          visual="error"
        />
      )}

      {!loading &&
        !error &&
        filteredStaff.length ===
          0 && (
          <DirectoryMessage
            title="No matching profiles"
            description="Try a different name, skill or department."
            visual="unavailable"
          />
        )}

      {!loading &&
        !error &&
        filteredStaff.length > 0 && (
          <section className="staff-grid-section">
            <div className="container">
              <div className="staff-grid">
                {filteredStaff.map(
                  (member) => (
                    <TeamCard
                      key={member.id}
                      member={member}
                    />
                  )
                )}
              </div>
            </div>
          </section>
        )}

      <section className="staff-careers">
        <div className="container staff-careers-layout">
          <div>
            <h2>
              Want to work with
              this team?
            </h2>

            <p>
              We hire people who
              care about the work,
              not just the title.
              See what is open.
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

              <FaArrowRight />
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

const TeamCard = ({
  member,
}) => {
  const skills = member.skills
    .slice(0, 4);

  return (
    <Link
      to={getStaffDetailPath(member)}
      className="group block overflow-hidden rounded-(--radius-xl) border border-(--border) bg-(--card-bg) transition-all duration-(--duration-normal) ease-(--ease-standard) hover:-translate-y-1 hover:border-(--color-secondary)/50 hover:shadow-(--elevation-lg)"
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-(--surface)">
        <ProfileImage
          member={member}
          className="h-full w-full"
          imageClassName="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />

        {member.isFeatured && (
          <Badge tone="brand" className="absolute left-3 top-3">
            Featured
          </Badge>
        )}
      </div>

      <div className="p-5">
        <h2 className="text-lg font-bold text-(--text-primary) transition-colors group-hover:text-(--color-secondary)">
          {member.fullName}
        </h2>

        <p className="mt-1 text-sm font-medium text-(--color-secondary)">
          {member.publicTitle ||
            'AngiSoft Team Member'}
        </p>

        {(member.department ||
          member.location) && (
          <p className="mt-2 flex items-center gap-1.5 text-xs text-(--text-muted)">
            {member.department}
            {member.department &&
              member.location &&
              ' · '}
            {member.location && (
              <>
                <FaMapMarkerAlt
                  aria-hidden="true"
                />{' '}
                {member.location}
              </>
            )}
          </p>
        )}

        {member.publicSummary && (
          <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-(--text-secondary)">
            {member.publicSummary}
          </p>
        )}

        {skills.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {skills.map((skill) => (
              <Badge key={skill}>
                {skill}
              </Badge>
            ))}
          </div>
        )}

        <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-(--color-secondary)">
          View profile
          <FaArrowRight
            aria-hidden="true"
            className="transition-transform duration-(--duration-normal) group-hover:translate-x-1"
          />
        </span>
      </div>
    </Link>
  );
};

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

const DirectoryLoading = () => (
  <section className="staff-directory-status">
    <LoadingIndicator variant="grid" size="lg" />
  </section>
);

const DirectoryMessage = ({
  title,
  description,
  visual,
}) => (
  <section className="staff-directory-status">
    {visual ? (
      <VisualState variant={visual} />
    ) : null}

    <h2>{title}</h2>
    <p>{description}</p>
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
      '',

    department:
      member?.department ||
      member?.team ||
      member?.division ||
      '',

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
      member?.featured ===
        true ||
      member?.isFeatured ===
        true,

    directoryPriority:
      Number.isFinite(
        Number(
          member?.profileOrder ??
            member?.directoryPriority
        )
      )
        ? Number(
            member?.profileOrder ??
              member?.directoryPriority
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

export default StaffList;
