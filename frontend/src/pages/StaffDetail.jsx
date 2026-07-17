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
  FaBriefcase,
  FaCode,
  FaEnvelope,
  FaFileDownload,
  FaGithub,
  FaGlobe,
  FaLinkedin,
  FaMapMarkerAlt,
  FaNewspaper,
  FaPhone,
  FaProjectDiagram,
  FaTwitter,
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

const StaffDetail = () => {
  const {
    usernameOrId,
  } = useParams();

  const navigate =
    useNavigate();

  const [staff, setStaff] =
    useState(null);

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
          await apiGet(
            `/staff/${usernameOrId}`
          );

        if (mounted) {
          setStaff(
            response?.data ||
              response
          );
        }
      } catch (requestError) {
        if (mounted) {
          setError(
            requestError?.message ||
              'Team member not found.'
          );
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    if (usernameOrId) {
      fetchStaff();
    }

    return () => {
      mounted = false;
    };
  }, [usernameOrId]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#07142B]">
        <div className="h-12 w-12 animate-spin rounded-full border-2 border-white/10 border-t-[#00C2FF]" />
      </main>
    );
  }

  if (
    error ||
    !staff
  ) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#07142B] px-5 text-white">
        <div className="w-full max-w-xl border border-white/12 bg-[#0A1B38] p-8 text-center">
          <h1 className="text-2xl font-black">
            {error ||
              'Team member not found'}
          </h1>

          <button
            type="button"
            onClick={() =>
              navigate('/staff')
            }
            className="mt-6 inline-flex items-center gap-2 bg-[#0A3DFF] px-5 py-3 text-xs font-bold text-white"
          >
            <FaArrowLeft />

            Back to Team
          </button>
        </div>
      </main>
    );
  }

  const fullName = [
    staff.firstName,
    staff.lastName,
  ]
    .filter(Boolean)
    .join(' ');

  const roleLabel =
    staff.publicTitle ||
    staff.role
      ?.toLowerCase()
      .replaceAll('_', ' ');

  const initials = [
    staff.firstName?.[0],
    staff.lastName?.[0],
  ]
    .filter(Boolean)
    .join('')
    .toUpperCase();

  const socialLinks = [
    {
      icon: FaLinkedin,
      url: staff.linkedinUrl,
      label: 'LinkedIn',
    },
    {
      icon: FaTwitter,
      url: staff.twitterUrl,
      label: 'Twitter / X',
    },
    {
      icon: FaGithub,
      url: staff.githubUrl,
      label: 'GitHub',
    },
    {
      icon: FaGlobe,
      url: staff.websiteUrl,
      label: 'Website',
    },
  ].filter(
    (item) => item.url
  );

  const contactLinks = [
    staff.publicEmail && {
      icon: FaEnvelope,
      label:
        staff.publicEmail,
      href:
        `mailto:${staff.publicEmail}`,
    },

    staff.publicPhone && {
      icon: FaPhone,
      label:
        staff.publicPhone,
      href:
        `tel:${staff.publicPhone}`,
    },

    staff.location && {
      icon:
        FaMapMarkerAlt,
      label:
        staff.location,
      href:
        '',
    },
  ].filter(Boolean);

  return (
    <main className="min-h-screen bg-[#07142B] text-white">
      <section className="border-b border-white/10 py-10 md:py-14">
        <div className="container">
          <button
            type="button"
            onClick={() =>
              navigate('/staff')
            }
            className="mb-7 inline-flex items-center gap-2 text-xs font-semibold text-white/55 transition hover:text-[#00C2FF]"
          >
            <FaArrowLeft />

            Back to Team
          </button>

          <div className="grid items-stretch gap-8 lg:grid-cols-[0.78fr_1.22fr] lg:gap-14">
            <div className="relative min-h-[390px] overflow-hidden bg-[#0A1B38] md:min-h-[520px]">
              {staff.avatarUrl ? (
                <img
                  src={resolveAssetUrl(
                    staff.avatarUrl
                  )}
                  alt={fullName}
                  className="absolute inset-0 h-full w-full object-cover"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#0A3DFF]/60 to-[#07142B] text-7xl font-black">
                  {initials || 'AT'}
                </div>
              )}

              <span
                className="absolute left-0 top-0 h-1 w-28 bg-gradient-to-r from-[#0A3DFF] to-[#00C2FF]"
                aria-hidden="true"
              />

              <div
                className="absolute inset-0 bg-gradient-to-t from-[#07142B]/85 via-transparent to-transparent"
                aria-hidden="true"
              />
            </div>

            <div className="flex flex-col justify-center">
              <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#00C2FF]">
                AngiSoft Team
              </p>

              <h1
                className="mt-4 text-4xl font-black leading-[1.04] tracking-[-0.045em] md:text-5xl lg:text-6xl"
                style={{
                  fontFamily:
                    'Sora, sans-serif',
                }}
              >
                {fullName}
              </h1>

              {roleLabel && (
                <p className="mt-4 text-base font-bold capitalize text-[#5DD8FF] md:text-lg">
                  {roleLabel}
                </p>
              )}

              {staff.publicSummary && (
                <p className="mt-6 max-w-3xl text-base leading-8 text-white/62">
                  {
                    staff.publicSummary
                  }
                </p>
              )}

              {contactLinks.length >
                0 && (
                <div className="mt-7 grid gap-3 sm:grid-cols-2">
                  {contactLinks.map(
                    (
                      item
                    ) => {
                      const Icon =
                        item.icon;

                      const body = (
                        <>
                          <span className="flex h-8 w-8 items-center justify-center border border-[#00C2FF]/30 text-xs text-[#00C2FF]">
                            <Icon />
                          </span>

                          <span className="min-w-0 break-all text-xs text-white/62">
                            {
                              item.label
                            }
                          </span>
                        </>
                      );

                      return item.href ? (
                        <a
                          key={
                            item.label
                          }
                          href={
                            item.href
                          }
                          className="flex items-center gap-3 no-underline transition hover:text-[#00C2FF]"
                        >
                          {body}
                        </a>
                      ) : (
                        <div
                          key={
                            item.label
                          }
                          className="flex items-center gap-3"
                        >
                          {body}
                        </div>
                      );
                    }
                  )}
                </div>
              )}

              {socialLinks.length >
                0 && (
                <div className="mt-7 flex flex-wrap gap-2">
                  {socialLinks.map(
                    (
                      item
                    ) => {
                      const Icon =
                        item.icon;

                      return (
                        <a
                          key={
                            item.label
                          }
                          href={
                            item.url
                          }
                          target="_blank"
                          rel="noreferrer"
                          className="flex h-9 w-9 items-center justify-center border border-white/15 text-sm text-white/60 transition hover:border-[#00C2FF] hover:bg-[#00C2FF]/8 hover:text-[#00C2FF]"
                          aria-label={
                            item.label
                          }
                        >
                          <Icon />
                        </a>
                      );
                    }
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="py-14 md:py-18 lg:py-20">
        <div className="container">
          <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-12">
            <div className="space-y-10">
              <ProfileSection
                title="About"
              >
                <p className="whitespace-pre-line text-sm leading-8 text-white/64 md:text-base">
                  {staff.bio ||
                    'No public biography is currently available.'}
                </p>
              </ProfileSection>

              {staff.services
                ?.length >
                0 && (
                <ContentGrid
                  title="Services"
                  icon={
                    FaBriefcase
                  }
                  items={
                    staff.services
                  }
                  onOpen={(
                    service
                  ) =>
                    navigate(
                      getServiceDetailPath(
                        service
                      )
                    )
                  }
                />
              )}

              {staff.projects
                ?.length >
                0 && (
                <ContentGrid
                  title="Projects"
                  icon={
                    FaProjectDiagram
                  }
                  items={
                    staff.projects
                  }
                  onOpen={(
                    project
                  ) =>
                    navigate(
                      getProjectDetailPath(
                        project
                      )
                    )
                  }
                />
              )}

              {staff.posts?.length >
                0 && (
                <ProfileSection
                  title="Recent Articles"
                  icon={
                    FaNewspaper
                  }
                >
                  <div className="divide-y divide-white/10 border-y border-white/10">
                    {staff.posts.map(
                      (
                        post
                      ) => (
                        <button
                          key={
                            post.id
                          }
                          type="button"
                          onClick={() =>
                            navigate(
                              getBlogDetailPath(
                                post
                              )
                            )
                          }
                          className="group flex w-full items-center justify-between gap-5 py-5 text-left"
                        >
                          <div className="min-w-0">
                            <h3 className="font-bold text-white transition group-hover:text-[#00C2FF]">
                              {
                                post.title
                              }
                            </h3>

                            <p className="mt-2 text-xs text-white/38">
                              {formatDate(
                                post.publishedAt ||
                                  post.createdAt
                              )}
                            </p>
                          </div>

                          <FaArrowRight className="shrink-0 text-xs text-[#00C2FF] transition group-hover:translate-x-1" />
                        </button>
                      )
                    )}
                  </div>
                </ProfileSection>
              )}
            </div>

            <aside className="space-y-6 lg:sticky lg:top-24">
              {staff.skills?.length >
                0 && (
                <SidebarPanel
                  title="Skills"
                  icon={FaCode}
                  items={
                    staff.skills
                  }
                />
              )}

              {staff.specialties
                ?.length >
                0 && (
                <SidebarPanel
                  title="Specialties"
                  icon={
                    FaBriefcase
                  }
                  items={
                    staff.specialties
                  }
                />
              )}

              {staff.documents
                ?.length >
                0 && (
                <ProfileSection
                  title="Public Documents"
                  icon={
                    FaFileDownload
                  }
                  compact
                >
                  <div className="space-y-3">
                    {staff.documents.map(
                      (
                        document
                      ) => (
                        <a
                          key={
                            document.id
                          }
                          href={
                            document.url
                          }
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center justify-between gap-4 border border-white/10 px-4 py-3 text-xs text-white/60 no-underline transition hover:border-[#00C2FF]/45 hover:text-[#00C2FF]"
                        >
                          <span className="min-w-0 truncate">
                            {document
                              .metadata
                              ?.label ||
                              document.filename}
                          </span>

                          <FaFileDownload className="shrink-0" />
                        </a>
                      )
                    )}
                  </div>
                </ProfileSection>
              )}
            </aside>
          </div>
        </div>
      </section>
    </main>
  );
};

const ProfileSection = ({
  title,
  icon: Icon,
  children,
  compact = false,
}) => (
  <section
    className={`border border-white/10 bg-[#0A1B38] ${
      compact
        ? 'p-5'
        : 'p-6 md:p-8'
    }`}
  >
    <div className="mb-6 flex items-center gap-3">
      {Icon && (
        <Icon className="text-sm text-[#00C2FF]" />
      )}

      <h2 className="text-xl font-black tracking-[-0.02em] text-white">
        {title}
      </h2>
    </div>

    {children}
  </section>
);

const SidebarPanel = ({
  title,
  icon: Icon,
  items,
}) => (
  <ProfileSection
    title={title}
    icon={Icon}
    compact
  >
    <div className="flex flex-wrap gap-2">
      {items.map(
        (item) => (
          <span
            key={item}
            className="border border-[#0A3DFF]/25 bg-[#0A3DFF]/8 px-2.5 py-1.5 text-[10px] font-bold text-[#5DD8FF]"
          >
            {item}
          </span>
        )
      )}
    </div>
  </ProfileSection>
);

const ContentGrid = ({
  title,
  icon: Icon,
  items,
  onOpen,
}) => (
  <section>
    <div className="mb-6 flex items-center gap-3">
      <Icon className="text-sm text-[#00C2FF]" />

      <h2 className="text-2xl font-black text-white">
        {title}
      </h2>
    </div>

    <div className="grid gap-4 md:grid-cols-2">
      {items.map(
        (item) => (
          <button
            key={item.id}
            type="button"
            onClick={() =>
              onOpen(item)
            }
            className="group border border-white/10 bg-[#0A1B38] p-5 text-left transition hover:border-[#00C2FF]/45"
          >
            <h3 className="font-bold text-white transition group-hover:text-[#00C2FF]">
              {item.title}
            </h3>

            {item.description && (
              <p className="mt-3 line-clamp-3 text-sm leading-6 text-white/50">
                {
                  item.description
                }
              </p>
            )}

            <span className="mt-5 inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.1em] text-[#00C2FF]">
              View Details

              <FaArrowRight className="text-[8px] transition group-hover:translate-x-1" />
            </span>
          </button>
        )
      )}
    </div>
  </section>
);

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
    return '';
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

export default StaffDetail;