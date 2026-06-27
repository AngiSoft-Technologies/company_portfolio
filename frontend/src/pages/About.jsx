import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ScrollReveal } from '../components/modern';
import { apiGet } from '../js/httpClient';
import { resolveAssetUrl } from '../utils/constants';
import { getStaffDetailPath } from '../utils/detailPaths';
import {
  FaArrowRight,
  FaAward,
  FaChartLine,
  FaCheckCircle,
  FaChevronRight,
  FaCloud,
  FaCode,
  FaCogs,
  FaDatabase,
  FaDocker,
  FaEye,
  FaHandsHelping,
  FaHeart,
  FaLayerGroup,
  FaLightbulb,
  FaMapMarkerAlt,
  FaMobile,
  FaNodeJs,
  FaPaintBrush,
  FaPython,
  FaQuoteLeft,
  FaReact,
  FaRocket,
  FaSeedling,
  FaShieldAlt,
  FaUsers,
} from 'react-icons/fa';

const DARK_BG = '#07142B';
const DARK_SURFACE = '#0B1E3D';
const BLUE_PRIMARY = '#0875FF';
const BLUE_SECONDARY = '#00AFFF';
const GREEN = '#39FF6A';

const iconRegistry = {
  FaAward,
  FaChartLine,
  FaCheckCircle,
  FaCloud,
  FaCode,
  FaCogs,
  FaDatabase,
  FaDocker,
  FaEye,
  FaHandsHelping,
  FaHeart,
  FaLayerGroup,
  FaLightbulb,
  FaMapMarkerAlt,
  FaMobile,
  FaNodeJs,
  FaPaintBrush,
  FaPython,
  FaReact,
  FaRocket,
  FaSeedling,
  FaShieldAlt,
  FaUsers,
};

const colorCycle = [BLUE_PRIMARY, BLUE_SECONDARY, '#18D8FF', GREEN];

const resolveIcon = (name, fallback = FaLightbulb) => {
  if (typeof name === 'function') return name;
  return iconRegistry[name] || fallback;
};

const normalizeCopy = (item) => item?.description || item?.text || item?.desc || '';

const defaultAbout = {
  hero: {
    badge: 'Est. 2024 · Nairobi, Kenya',
    headline: 'We Don’t Just Write Code.',
    highlight: 'We Build Futures.',
    intro: 'AngiSoft Technologies builds software, data systems, digital services, and practical platforms from real community and business needs.',
    imageUrl: '/images/Branding/AngiSoft%20T-Shirts%20Design.png',
    primaryCta: { label: 'Start a Project', to: '/booking' },
    secondaryCta: { label: 'Our Services', to: '/services' },
  },
  profileTabs: [
    {
      id: 'who',
      label: 'Who We Are',
      text: 'AngiSoft Technologies is a Nairobi-based software company founded in December 2024, growing from practical technical support into a serious engineering and digital products brand.',
      badges: ['Founded Dec 2024', 'Nairobi, Kenya', 'African-first focus'],
    },
    {
      id: 'what',
      label: 'What We Do',
      text: 'We build web apps, mobile apps, dashboards, business systems, automation workflows, cloud deployments, and digital support services for real operations.',
      badges: ['Software', 'Data', 'Automation', 'Digital services'],
    },
    {
      id: 'how',
      label: 'How We Work',
      text: 'We listen first, map the process, build in focused iterations, test with users, and keep improving after launch.',
      badges: ['Discover', 'Design', 'Build', 'Improve'],
    },
  ],
  principles: [
    { icon: 'FaRocket', title: 'Mission', description: 'Empower people and businesses with practical, reliable, and affordable technology solutions.' },
    { icon: 'FaEye', title: 'Vision', description: 'Become a leading African software and digital products company recognized for impact.' },
    { icon: 'FaHeart', title: 'Philosophy', description: 'Innovate → Build → Empower. Solve real problems and help people grow through technology.' },
  ],
  values: [
    { icon: 'FaLightbulb', title: 'Innovate', text: 'We start with real problems faced by businesses, creators, students, and communities.' },
    { icon: 'FaCode', title: 'Build', text: 'We engineer reliable web, mobile, data, automation, and product systems.' },
    { icon: 'FaHandsHelping', title: 'Empower', text: 'We share skills, create tools, support creators, and help businesses digitize.' },
    { icon: 'FaSeedling', title: 'Authentic Growth', text: 'We embrace our grassroots origin while building scalable technology for the future.' },
  ],
  serviceHighlights: [],
  techStack: [],
  timeline: [],
  locations: [],
  quote: {
    text: 'We are building AngiSoft from real problems, real users, and real community needs — not from theory.',
    source: 'AngiSoft Technologies',
  },
  cta: {
    title: 'Let’s Build Something Extraordinary Together',
    description: 'Whether you need custom software, a SaaS product, data dashboards, automation, mobile apps, or digital support, AngiSoft can help turn the idea into a practical working system.',
    primary: { label: 'Start a Project', to: '/booking' },
    secondary: { label: 'Talk to Us', to: '/contact' },
  },
};

