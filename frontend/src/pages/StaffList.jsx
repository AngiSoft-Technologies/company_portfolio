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
  FaEnvelope,
  FaGithub,
  FaGlobe,
  FaLinkedin,
  FaMapMarkerAlt,
  FaTwitter,
  FaUsers,
} from 'react-icons/fa';

import { apiGet } from '../js/httpClient';
import {
  getStaffDetailPath,
} from '../utils/detailPaths';
import {
  resolveAssetUrl,
} from '../utils/constants';

const StaffList = () => {
  const navigate = useNavigate();

  const [staff, setStaff] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState('');

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

        setStaff(
          Array.isArray(response)
            ? response
            : response?.data || []
        );
      } catch (requestError) {
        if (!mounted) {
          return;
        }

        setError(
          requestError?.message ||
            'Unable to load team profiles.'
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

  const roleCount = useMemo(
    () =>
      new Set(
        staff
          .map(
            (member) =>
              member.publicTitle ||
              member.role
          )
          .filter(Boolean)
      ).size,
    [staff]
  );

  return (
    <main className="min-h-screen bg-[#07142B] text-white">
      <section className="border-b border-white/10 py-14 md:py-18 lg:py-20">
        <div className="container">
          <div className="grid items-end gap-10 lg:grid-cols-[1fr_auto]">
            <div className="max-w-4xl">
              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#00C2FF]">
                Our People
              </p>

              <h1
                className="mt-4 text-4xl font-black leading-[1.04] tracking-[-0.045em] text-white md:text-5xl lg:text-6xl"
                style={{
                  fontFamily:
                    'Sora, sans-serif',
                }}
              >
                The People Building
                AngiSoft
              </h1>

              <p className="mt-6 max-w-3xl text-sm leading-7 text-white/62 md:text-base">
                Meet the engineers,
                developers, designers and
                technology professionals
                contributing to AngiSoft’s
                products, projects and
                practical digital services.
              </p>
            </div>

            {!loading &&
              staff.length > 0 && (
                <div className="grid grid-cols-2 border border-white/12 bg-[#0A1B38]">
                  <Stat
                    value={
                      staff.length
                    }
                    label="Team profiles"
                  />

                  <Stat
                    value={
                      roleCount
                    }
                    label="Roles"
                    bordered
                  />
                </div>
              )}
          </div>
        </div>
      </section>

      <section className="py-14 md:py-18 lg:py-20">
        <div className="container">
          {loading && (
            <LoadingState />
          )}

          {!loading && error && (
            <ErrorState
              message={error}
            />
          )}

          {!loading &&
            !error &&
            staff.length === 0 && (
              <EmptyState />
            )}

          {!loading &&
            !error &&
            staff.length > 0 && (
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {staff.map(
                  (
                    member,
                    index
                  ) => (
                    <StaffCard
                      key={
                        member.id ||
                        member.username ||
                        index
                      }
                      member={
                        member
                      }
                      onOpen={() =>
                        navigate(
                          getStaffDetailPath(
                            member
                          )
                        )
                      }
                    />
                  )
                )}
              </div>
            )}
        </div>
      </section>

      <section className="border-t border-white/10 bg-[#0A1B38] py-12 md:py-14">
        <div className="container">
          <div className="grid items-center gap-8 md:grid-cols-[1fr_auto]">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#00C2FF]">
                Careers at AngiSoft
              </p>

              <h2 className="mt-3 text-2xl font-black tracking-[-0.03em] text-white md:text-3xl">
                Interested in Building
                Technology With Us?
              </h2>

              <p className="mt-3 max-w-2xl text-sm leading-7 text-white/58">
                Explore available roles
                or contact AngiSoft when
                you believe your skills
                can contribute to our
                products and projects.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                to="/careers"
                className="inline-flex min-h-11 items-center gap-2 bg-[#0A3DFF] px-5 py-3 text-xs font-bold text-white no-underline transition hover:bg-[#3B6FFF]"
              >
                <FaBriefcase />

                View Open Roles
              </Link>

              <a
                href="mailto:careers@angisoft.co.ke"
                className="inline-flex min-h-11 items-center gap-2 border border-white/20 px-5 py-3 text-xs font-bold text-white no-underline transition hover:border-[#00C2FF] hover:text-[#00C2FF]"
              >
                <FaEnvelope />

                Contact Careers
              </a>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
};

const Stat = ({
  value,
  label,
  bordered = false,
}) => (
  <div
    className={`min-w-[130px] px-5 py-4 ${
      bordered
        ? 'border-l border-white/12'
        : ''
    }`}
  >
    <strong className="block text-2xl font-black text-[#00C2FF]">
      {value}
    </strong>

    <span className="mt-1 block text-[10px] font-semibold uppercase tracking-[0.12em] text-white/40">
      {label}
    </span>
  </div>
);

const StaffCard = ({
  member,
  onOpen,
}) => {
  const fullName = [
    member.firstName,
    member.lastName,
  ]
    .filter(Boolean)
    .join(' ');

  const role =
    member.publicTitle ||
    member.role
      ?.toLowerCase()
      .replaceAll('_', ' ');

  const summary =
    member.publicSummary ||
    member.bio ||
    '';

  const skills =
    Array.isArray(member.skills)
      ? member.skills.slice(0, 3)
      : [];

  const socials = [
    {
      label: 'LinkedIn',
      url: member.linkedinUrl,
      icon: FaLinkedin,
    },
    {
      label: 'Twitter',
      url: member.twitterUrl,
      icon: FaTwitter,
    },
    {
      label: 'GitHub',
      url: member.githubUrl,
      icon: FaGithub,
    },
    {
      label: 'Website',
      url: member.websiteUrl,
      icon: FaGlobe,
    },
  ].filter(
    (item) => item.url
  );

  const initials = [
    member.firstName?.[0],
    member.lastName?.[0],
  ]
    .filter(Boolean)
    .join('')
    .toUpperCase();

  return (
    <article
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
      className="group flex cursor-pointer flex-col overflow-hidden border border-white/12 bg-[#0A1B38] outline-none transition duration-300 hover:-translate-y-1 hover:border-[#00C2FF]/50 focus-visible:ring-2 focus-visible:ring-[#00C2FF]"
    >
      <div className="relative aspect-[4/5] overflow-hidden bg-[#07142B]">
        {member.avatarUrl ? (
          <img
            src={resolveAssetUrl(
              member.avatarUrl
            )}
            alt={
              fullName ||
              'AngiSoft team member'
            }
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.045]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#0A3DFF]/55 to-[#07142B] text-5xl font-black text-white">
            {initials || 'AT'}
          </div>
        )}

        <div
          className="absolute inset-0 bg-gradient-to-t from-[#07142B]/95 via-[#07142B]/10 to-transparent"
          aria-hidden="true"
        />

        {member.location && (
          <div className="absolute right-3 top-3 inline-flex items-center gap-1.5 border border-white/15 bg-[#07142B]/75 px-2.5 py-1.5 text-[9px] font-semibold text-white/65 backdrop-blur-sm">
            <FaMapMarkerAlt className="text-[#00C2FF]" />

            {
              member.location
            }
          </div>
        )}

        <div className="absolute inset-x-0 bottom-0 p-5">
          <h2 className="text-xl font-black leading-tight text-white">
            {fullName}
          </h2>

          {role && (
            <p className="mt-1 text-xs font-semibold capitalize text-[#00C2FF]">
              {role}
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-1 flex-col p-5">
        {summary && (
          <p className="line-clamp-3 text-sm leading-6 text-white/55">
            {summary}
          </p>
        )}

        {skills.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {skills.map(
              (skill) => (
                <span
                  key={skill}
                  className="border border-[#0A3DFF]/25 bg-[#0A3DFF]/8 px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.08em] text-[#5DD8FF]"
                >
                  {skill}
                </span>
              )
            )}
          </div>
        )}

        <div className="mt-auto flex items-center justify-between border-t border-white/10 pt-4">
          <div className="flex items-center gap-2">
            {socials.map(
              (social) => {
                const Icon =
                  social.icon;

                return (
                  <a
                    key={
                      social.label
                    }
                    href={
                      social.url
                    }
                    target="_blank"
                    rel="noreferrer"
                    onClick={(
                      event
                    ) =>
                      event.stopPropagation()
                    }
                    className="flex h-7 w-7 items-center justify-center border border-white/12 text-[11px] text-white/55 transition hover:border-[#00C2FF] hover:text-[#00C2FF]"
                    aria-label={
                      social.label
                    }
                  >
                    <Icon />
                  </a>
                );
              }
            )}
          </div>

          <span className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.1em] text-[#00C2FF]">
            View Profile

            <FaArrowRight className="text-[8px] transition group-hover:translate-x-1" />
          </span>
        </div>
      </div>
    </article>
  );
};

const LoadingState = () => (
  <div className="flex min-h-[320px] items-center justify-center">
    <div className="h-11 w-11 animate-spin rounded-full border-2 border-white/10 border-t-[#00C2FF]" />
  </div>
);

const ErrorState = ({
  message,
}) => (
  <div className="border border-red-400/25 bg-red-400/[0.04] px-6 py-12 text-center">
    <p className="text-sm text-red-300">
      {message}
    </p>
  </div>
);

const EmptyState = () => (
  <div className="border border-white/10 bg-[#0A1B38] px-6 py-16 text-center">
    <FaUsers className="mx-auto text-4xl text-[#00C2FF]/45" />

    <h2 className="mt-4 text-xl font-bold text-white">
      Team Profiles Coming Soon
    </h2>

    <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-white/50">
      Published AngiSoft staff
      profiles will appear here.
    </p>
  </div>
);

export default StaffList;