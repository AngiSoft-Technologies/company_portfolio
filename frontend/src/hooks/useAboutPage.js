import { useEffect, useState } from 'react';
import { apiGet } from '../js/httpClient';
import { resolveAssetUrl } from '../utils/constants';

/**
 * Scoped default content for the About page.
 *
 * This is NOT mock production data used as a permanent fallback. It exists so the
 * page renders a complete, on-brand experience when the CMS `site_about` Setting
 * is empty or in development, and every field here mirrors real AngiSoft history
 * (founded Dec 2024, Nairobi HQ, the PetroFlow / DukaFlow / KejaLink / AngiTunes
 * product ecosystems, and the genuine grassroots origin). The backend /site/about
 * value is deep-merged on top of this at runtime.
 */
export const defaultAbout = {
  heroSlides: [
    {
      id: 1,
      imageUrl: '/uploads/public/images/about/hero/prof-angera-founder.jpg',
      title: 'Prof Angera Silas',
      subtitle: 'Founder and Lead Software Engineer'
    },
    {
      id: 2,
      imageUrl: '/uploads/public/images/about/hero/angisoft-product-work.jpg',
      title: 'Engineering Practical Solutions',
      subtitle: 'Software shaped by real business and community needs'
    },
    {
      id: 3,
      imageUrl: '/uploads/public/images/about/hero/angisoft-team.jpg',
      title: 'A Collaborative Team',
      subtitle: 'Engineers, data and digital-service specialists'
    },
    {
      id: 4,
      imageUrl: '/uploads/public/images/about/hero/angisoft-product-work.jpg',
      title: 'Building Product Ecosystems',
      subtitle: 'PetroFlow, DukaFlow, KejaLink and AngiTunes'
    }
  ],
  intro: {
    badge: 'Est. 2024 · Nairobi, Kenya',
    eyebrow: 'About AngiSoft Technologies',
    headline: 'Building Africa’s Digital Future',
    paragraph:
      'AngiSoft Technologies is a Nairobi-based software company building practical systems, data products and digital services from real community and business needs.',
    primaryCta: { label: 'Start a Project', to: '/booking' },
    imageUrl: '/uploads/public/images/about/hero/angisoft-team.jpg'
  },
  stats: [
    { id: 'founded', value: '2024', suffix: '', label: 'Year AngiSoft was founded' },
    { id: 'projects', value: '8', suffix: '+', label: 'Projects contributed to' },
    { id: 'products', value: '4', suffix: '', label: 'Product ecosystems' },
    { id: 'services', value: '10', suffix: '+', label: 'Digital service areas' }
  ],
  numberStories: [
    {
      id: 'founded',
      eyebrow: 'Our Origin',
      statistic: '2024',
      suffix: '',
      title: 'Founded in 2024',
      text: 'AngiSoft Technologies began from practical grassroots technology work: debugging student systems, teaching beginner coding, preparing documents, analysing data, installing software, creating posters and helping people complete essential online applications.',
      imageUrl: '/uploads/public/images/about/numbers/founded-2024.jpg',
      link: { label: 'Read our story', to: '/about' }
    },
    {
      id: 'projects',
      eyebrow: 'Practical Work',
      statistic: '8',
      suffix: '+',
      title: 'Projects and practical work',
      text: 'Our experience has grown through practical contribution to real systems, including websites, mobile applications, management platforms, databases, data workflows and software recovery projects.',
      images: [
        { url: '/uploads/public/images/about/numbers/projects.jpg', caption: 'Websites & platforms' },
        { url: '/uploads/public/images/about/numbers/product-ecosystems.jpg', caption: 'Product work' }
      ],
      link: { label: 'See our work', to: '/services' }
    },
    {
      id: 'products',
      eyebrow: 'Our Products',
      statistic: '4',
      suffix: '',
      title: 'Product ecosystems',
      text: 'AngiSoft is moving beyond one-off technical work into original technology products built around African business, property, fuel, retail and creative-industry needs.',
      images: [
        { url: '/uploads/public/images/about/numbers/product-ecosystems.jpg', caption: 'PetroFlow, DukaFlow, KejaLink, AngiTunes' }
      ],
      link: { label: 'Explore products', to: '/products' }
    },
    {
      id: 'empowerment',
      eyebrow: 'Long-Term Impact',
      statistic: '10',
      suffix: '+',
      title: 'Technology that empowers',
      text: 'We do not build software only for delivery. We create systems, transfer knowledge, support users and help businesses build lasting digital capacity.',
      imageUrl: '/uploads/public/images/about/numbers/digital-empowerment.jpg',
      link: { label: 'Our approach', to: '/services' }
    }
  ],
  geography: {
    eyebrow: 'Where We Work',
    title: 'AngiSoft Across Africa',
    intro:
      'AngiSoft Technologies operates from Nairobi and delivers digital work across East Africa and the wider continent, with remote collaboration reaching clients globally.',
    regions: [
      {
        id: 'nairobi',
        title: 'Nairobi, Kenya',
        label: 'Headquarters',
        description:
          'AngiSoft Technologies operates from Nairobi and serves clients through both direct and remote collaboration.',
        x: 66,
        y: 63
      },
      {
        id: 'east-africa',
        title: 'East Africa',
        label: 'Primary Growth Region',
        description:
          'We are building solutions relevant to businesses, institutions, creators and communities across East Africa.',
        x: 71,
        y: 54
      },
      {
        id: 'africa',
        title: 'Africa',
        label: 'Long-Term Market',
        description:
          'Our product vision is to build adaptable African technology platforms capable of scaling across borders.',
        x: 51,
        y: 57
      },
      {
        id: 'global',
        title: 'Global Digital Delivery',
        label: 'Long-Term Reach',
        description:
          'We collaborate with remote clients worldwide, delivering and supporting systems across time zones.',
        x: 30,
        y: 40
      }
    ],
    supplementary: [
      { country: 'Kenya', city: 'Nairobi (HQ)', note: 'Primary delivery hub' },
      { country: 'East Africa', city: 'Regional', note: 'Cross-border clients' },
      { country: 'Global', city: 'Remote', note: 'Remote delivery' }
    ]
  },
  empowermentCommitment: {
    eyebrow: 'Social Responsibility',
    title: 'Our Commitment to Digital Empowerment',
    text:
      'We believe technology should create practical opportunity. AngiSoft supports digital inclusion through accessible software, beginner-friendly technical guidance, community services, knowledge sharing and tools designed around real African needs.',
    imageUrl: '/uploads/public/images/about/numbers/digital-empowerment.jpg',
    cta: { label: 'Read Our Empowerment Philosophy', to: '/about' }
  },
  collaborationModels: [
    {
      id: 'flexible',
      title: 'Flexible Engagement Models',
      icon: '/uploads/public/images/about/collaboration/flexible-delivery.svg',
      items: [
        'End-to-end project delivery',
        'Product development',
        'Feature upgrades',
        'Technical support',
        'Ongoing maintenance'
      ]
    },
    {
      id: 'integration',
      title: 'Smooth Integration',
      icon: '/uploads/public/images/about/collaboration/seamless-integration.svg',
      items: [
        'Fast onboarding',
        'Existing-codebase support',
        'Database and API integration',
        'Workflow alignment',
        'Remote collaboration'
      ]
    },
    {
      id: 'communication',
      title: 'Clear Communication and Ownership',
      icon: '/uploads/public/images/about/collaboration/communication-ownership.svg',
      items: [
        'Defined milestones',
        'Progress tracking',
        'Transparent communication',
        'Demonstrations and reviews',
        'Clear responsibilities'
      ]
    }
  ],
  timeline: [
    {
      year: 'Before 2024',
      title: 'Grassroots Technology Work',
      description:
        'Coding support, documents, data work, installations, applications, posters and beginner technology training.',
      imageUrl: '/uploads/public/images/about/highlights/grassroots-origin.jpg'
    },
    {
      year: 'Dec 2024',
      title: 'AngiSoft Technologies Officially Begins',
      description: 'Prof Angera Silas establishes AngiSoft as a unified African technology brand.',
      imageUrl: '/uploads/public/images/about/highlights/founding-2024.jpg'
    },
    {
      year: '2025',
      title: 'Growth into Software Systems',
      description:
        'AngiSoft expands into websites, management platforms, mobile applications and database-driven solutions.',
      imageUrl: '/uploads/public/images/about/highlights/systems-growth-2025.jpg'
    },
    {
      year: '2026',
      title: 'Building Original Product Ecosystems',
      description: 'Development continues across PetroFlow, DukaFlow, KejaLink and AngiTunes.',
      imageUrl: '/uploads/public/images/about/highlights/ecosystems-2026.jpg'
    }
  ],
  transitionBanner: {
    eyebrow: 'Our Vision',
    title: 'Let’s Build Africa’s Digital Future Together',
    subtitle:
      'Across every project we ask the same question: how does this technology create real, lasting opportunity?',
    primaryCta: { label: 'Start a Project', to: '/booking' }
  },
  industries: [
    { id: 'retail', title: 'Retail and SMEs', context: 'POS, inventory and SME platforms', imageUrl: '/uploads/public/images/about/industries/retail.jpg' },
    { id: 'education', title: 'Education', context: 'Learning systems and student tooling', imageUrl: '/uploads/public/images/about/industries/education.jpg' },
    { id: 'real-estate', title: 'Real Estate', context: 'Property platforms like KejaLink', imageUrl: '/uploads/public/images/about/industries/real-estate.jpg' },
    { id: 'oil-gas', title: 'Oil and Gas', context: 'Fuel and depot systems like PetroFlow', imageUrl: '/uploads/public/images/about/industries/oil-gas.jpg' },
    { id: 'creative', title: 'Creative and Entertainment', context: 'Music platforms like AngiTunes', imageUrl: '/uploads/public/images/about/industries/creative-industry.jpg' },
    { id: 'professional', title: 'Professional Services', context: 'Practice and consulting systems', imageUrl: '/uploads/public/images/about/industries/professional-services.jpg' },
    { id: 'hospitality', title: 'Hospitality', context: 'Booking and operations tools', imageUrl: '/uploads/public/images/about/industries/hospitality.jpg' },
    { id: 'transport', title: 'Transport and Logistics', context: 'Fleet and dispatch workflows', imageUrl: '/uploads/public/images/about/industries/transport.jpg' },
    { id: 'community', title: 'Community and Personal Services', context: 'KRA/SHA and document services', imageUrl: '/uploads/public/images/about/industries/community.jpg' },
    { id: 'startups', title: 'Technology Startups', context: 'MVPs and product engineering', imageUrl: '/uploads/public/images/about/industries/startups.jpg' }
  ],
  clients: [
    { id: 'kingsway', name: 'Kingsway School System', logoUrl: '/uploads/public/images/about/clients/kingsway.svg', note: 'School management system' },
    { id: 'primestack', name: 'PrimeStack', logoUrl: '/uploads/public/images/about/clients/primestack.svg', note: 'Engineering client' },
    { id: 'petroflow', name: 'PetroFlow', logoUrl: '/uploads/public/images/about/clients/petroflow.svg', note: 'AngiSoft product' },
    { id: 'dukaflow', name: 'DukaFlow', logoUrl: '/uploads/public/images/about/clients/dukaflow.svg', note: 'AngiSoft product' },
    { id: 'kejalink', name: 'KejaLink', logoUrl: '/uploads/public/images/about/clients/kejalink.svg', note: 'AngiSoft product' },
    { id: 'angitunes', name: 'AngiTunes', logoUrl: '/uploads/public/images/about/clients/angitunes.svg', note: 'AngiSoft product' },
    { id: 'havenswell', name: 'Havenswell', logoUrl: '/uploads/public/images/about/clients/havenswell.svg', note: 'Business partner' },
    { id: 'helb', name: 'HELB', logoUrl: '/uploads/public/images/about/clients/helb.svg', note: 'Education financing partner' },
    { id: 'kra', name: 'KRA', logoUrl: '/uploads/public/images/about/clients/kra.svg', note: 'Compliance & tax services' }
  ],
  clientStats: {
    description:
      'Across retail, education, real estate, energy and government services, AngiSoft platforms power everyday operations for growing organisations — and a family of original African products reaching users nationwide.',
    metrics: [
      { value: '9+', label: 'Partners & product ecosystems' },
      { value: '5', label: 'Original product lines' },
      { value: '2024', label: 'Building since' },
      { value: '5', label: 'Core industries served' }
    ]
  },
  clientHighlights: [
    {
      id: 'petroflow',
      title: 'PetroFlow — fuel depot automation',
      summary: 'Real-time stock and dispatch control for fuel depots, built for African supply chains.',
      imageUrl: '/uploads/public/images/about/highlights/ecosystems-2026.jpg',
      link: { label: 'Explore PetroFlow', to: '/products/petroflow' }
    },
    {
      id: 'kejalink',
      title: 'KejaLink — property at scale',
      summary: 'A property platform connecting agents, tenants and owners across the country.',
      imageUrl: '/uploads/public/images/about/highlights/systems-growth-2025.jpg',
      link: { label: 'Explore KejaLink', to: '/products/kejalink' }
    },
    {
      id: 'kingsway',
      title: 'Kingsway — school management',
      summary: 'A complete school management system serving students, teachers and administrators.',
      imageUrl: '/uploads/public/images/about/highlights/founding-2024.jpg',
      link: { label: 'Explore Kingsway', to: '/products/kingsway' }
    }
  ],
  cta: {
    title: 'Have a Software Idea or a Digital Challenge?',
    description: 'Let AngiSoft help you turn it into a practical, secure and scalable solution.',
    primary: { label: 'Start a Project', to: '/booking' },
    secondary: { label: 'Talk to Our Team', to: '/contact' }
  },
  quotation: {
    quote:
      'We build technology that fits how African businesses actually work — practical, secure and made to last.',
    author: 'Prof Angera Silas',
    role: 'Founder, AngiSoft Technologies'
  },
  awards: {
    eyebrow: 'Recognized & Trusted',
    title: 'Partnerships & Recognitions',
    description: 'The institutions and ecosystems we collaborate with across the continent.',
    items: [
      { id: 'education', title: 'Education institutions we support with systems and training', logoUrl: '/uploads/public/images/about/clients/kingsway.svg', url: '' },
      { id: 'products', title: 'Original AngiSoft product ecosystems: PetroFlow, DukaFlow, KejaLink, AngiTunes', logoUrl: '', url: '/products' },
      { id: 'community', title: 'Community digital-services programmes (KRA/SHA, documents)', logoUrl: '', url: '' },
      { id: 'open', title: 'Open-source and technical communities we contribute to', logoUrl: '', url: '' }
    ]
  },
  solutionTypes: {
    eyebrow: 'What We Build',
    title: 'Solution Types',
    description: 'From a single debug to a complete platform — choose the engagement that fits.',
    items: [
      { id: 'custom', title: 'Custom Software', description: 'Web, mobile and desktop applications built around your workflow.', to: '/services' },
      { id: 'products', title: 'Product Ecosystems', description: 'Original AngiSoft products for African industries.', to: '/products' },
      { id: 'data', title: 'Data & Analysis', description: 'Dashboards, reports and clean data workflows.', to: '/services' },
      { id: 'cyber', title: 'Cyber & Document Services', description: 'Secure documents, applications and digital services.', to: '/services' },
      { id: 'support', title: 'Support & Maintenance', description: 'Ongoing care, upgrades and monitoring.', to: '/services' },
      { id: 'consulting', title: 'Technical Consulting', description: 'Architecture, recovery and advisory.', to: '/contact' }
    ]
  },
  technologies: {
    eyebrow: 'Our Stack',
    title: 'Technologies We Use',
    description: 'Modern, reliable tools for building and shipping software.',
    items: [
      { id: 'react', name: 'React', icon: '/uploads/public/images/about/technologies/react.svg', to: '' },
      { id: 'flutter', name: 'Flutter', icon: '/uploads/public/images/about/technologies/flutter.svg', to: '' },
      { id: 'kotlin', name: 'Kotlin', icon: '/uploads/public/images/about/technologies/kotlin.svg', to: '' },
      { id: 'node', name: 'Node.js', icon: '/uploads/public/images/about/technologies/node.svg', to: '' },
      { id: 'python', name: 'Python', icon: '/uploads/public/images/about/technologies/python.svg', to: '' },
      { id: 'postgres', name: 'PostgreSQL', icon: '/uploads/public/images/about/technologies/postgres.svg', to: '' },
      { id: 'aws', name: 'Cloud & DevOps', icon: '/uploads/public/images/about/technologies/cloud.svg', to: '' },
      { id: 'tailwind', name: 'Tailwind', icon: '/uploads/public/images/about/technologies/tailwind.svg', to: '' }
    ]
  },
  // A gallery of the services / products we deliver (ScienceSoft "service map")
  serviceGallery: {
    eyebrow: 'What We Deliver',
    title: 'Our Service Map',
    description: 'A snapshot of the products, platforms and services AngiSoft builds across industries.',
    items: [
      { id: 'retail', title: 'Retail & POS', imageUrl: '/uploads/public/images/about/industries/retail.jpg', tag: 'Product' },
      { id: 'education', title: 'School Systems', imageUrl: '/uploads/public/images/about/industries/education.jpg', tag: 'Product' },
      { id: 'realestate', title: 'Property Platforms', imageUrl: '/uploads/public/images/about/industries/real-estate.jpg', tag: 'Product' },
      { id: 'oils', title: 'Fuel & Energy', imageUrl: '/uploads/public/images/about/industries/oil-gas.jpg', tag: 'Product' },
      { id: 'cyber', title: 'Documents & Applications', imageUrl: '/uploads/public/images/about/industries/professional-services.jpg', tag: 'Service' },
      { id: 'data', title: 'Dashboards & Reports', imageUrl: '/uploads/public/images/about/industries/creative-industry.jpg', tag: 'Service' },
      { id: 'mobile', title: 'Mobile Apps', imageUrl: '/uploads/public/images/about/industries/startups.jpg', tag: 'Product' },
      { id: 'web', title: 'Web Platforms', imageUrl: '/uploads/public/images/about/industries/community.jpg', tag: 'Product' }
    ]
  },
  // Why we guarantee the work we submit succeeds
  whyGuarantee: {
    eyebrow: 'Our Promise',
    title: 'Why We Guarantee Project Success',
    description: 'We do not hand over code and disappear. Here is how we make sure what we deliver actually works in the field.',
    items: [
      { id: 'fit', title: 'Built for how you work', description: 'Solutions shaped around your real operations, not a generic template.' },
      { id: 'secure', title: 'Secure by default', description: 'Auth, validation and data protection baked in from the first commit.' },
      { id: 'support', title: 'Ongoing support', description: 'We stay with you after launch — upgrades, monitoring and fixes.' },
      { id: 'local', title: 'Local understanding', description: 'African-first thinking: connectivity, payments and context included.' }
    ]
  },
  // Full list of everything we offer (incl. computer-illiterate help: KRA, good conduct)
  fullServices: {
    eyebrow: 'Everything We Offer',
    title: 'All of the Following',
    description: 'From custom software to everyday digital errands — we help people and businesses on both ends of the tech spectrum.',
    groups: [
      {
        id: 'software',
        title: 'Custom Software & Products',
        items: [
          'Flutter / Kotlin mobile apps',
          'Web apps (POS, management systems, portfolios)',
          'Debugging & rescue of broken projects',
          'Bash automation & internal tooling'
        ]
      },
      {
        id: 'data',
        title: 'Data Analysis',
        items: [
          'Python / Excel dashboards',
          'Reports & data cleaning',
          'Visual analytics for decisions'
        ]
      },
      {
        id: 'cyber',
        title: 'Cyber & Document Services',
        items: [
          'Document editing (reports, attachments, thesis, posters, presentations)',
          'KRA / SHA / Good Conduct applications',
          'Online applications for the computer-illiterate'
        ]
      },
      {
        id: 'ads',
        title: 'Advertising & Growth',
        items: [
          'Advertising for products & staff',
          'Digital presence setup'
        ]
      }
    ]
  },
  pricing: {
    eyebrow: 'How We Price',
    title: 'Transparent, Practical Pricing',
    description: 'No hidden fees. We scope the work with you and agree a price before we start.',
    items: [
      { id: 'fixed', title: 'Fixed Project Quote', description: 'A single agreed price for a defined scope — best for clear builds.', badge: 'Popular' },
      { id: 'hourly', title: 'Hourly / Retainer', description: 'Pay for the time used — best for support, fixes and evolving work.', badge: '' },
      { id: 'free', title: 'Free First Consult', description: 'We scope and advise at no cost before any commitment.', badge: '' }
    ],
    note: 'Need something small like a KRA or Good Conduct application? That is priced as a quick, affordable digital-errand — talk to us.'
  },
  merchandise: {
    eyebrow: 'AngiSoft Merch',
    title: 'Merchandise Gallery',
    description: 'Wear the brand. Support local tech. Coming soon to our store.',
    items: [
      { id: 'tee', title: 'AngiSoft Tee', imageUrl: '/uploads/public/images/about/highlights/grassroots-origin.jpg' },
      { id: 'hoodie', title: 'Code Hoodie', imageUrl: '/uploads/public/images/about/highlights/founding-2024.jpg' },
      { id: 'cap', title: 'Dev Cap', imageUrl: '/uploads/public/images/about/highlights/systems-growth-2025.jpg' },
      { id: 'mug', title: 'Coffee Mug', imageUrl: '/uploads/public/images/about/highlights/ecosystems-2026.jpg' },
      { id: 'sticker', title: 'Sticker Pack', imageUrl: '/uploads/public/images/about/industries/startups.jpg' },
      { id: 'tote', title: 'Tote Bag', imageUrl: '/uploads/public/images/about/industries/community.jpg' }
    ]
  }
};