const SectionHeader = ({ eyebrow, title, highlight, centered = false, action }) => (
  <div className={`mb-10 lg:mb-14 ${centered ? 'text-center max-w-4xl mx-auto' : 'flex flex-col gap-6 md:flex-row md:items-end md:justify-between'}`}>
    <div>
      <span className="block mb-4 text-sm font-bold uppercase tracking-[0.28em] text-[#0875FF]" style={{ fontFamily: 'Sora, sans-serif' }}>
        {eyebrow}
      </span>
      <h2 className="text-4xl font-black leading-[1.02] text-white md:text-5xl xl:text-6xl" style={{ fontFamily: 'Sora, sans-serif' }}>
        {title}{' '}
        {highlight && (
          <span className="bg-gradient-to-r from-[#0875FF] via-[#00AFFF] to-[#39FF6A] bg-clip-text text-transparent">
            {highlight}
          </span>
        )}
      </h2>
    </div>
    {action}
  </div>
);

const About = () => {
  const navigate = useNavigate();
  const [about, setAbout] = useState(null);
  const [staff, setStaff] = useState([]);
  const [companyStats, setCompanyStats] = useState([]);
  const [activeTab, setActiveTab] = useState('who');

  useEffect(() => {
    apiGet('/site/about').then(setAbout).catch(() => {});
    apiGet('/staff').then((data) => { if (Array.isArray(data)) setStaff(data); }).catch(() => {});
    apiGet('/company-stats').then((data) => { if (Array.isArray(data)) setCompanyStats(data); }).catch(() => {});
  }, []);

  const content = useMemo(() => ({ ...defaultAbout, ...(about || {}) }), [about]);
  const hero = { ...defaultAbout.hero, ...(content.hero || {}) };
  const tabs = content.profileTabs?.length ? content.profileTabs : defaultAbout.profileTabs;
  const activeTabData = tabs.find((tab) => tab.id === activeTab) || tabs[0];
  const descriptions = Array.isArray(content.description) ? content.description : [];
  const principles = content.principles?.length ? content.principles : defaultAbout.principles;
  const services = content.serviceHighlights?.length ? content.serviceHighlights : defaultAbout.serviceHighlights;
  const values = content.values?.length ? content.values : defaultAbout.values;
  const timeline = content.timeline?.length ? content.timeline : [];
  const techStack = content.techStack?.length ? content.techStack : defaultAbout.techStack;
  const locations = content.locations?.length ? content.locations : defaultAbout.locations;
  const quote = { ...defaultAbout.quote, ...(content.quote || {}) };
  const cta = { ...defaultAbout.cta, ...(content.cta || {}) };
  const teamPreview = staff.slice(0, 4);

  const stats = useMemo(() => {
    const cmsStats = content.stats?.length ? content.stats : [];
    const source = companyStats.length ? companyStats : cmsStats;
    const normalized = source.slice(0, 4).map((stat) => ({
      value: `${stat.value ?? ''}${stat.suffix ?? ''}`,
      label: stat.label,
      icon: resolveIcon(stat.icon, FaAward),
      description: stat.description,
    }));

    if (staff.length > 0) {
      normalized[0] = { value: `${staff.length}+`, label: 'Team Members', icon: FaUsers, description: 'Published AngiSoft team profiles' };
    }

    return normalized;
  }, [companyStats, content.stats, staff.length]);

  return (
    <div className="min-h-screen overflow-hidden text-white" style={{ backgroundColor: DARK_BG }}>
      <div className="pointer-events-none fixed inset-0 opacity-40">
        <div className="absolute -left-40 top-10 h-96 w-96 rounded-full bg-[#0875FF]/20 blur-[140px]" />
        <div className="absolute right-0 top-1/3 h-[32rem] w-[32rem] rounded-full bg-[#00AFFF]/10 blur-[160px]" />
        <div className="absolute bottom-0 left-1/3 h-80 w-80 rounded-full bg-[#39FF6A]/10 blur-[150px]" />
      </div>

      <section className="relative min-h-[86vh] px-6 py-24 lg:px-8 lg:py-32">
        <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[0.92fr_1.08fr]">
          <ScrollReveal animation="fadeUp">
            <div className="max-w-3xl text-center lg:text-left">
              <div className="mb-7 inline-flex items-center gap-3 rounded-full border border-[#0875FF]/25 bg-[#0875FF]/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.22em] text-[#00AFFF]">
                <span className="h-2 w-2 rounded-full bg-[#39FF6A] shadow-[0_0_18px_#39FF6A]" />
                {hero.badge || content.eyebrow}
              </div>
              <h1 className="text-5xl font-black leading-[0.94] tracking-[-0.05em] md:text-6xl xl:text-7xl" style={{ fontFamily: 'Sora, sans-serif' }}>
                {hero.headline}
                <span className="mt-2 block bg-gradient-to-r from-[#0875FF] via-[#00AFFF] to-[#39FF6A] bg-clip-text text-transparent">
                  {hero.highlight}
                </span>
              </h1>
              <p className="mx-auto mt-8 max-w-2xl text-lg leading-8 text-white/60 lg:mx-0">
                {hero.intro || descriptions[0]}
              </p>
              <div className="mt-10 flex flex-wrap justify-center gap-4 lg:justify-start">
                <button
                  onClick={() => navigate(hero.primaryCta?.to || '/booking')}
                  className="group inline-flex items-center gap-3 rounded-full bg-gradient-to-r from-[#0875FF] to-[#003BCE] px-7 py-4 text-sm font-bold text-white shadow-[0_20px_50px_rgba(8,117,255,0.3)] transition hover:-translate-y-1"
                >
                  {hero.primaryCta?.label || 'Start a Project'}
                  <FaArrowRight className="transition group-hover:translate-x-1" />
                </button>
                <button
                  onClick={() => navigate(hero.secondaryCta?.to || '/services')}
                  className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-7 py-4 text-sm font-bold text-white/80 transition hover:-translate-y-1 hover:bg-white/10"
                >
                  {hero.secondaryCta?.label || 'Our Services'}
                  <FaChevronRight className="text-xs" />
                </button>
              </div>
            </div>
          </ScrollReveal>

          <ScrollReveal animation="fadeRight" delay={140}>
            <div className="relative mx-auto w-full max-w-2xl">
              <div className="absolute -inset-4 rounded-[2rem] bg-gradient-to-br from-[#0875FF]/40 via-[#00AFFF]/10 to-[#39FF6A]/20 blur-2xl" />
              <div className="relative overflow-hidden rounded-[1.75rem] border border-white/10 bg-white/5 shadow-2xl">
                <img
                  src={resolveAssetUrl(hero.imageUrl)}
                  alt="AngiSoft Technologies brand"
                  className="h-[360px] w-full object-cover md:h-[520px]"
                  onError={(event) => {
                    event.currentTarget.src = '/images/Branding/AngiSoft%20T-Shirts%20Design.png';
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#07142B] via-transparent to-transparent" />
              </div>
              <div className="absolute -bottom-7 left-4 rounded-2xl border border-[#0875FF]/30 bg-[#07142B]/90 px-6 py-4 backdrop-blur-xl md:left-[-1.5rem]">
                <div className="text-4xl font-black text-[#0875FF]" style={{ fontFamily: 'Sora, sans-serif' }}>2024</div>
                <div className="text-xs uppercase tracking-[0.18em] text-white/45">Year Founded</div>
              </div>
              {staff.length > 0 && (
                <div className="absolute -top-6 right-4 rounded-2xl border border-[#00AFFF]/30 bg-[#07142B]/90 px-5 py-4 backdrop-blur-xl md:right-[-1.5rem]">
                  <div className="flex items-center gap-3">
                    <div className="flex -space-x-2">
                      {staff.slice(0, 3).map((member) => (
                        <div key={member.id} className="h-9 w-9 overflow-hidden rounded-full border-2 border-[#07142B] bg-[#0875FF]">
                          {member.avatarUrl ? (
                            <img src={resolveAssetUrl(member.avatarUrl)} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-xs font-black">
                              {member.firstName?.[0]}{member.lastName?.[0]}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                    <div>
                      <div className="font-black">{staff.length}+</div>
                      <div className="text-[10px] uppercase tracking-[0.14em] text-white/40">Team Members</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollReveal>
        </div>
      </section>

      {stats.length > 0 && (
        <section className="relative px-6 py-14 lg:px-8">
          <div className="mx-auto grid max-w-7xl grid-cols-2 gap-4 lg:grid-cols-4">
            {stats.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <ScrollReveal key={`${stat.label}-${index}`} animation="fadeUp" delay={index * 70}>
                  <div className="group flex min-h-[150px] flex-col items-center justify-center rounded-3xl border border-white/10 bg-white/[0.035] p-6 text-center transition hover:-translate-y-1 hover:border-[#0875FF]/40 hover:bg-white/[0.055]">
                    <Icon className="mb-4 text-2xl text-[#0875FF] opacity-80" />
                    <div className="text-4xl font-black tracking-[-0.04em] md:text-5xl" style={{ fontFamily: 'Sora, sans-serif' }}>{stat.value}</div>
                    <div className="mt-2 text-xs font-bold uppercase tracking-[0.18em] text-white/45">{stat.label}</div>
                  </div>
                </ScrollReveal>
              );
            })}
          </div>
        </section>
      )}

      <section className="px-6 py-20 lg:px-8 lg:py-28">
        <div className="mx-auto grid max-w-7xl items-start gap-10 lg:grid-cols-[1.08fr_0.92fr]">
          <ScrollReveal animation="fadeLeft">
            <div className="rounded-[2rem] border border-white/10 bg-white/[0.035] p-6 md:p-8 lg:p-10">
              <SectionHeader eyebrow="Company Profile" title="Building Africa’s" highlight="Digital Future" />
              <div className="mb-8 flex flex-wrap justify-center gap-2 rounded-2xl bg-white/[0.04] p-2 md:justify-start">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`rounded-xl px-5 py-3 text-sm font-bold transition ${activeTabData?.id === tab.id ? 'bg-[#0875FF] text-white' : 'text-white/45 hover:bg-white/5 hover:text-white/80'}`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              <p className="text-center text-lg leading-9 text-white/62 md:text-left">{activeTabData?.text || activeTabData?.content}</p>
              <div className="mt-7 flex flex-wrap justify-center gap-2 md:justify-start">
                {(activeTabData?.badges || activeTabData?.highlights || []).map((badge) => (
                  <span key={badge} className="inline-flex items-center gap-2 rounded-full border border-[#0875FF]/20 bg-[#0875FF]/10 px-3 py-1.5 text-xs font-bold text-[#00AFFF]">
                    <FaCheckCircle /> {badge}
                  </span>
                ))}
              </div>
            </div>
          </ScrollReveal>

          <div className="grid gap-4">
            {principles.map((principle, index) => {
              const Icon = resolveIcon(principle.icon, FaRocket);
              const color = principle.color || colorCycle[index % colorCycle.length];
              return (
                <ScrollReveal key={principle.title} animation="fadeRight" delay={index * 90}>
                  <div className="flex gap-5 rounded-3xl border border-white/10 bg-white/[0.035] p-6 transition hover:-translate-y-1 hover:bg-white/[0.055]">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl" style={{ background: `linear-gradient(135deg, ${color}, ${BLUE_PRIMARY})` }}>
                      <Icon className="text-xl" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-black uppercase tracking-[-0.04em]" style={{ color, fontFamily: 'Sora, sans-serif' }}>{principle.title}</h3>
                      <p className="mt-2 text-base leading-7 text-white/55">{normalizeCopy(principle)}</p>
                    </div>
                  </div>
                </ScrollReveal>
              );
            })}
          </div>
        </div>
      </section>

      {services.length > 0 && (
        <section className="relative px-6 py-20 lg:px-8 lg:py-28">
          <div className="mx-auto max-w-7xl">
            <ScrollReveal animation="fadeUp">
              <SectionHeader
                eyebrow="What We Do"
                title="Our"
                highlight="Expertise"
                action={(
                  <button onClick={() => navigate('/services')} className="inline-flex items-center gap-2 text-sm font-black text-[#0875FF] transition hover:gap-4">
                    All Services <FaArrowRight />
                  </button>
                )}
              />
            </ScrollReveal>
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {services.map((service, index) => {
                const Icon = resolveIcon(service.icon, FaCode);
                const color = service.color || colorCycle[index % colorCycle.length];
                return (
                  <ScrollReveal key={service.title} animation="fadeUp" delay={index * 70}>
                    <div className="group h-full rounded-3xl border border-white/10 bg-white/[0.035] p-7 transition hover:-translate-y-2 hover:border-[#0875FF]/35 hover:bg-white/[0.055]">
                      <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl transition group-hover:scale-110" style={{ background: `${color}18` }}>
                        <Icon className="text-2xl" style={{ color }} />
                      </div>
                      <h3 className="text-2xl font-black tracking-[-0.04em]" style={{ fontFamily: 'Sora, sans-serif' }}>{service.title}</h3>
                      <p className="mt-3 text-base leading-7 text-white/52">{normalizeCopy(service)}</p>
                    </div>
                  </ScrollReveal>
                );
              })}
            </div>
          </div>
        </section>
      )}

      <section className="px-6 py-20 lg:px-8 lg:py-28">
        <div className="mx-auto max-w-7xl">
          <ScrollReveal animation="fadeUp">
            <SectionHeader eyebrow="What We Stand For" title="Core" highlight="Values" centered />
          </ScrollReveal>
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {values.map((value, index) => {
              const Icon = resolveIcon(value.icon, FaLightbulb);
              return (
                <ScrollReveal key={value.title} animation="fadeUp" delay={index * 80}>
                  <div className="relative h-full overflow-hidden rounded-3xl border border-white/10 bg-white/[0.035] p-7 text-center transition hover:-translate-y-2 hover:bg-white/[0.055] md:text-left">
                    <div className="absolute -right-2 -top-4 text-[7rem] font-black leading-none text-white/[0.025]" style={{ fontFamily: 'Sora, sans-serif' }}>{String(index + 1).padStart(2, '0')}</div>
                    <div className="relative">
                      <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#0875FF]/15 md:mx-0">
                        <Icon className="text-xl text-[#0875FF]" />
                      </div>
                      <h3 className="text-2xl font-black tracking-[-0.04em]" style={{ fontFamily: 'Sora, sans-serif' }}>{value.title}</h3>
                      <p className="mt-3 text-base leading-7 text-white/52">{normalizeCopy(value)}</p>
                    </div>
                  </div>
                </ScrollReveal>
              );
            })}
          </div>
        </div>
      </section>

      {techStack.length > 0 && (
        <section className="px-6 py-20 lg:px-8 lg:py-24">
          <div className="mx-auto max-w-6xl text-center">
            <ScrollReveal animation="fadeUp">
              <SectionHeader eyebrow="Our Toolkit" title="Technologies We" highlight="Master" centered />
              <div className="flex flex-wrap justify-center gap-3">
                {techStack.map((tech, index) => {
                  const Icon = resolveIcon(tech.icon, FaCode);
                  const color = tech.color || colorCycle[index % colorCycle.length];
                  return (
                    <span key={tech.name} className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/[0.055] px-5 py-3 text-sm font-bold text-white/65 transition hover:-translate-y-1 hover:text-white">
                      <Icon style={{ color }} /> {tech.name}
                    </span>
                  );
                })}
              </div>
            </ScrollReveal>
          </div>
        </section>
      )}

      {timeline.length > 0 && (
        <section className="px-6 py-20 lg:px-8 lg:py-28">
          <div className="mx-auto max-w-6xl">
            <ScrollReveal animation="fadeUp">
              <SectionHeader eyebrow="Our Journey" title="How We" highlight="Got Here" centered />
            </ScrollReveal>
            <div className="grid gap-5 md:grid-cols-2">
              {timeline.map((item, index) => (
                <ScrollReveal key={`${item.year}-${item.title}`} animation="fadeUp" delay={index * 80}>
                  <div className="h-full rounded-3xl border border-white/10 bg-white/[0.035] p-7 transition hover:-translate-y-1 hover:bg-white/[0.055]">
                    <span className="inline-flex rounded-full bg-[#0875FF]/10 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-[#00AFFF]">{item.year}</span>
                    <h3 className="mt-5 text-2xl font-black tracking-[-0.04em]" style={{ fontFamily: 'Sora, sans-serif' }}>{item.title}</h3>
                    <p className="mt-3 text-base leading-7 text-white/52">{item.description}</p>
                  </div>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="px-6 py-20 lg:px-8 lg:py-24">
        <ScrollReveal animation="scaleUp">
          <div className="mx-auto max-w-5xl rounded-[2rem] border border-[#0875FF]/20 bg-gradient-to-br from-white/[0.06] to-white/[0.025] p-8 text-center md:p-12">
            <FaQuoteLeft className="mx-auto mb-7 text-4xl text-[#0875FF]/40" />
            <blockquote className="text-2xl font-black leading-tight tracking-[-0.04em] text-white/88 md:text-4xl" style={{ fontFamily: 'Sora, sans-serif' }}>
              “{quote.text}”
            </blockquote>
            <div className="mt-7 text-sm font-bold uppercase tracking-[0.22em] text-[#00AFFF]">{quote.source}</div>
          </div>
        </ScrollReveal>
      </section>

      {teamPreview.length > 0 && (
        <section className="px-6 py-20 lg:px-8 lg:py-28">
          <div className="mx-auto max-w-7xl">
            <ScrollReveal animation="fadeUp">
              <SectionHeader
                eyebrow="The People"
                title="Meet the"
                highlight="Team"
                action={(
                  <button onClick={() => navigate('/staff')} className="inline-flex items-center gap-2 text-sm font-black text-[#0875FF] transition hover:gap-4">
                    View All <FaArrowRight />
                  </button>
                )}
              />
            </ScrollReveal>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {teamPreview.map((member, index) => (
                <ScrollReveal key={member.id} animation="fadeUp" delay={index * 80}>
                  <button
                    type="button"
                    onClick={() => navigate(getStaffDetailPath(member))}
                    className="group h-full w-full overflow-hidden rounded-3xl border border-white/10 bg-white/[0.035] text-left transition hover:-translate-y-2 hover:border-[#0875FF]/35 hover:bg-white/[0.055]"
                  >
                    <div className="relative h-64 overflow-hidden bg-[#0B1E3D]">
                      {member.avatarUrl ? (
                        <img src={resolveAssetUrl(member.avatarUrl)} alt={`${member.firstName} ${member.lastName}`} className="h-full w-full object-cover transition duration-700 group-hover:scale-110" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#0875FF] to-[#00AFFF] text-5xl font-black">
                          {member.firstName?.[0]}{member.lastName?.[0]}
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-[#07142B] via-[#07142B]/30 to-transparent" />
                      <div className="absolute bottom-5 left-5 right-5">
                        <h3 className="text-2xl font-black leading-tight tracking-[-0.04em]" style={{ fontFamily: 'Sora, sans-serif' }}>
                          {member.firstName} {member.lastName}
                        </h3>
                        <p className="mt-1 text-sm font-bold text-[#0875FF]">{member.publicTitle || member.role?.toLowerCase().replaceAll('_', ' ')}</p>
                      </div>
                    </div>
                    <div className="p-5">
                      {(member.publicSummary || member.bio) && (
                        <p className="line-clamp-3 text-sm leading-7 text-white/52">{member.publicSummary || member.bio}</p>
                      )}
                      {member.skills?.length > 0 && (
                        <div className="mt-5 flex flex-wrap gap-1.5">
                          {member.skills.slice(0, 3).map((skill) => (
                            <span key={skill} className="rounded-full border border-[#0875FF]/20 bg-[#0875FF]/10 px-2.5 py-1 text-[10px] font-bold text-[#00AFFF]">{skill}</span>
                          ))}
                        </div>
                      )}
                      <div className="mt-5 inline-flex items-center gap-2 text-xs font-black text-[#0875FF]">
                        View Profile <FaArrowRight className="transition group-hover:translate-x-1" />
                      </div>
                    </div>
                  </button>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </section>
      )}

      {locations.length > 0 && (
        <section className="px-6 py-20 lg:px-8 lg:py-24">
          <div className="mx-auto max-w-6xl text-center">
            <ScrollReveal animation="fadeUp">
              <SectionHeader eyebrow="Where We Operate" title="East African" highlight="Presence" centered />
              <div className="flex flex-wrap justify-center gap-4">
                {locations.map((location, index) => (
                  <div key={`${location.country}-${location.city}`} className={`flex min-w-[210px] items-center justify-between gap-4 rounded-2xl border px-5 py-4 text-left ${index === 0 ? 'border-[#0875FF]/35 bg-[#0875FF]/10' : 'border-white/10 bg-white/[0.035]'}`}>
                    <span className="text-4xl">{location.flag}</span>
                    <div className="flex-1">
                      <div className="font-black" style={{ fontFamily: 'Sora, sans-serif' }}>{location.country}</div>
                      <div className="text-sm text-white/45">{location.city}</div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollReveal>
          </div>
        </section>
      )}

      <section className="px-6 py-20 lg:px-8 lg:py-28">
        <ScrollReveal animation="scaleUp">
          <div className="relative mx-auto max-w-5xl overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#0875FF] via-[#0066FF] to-[#003BCE] p-8 text-center shadow-[0_40px_120px_rgba(8,117,255,0.28)] md:p-14 lg:p-20">
            <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '28px 28px' }} />
            <div className="relative">
              <h2 className="text-4xl font-black leading-tight tracking-[-0.05em] md:text-6xl" style={{ fontFamily: 'Sora, sans-serif' }}>{cta.title}</h2>
              <p className="mx-auto mt-6 max-w-3xl text-lg leading-8 text-white/72">{cta.description}</p>
              <div className="mt-10 flex flex-wrap justify-center gap-4">
                <button onClick={() => navigate(cta.primary?.to || '/booking')} className="group inline-flex items-center gap-3 rounded-full bg-white px-8 py-4 text-sm font-black text-[#003BCE] transition hover:-translate-y-1">
                  {cta.primary?.label || 'Start a Project'} <FaArrowRight className="transition group-hover:translate-x-1" />
                </button>
                <button onClick={() => navigate(cta.secondary?.to || '/contact')} className="inline-flex items-center gap-3 rounded-full border border-white/25 bg-white/10 px-8 py-4 text-sm font-black text-white transition hover:-translate-y-1 hover:bg-white/15">
                  {cta.secondary?.label || 'Talk to Us'}
                </button>
              </div>
            </div>
          </div>
        </ScrollReveal>
      </section>
    </div>
  );
};

export default About;