let cached = null;
let pending = null;

// The About page is composed from DB-backed `AboutSection` rows. Each row has a
// stable `key` (hero, intro, numberStories, geography, timeline, industries,
// clients, clientStats, clientHighlights, serviceGallery, solutionTypes,
// whyGuarantee, fullServices, pricing, merchandise, technologies, quotation,
// cta). We group the returned rows by key to reconstruct the flat `about` object
// the page components already consume.
const buildAboutFromSections = (sections) => {
  if (!Array.isArray(sections) || !sections.length) return null;
  return sections.reduce((acc, section) => {
    if (section && section.key && section.content) {
      acc[section.key] = section.content;
    }
    return acc;
  }, {});
};

const fetchPage = () => {
  if (!pending) {
    pending = Promise.all([
      apiGet('/about-sections').catch(() => null),
      apiGet('/testimonials').catch(() => [])
    ])
      .then(([sections, testimonials]) => {
        const about = buildAboutFromSections(sections) || defaultAbout;
        cached = {
          about,
          testimonials: Array.isArray(testimonials) ? testimonials : [],
          loaded: true
        };
        pending = null;
        return cached;
      })
      .catch((err) => {
        pending = null;
        throw err;
      });
  }
  return pending;
};

export const useAboutPage = () => {
  const [data, setData] = useState(cached);
  const [loading, setLoading] = useState(!cached);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    if (cached) {
      setLoading(false);
      return;
    }
    fetchPage()
      .then((result) => {
        if (!active) return;
        setData(result);
        setLoading(false);
      })
      .catch(() => {
        if (!active) return;
        // Network/API failure — degrade to bundled defaults so the page still renders.
        setData({ about: defaultAbout, testimonials: [], loaded: true });
        setError('');
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const about = data?.about || defaultAbout;
  const testimonials = data?.testimonials || [];
  const staff = [];
  const stats = about.stats || defaultAbout.stats;
  const clientStats = about.clientStats || defaultAbout.clientStats;
  const clientHighlights = about.clientHighlights || defaultAbout.clientHighlights;

  return { about, stats, staff, testimonials, clientStats, clientHighlights, loading, error };
};

export { resolveAssetUrl };
