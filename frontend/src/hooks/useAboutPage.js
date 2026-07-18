import {
  useCallback,
  useEffect,
  useState,
} from 'react';

import {
  apiGet,
} from '../js/httpClient';

import {
  resolveAssetUrl,
} from '../utils/constants';

/*
|--------------------------------------------------------------------------
| About page schema
|--------------------------------------------------------------------------
|
| The backend should store every top-level About section as an individual row:
|
| {
|   key: 'geography',
|   enabled: true,
|   sortOrder: 3,
|   content: {
|     ...
|   }
| }
|
| The public endpoint should return:
|
| GET /api/about-sections
|
| [
|   {
|     id: 1,
|     key: 'heroSlides',
|     enabled: true,
|     sortOrder: 1,
|     content: [...]
|   }
| ]
|
*/

export const ABOUT_SCHEMA_VERSION = 3;

export const ABOUT_SECTION_KEYS = [
  'heroSlides',
  'intro',
  'numbersHeading',
  'numberStories',
  'geography',
  'sustainability',
  'collaboration',
  'timelineHeading',
  'timeline',
  'industriesHeading',
  'industries',
  'clientsHeading',
  'clients',
  'clientStats',
  'clientHighlights',
  'testimonialsHeading',
  'serviceMap',
  'transparency',
  'partnerships',
  'solutionTypes',
  'technologies',
  'specializedCapabilities',
  'whyGuarantee',
  'pricing',
  'pricingQuotation',
  'cta',
];

/*
|--------------------------------------------------------------------------
| Default About-page content
|--------------------------------------------------------------------------
|
| These defaults:
|
| 1. Define the exact frontend/backend data contract.
| 2. Keep the page operational while the CMS is being configured.
| 3. Use truthful AngiSoft information.
|
*/

export const defaultAbout = {
  schemaVersion:
    ABOUT_SCHEMA_VERSION,

  /*
  |--------------------------------------------------------------------------
  | 01. Hero leadership slider
  |--------------------------------------------------------------------------
  */

  heroSlides: [
    {
      id:
        'prof-angera-founder',

      enabled:
        true,

      imageUrl:
        '/uploads/public/images/about/hero/prof-angera-founder.jpg',

      mobileImageUrl:
        '/uploads/public/images/about/hero/prof-angera-founder-mobile.jpg',

      imageAlt:
        'Prof Angera Silas, founder of AngiSoft Technologies',

      name:
        'Prof Angera Silas',

      role:
        'Founder and Lead Software Engineer',

      objectPosition:
        'center top',

      to:
        '',

      sortOrder:
        1,
    },

    {
      id:
        'angisoft-product-development',

      enabled:
        true,

      imageUrl:
        '/uploads/public/images/about/hero/angisoft-product-work.jpg',

      mobileImageUrl:
        '/uploads/public/images/about/hero/angisoft-product-work-mobile.jpg',

      imageAlt:
        'AngiSoft software and product development work',

      name:
        'Product Engineering',

      role:
        'Building practical African technology products',

      objectPosition:
        'center',

      to:
        '/products',

      sortOrder:
        2,
    },

    {
      id:
        'angisoft-collaboration',

      enabled:
        true,

      imageUrl:
        '/uploads/public/images/about/hero/angisoft-team.jpg',

      mobileImageUrl:
        '/uploads/public/images/about/hero/angisoft-team-mobile.jpg',

      imageAlt:
        'AngiSoft technology team and collaborators',

      name:
        'Growing Through Collaboration',

      role:
        'Software, data and digital-service professionals',

      objectPosition:
        'center',

      to:
        '/staff',

      sortOrder:
        3,
    },
  ],

  /*
  |--------------------------------------------------------------------------
  | Hero introduction
  |--------------------------------------------------------------------------
  */

  intro: {
    enabled:
      true,

    eyebrow:
      'About AngiSoft Technologies',

    headline:
      'Building Africa’s',

    highlightedHeadline:
      'Digital Future',

    subtitle:
      'Through Software, Innovation, and Empowerment',

    descriptor:
      'A grassroots-origin African technology ecosystem',

    paragraph:
      'Founded in December 2024, AngiSoft Technologies builds software products, custom systems, data solutions and practical digital services shaped around real business and community needs.',

    philosophy:
      'Innovate → Build → Empower',

    primaryCta: {
      label:
        'Schedule an Introductory Call',

      to:
        '/booking',
    },

    secondaryCta: {
      label:
        'Explore Our Services',

      to:
        '/services',
    },
  },

  /*
  |--------------------------------------------------------------------------
  | 02. AngiSoft in numbers
  |--------------------------------------------------------------------------
  */

  numbersHeading: {
    enabled:
      true,

    eyebrow:
      'AngiSoft in Numbers',

    title:
      'Growing Through Real Work and Original Products',

    description:
      'A young technology company measured by practical contribution, product development and increasing digital capability.',
  },

  numberStories: [
    {
      id:
        'founded',

      enabled:
        true,

      statistic:
        '2024',

      prefix:
        '',

      suffix:
        '',

      badgeLabel:
        'Founded',

      title:
        'Founded in December 2024',

      text:
        'AngiSoft officially began in December 2024 after grassroots technology work that included debugging systems, teaching beginner coding, preparing professional documents, analysing data, installing software and helping people access essential online services.',

      imageUrl:
        '/uploads/public/images/about/numbers/founded-2024.jpg',

      imageAlt:
        'Early AngiSoft technology work and company beginnings',

      objectPosition:
        'center',

      accent:
        '#0A3DFF',

      link: {
        label:
          'Read Our Story',

        to:
          '/about',
      },

      sortOrder:
        1,
    },

    {
      id:
        'projects',

      enabled:
        true,

      statistic:
        '8',

      prefix:
        '',

      suffix:
        '+',

      badgeLabel:
        'Projects',

      title:
        'Projects and Practical Work',

      text:
        'AngiSoft has contributed to websites, mobile applications, databases, management systems, data workflows and software recovery projects while continuing to expand its delivery capability.',

      imageUrl:
        '/uploads/public/images/about/numbers/projects.jpg',

      imageAlt:
        'Software projects delivered and supported by AngiSoft',

      objectPosition:
        'center',

      accent:
        '#8A2BE2',

      link: {
        label:
          'See Our Services',

        to:
          '/services',
      },

      sortOrder:
        2,
    },

    {
      id:
        'products',

      enabled:
        true,

      statistic:
        '4',

      prefix:
        '',

      suffix:
        '',

      badgeLabel:
        'Products',

      title:
        'Original Product Ecosystems',

      text:
        'PetroFlow, DukaFlow, KejaLink and AngiTunes represent AngiSoft’s transition from one-off technical work into original African technology products.',

      imageUrl:
        '/uploads/public/images/about/numbers/product-ecosystems.jpg',

      imageAlt:
        'AngiSoft product ecosystems',

      objectPosition:
        'center',

      accent:
        '#FF9F1C',

      link: {
        label:
          'Explore Products',

        to:
          '/products',
      },

      sortOrder:
        3,
    },

    {
      id:
        'service-areas',

      enabled:
        true,

      statistic:
        '10',

      prefix:
        '',

      suffix:
        '+',

      badgeLabel:
        'Service Areas',

      title:
        'Practical Digital Capability',

      text:
        'Our service areas include web and mobile development, code debugging, data analysis, document support, database design, management systems, software installation, feature upgrades, posters and guided online applications.',

      imageUrl:
        '/uploads/public/images/about/numbers/digital-empowerment.jpg',

      imageAlt:
        'AngiSoft practical technology and digital-support services',

      objectPosition:
        'center',

      accent:
        '#00C2FF',

      link: {
        label:
          'View All Services',

        to:
          '/services',
      },

      sortOrder:
        4,
    },
  ],

  /*
  |--------------------------------------------------------------------------
  | 03. Geography
  |--------------------------------------------------------------------------
  */

  geography: {
    enabled:
      true,

    eyebrow:
      'Our Geography',

    title:
      'Our Geography',

    intro:
      'Headquartered in Nairobi and operating through direct and remote collaboration, AngiSoft serves clients and develops solutions for Kenyan, East African and wider African needs.',

    mapImageUrl:
      '/uploads/public/images/about/geography/world-map-dots-light.svg',

    mapAlt:
      'Map showing AngiSoft Technologies delivery reach',

    regions: [
      {
        id:
          'kenya',

        title:
          'Kenya',

        lineOne:
          'Operating base: Nairobi',

        lineTwo:
          'Direct and remote delivery',

        color:
          '#0A3DFF',
      },

      {
        id:
          'east-africa',

        title:
          'East Africa',

        lineOne:
          'Primary regional market',

        lineTwo:
          'Product and project collaboration',

        color:
          '#FF9F1C',
      },

      {
        id:
          'africa',

        title:
          'Africa',

        lineOne:
          'Long-term product reach',

        lineTwo:
          'Remote digital delivery',

        color:
          '#39FF6A',
      },
    ],

    locations: [
      {
        id:
          'nairobi',

        label:
          'Nairobi, Kenya',

        detail:
          'AngiSoft headquarters',

        x:
          62,

        y:
          68,

        regionIndex:
          0,

        labelPosition:
          'right',
      },

      {
        id:
          'east-africa',

        label:
          'East Africa',

        detail:
          'Primary growth region',

        x:
          65,

        y:
          58,

        regionIndex:
          1,

        labelPosition:
          'right',
      },

      {
        id:
          'remote-delivery',

        label:
          'Remote Delivery',

        detail:
          'Digital collaboration',

        x:
          48,

        y:
          35,

        regionIndex:
          2,

        labelPosition:
          'above',
      },
    ],

    delivery: {
      enabled:
        true,

      introduction:
        'From Nairobi, AngiSoft delivers software and digital services through direct and remote collaboration. Our clients benefit from practical technical support, flexible communication and solutions designed around real operational needs.',

      benefits: [
        {
          id:
            'cross-functional',

          title:
            'Cross-functional capability across software, data, systems and digital services',
        },

        {
          id:
            'remote-collaboration',

          title:
            'Flexible remote collaboration for clients beyond Nairobi',
        },

        {
          id:
            'project-coordination',

          title:
            'Structured project coordination, milestones and progress communication',
        },

        {
          id:
            'technology-flexibility',

          title:
            'Technology choices aligned with project requirements and available infrastructure',
        },

        {
          id:
            'security-awareness',

          title:
            'Security-conscious development, access control and responsible data handling',
        },

        {
          id:
            'continued-support',

          title:
            'Support for maintenance, upgrades, troubleshooting and continued improvement',
        },
      ],
    },
  },

  /*
  |--------------------------------------------------------------------------
  | 04. Sustainability and empowerment
  |--------------------------------------------------------------------------
  */

  sustainability: {
    enabled:
      true,

    eyebrow:
      'Responsible Technology',

    title:
      'Technology Should Create Practical Opportunity',

    description:
      'AngiSoft’s sustainability approach is grounded in accessible technology, knowledge transfer, responsible system design and solutions that remain useful after delivery.',

    imageUrl:
      '/uploads/public/images/about/sustainability/digital-empowerment.jpg',

    imageAlt:
      'Digital empowerment and responsible technology',

    items: [
      {
        id:
          'digital-access',

        title:
          'Digital Access',

        description:
          'Helping people and small organisations use digital services that may otherwise feel inaccessible.',
      },

      {
        id:
          'knowledge-transfer',

        title:
          'Knowledge Transfer',

        description:
          'Explaining systems, documenting work and supporting users beyond initial delivery.',
      },

      {
        id:
          'responsible-delivery',

        title:
          'Responsible Delivery',

        description:
          'Building with security, maintainability, truthful communication and realistic scope.',
      },

      {
        id:
          'african-context',

        title:
          'African Context',

        description:
          'Designing around local workflows, connectivity realities and practical operational needs.',
      },
    ],

    link: {
      label:
        'Explore Our Approach',

      to:
        '/sustainability',

      type:
        'internal',
    },
  },

  /*
  |--------------------------------------------------------------------------
  | 05. Collaboration
  |--------------------------------------------------------------------------
  */

  collaboration: {
    enabled:
      true,

    eyebrow:
      'How We Collaborate',

    title:
      'Flexible Engagement, Clear Ownership',

    description:
      'We adapt the engagement model to the project while maintaining clear responsibilities, milestones and communication.',

    models: [
      {
        id:
          'flexible-delivery',

        title:
          'Flexible Delivery',

        imageUrl:
          '/uploads/public/images/about/collaboration/flexible-delivery.svg',

        imageAlt:
          'Flexible software delivery illustration',

        items: [
          'End-to-end project delivery',
          'Product development',
          'Feature upgrades',
          'Technical support and maintenance',
        ],

        sortOrder:
          1,
      },

      {
        id:
          'smooth-integration',

        title:
          'Smooth Integration',

        imageUrl:
          '/uploads/public/images/about/collaboration/seamless-integration.svg',

        imageAlt:
          'System integration illustration',

        items: [
          'Existing-codebase support',
          'Database and API integration',
          'Workflow alignment',
          'Remote onboarding',
        ],

        sortOrder:
          2,
      },

      {
        id:
          'communication-ownership',

        title:
          'Communication and Ownership',

        imageUrl:
          '/uploads/public/images/about/collaboration/communication-ownership.svg',

        imageAlt:
          'Project communication and ownership illustration',

        items: [
          'Defined milestones',
          'Progress tracking',
          'Demonstrations and reviews',
          'Clear responsibilities',
        ],

        sortOrder:
          3,
      },
    ],
  },

  /*
  |--------------------------------------------------------------------------
  | 06. Company timeline
  |--------------------------------------------------------------------------
  */

  timelineHeading: {
    enabled:
      true,

    eyebrow:
      'Our Highlights',

    title:
      'From Grassroots Work to Product Development',

    description:
      'The AngiSoft story is still young, but each stage has expanded what the company can build and support.',
  },

  timeline: [
    {
      id:
        'grassroots',

      enabled:
        true,

      year:
        'Before 2024',

      title:
        'Grassroots Technology Work',

      description:
        'Coding support, data analysis, document preparation, installations, online applications, posters and beginner technology teaching.',

      imageUrl:
        '/uploads/public/images/about/highlights/grassroots-origin.jpg',

      imageAlt:
        'Grassroots technology services',

      sortOrder:
        1,
    },

    {
      id:
        'founding',

      enabled:
        true,

      year:
        'Dec 2024',

      title:
        'AngiSoft Technologies Officially Begins',

      description:
        'Prof Angera Silas establishes AngiSoft as a unified software, product and digital-services brand.',

      imageUrl:
        '/uploads/public/images/about/highlights/founding-2024.jpg',

      imageAlt:
        'AngiSoft founding milestone',

      sortOrder:
        2,
    },

    {
      id:
        'systems',

      enabled:
        true,

      year:
        '2025',

      title:
        'Expansion into Software Systems',

      description:
        'Work grows across websites, management systems, mobile applications and database-driven platforms.',

      imageUrl:
        '/uploads/public/images/about/highlights/systems-growth-2025.jpg',

      imageAlt:
        'Growth into software systems',

      sortOrder:
        3,
    },

    {
      id:
        'products',

      enabled:
        true,

      year:
        '2026',

      title:
        'Building Original Product Ecosystems',

      description:
        'Development continues across PetroFlow, DukaFlow, KejaLink and AngiTunes.',

      imageUrl:
        '/uploads/public/images/about/highlights/ecosystems-2026.jpg',

      imageAlt:
        'AngiSoft product ecosystem development',

      sortOrder:
        4,
    },
  ],

  /*
  |--------------------------------------------------------------------------
  | 07. Industries
  |--------------------------------------------------------------------------
  */

  industriesHeading: {
    enabled:
      true,

    eyebrow:
      'Industry Focus',

    title:
      'Industries We Understand and Build For',

    description:
      'Our products and services are shaped around practical workflows in growing African sectors.',
  },

  industries: [
    {
      id:
        'retail',

      enabled:
        true,

      title:
        'Retail and SMEs',

      description:
        'POS, stock, sales and business-management workflows.',

      imageUrl:
        '/uploads/public/images/about/industries/retail.jpg',

      imageAlt:
        'Retail and SME operations',

      to:
        '/industries/retail',

      sortOrder:
        1,
    },

    {
      id:
        'education',

      enabled:
        true,

      title:
        'Education',

      description:
        'School management, learning and student-support systems.',

      imageUrl:
        '/uploads/public/images/about/industries/education.jpg',

      imageAlt:
        'Education technology',

      to:
        '/industries/education',

      sortOrder:
        2,
    },

    {
      id:
        'real-estate',

      enabled:
        true,

      title:
        'Real Estate',

      description:
        'Property discovery, management and stakeholder coordination.',

      imageUrl:
        '/uploads/public/images/about/industries/real-estate.jpg',

      imageAlt:
        'Real estate and property technology',

      to:
        '/industries/real-estate',

      sortOrder:
        3,
    },

    {
      id:
        'fuel-energy',

      enabled:
        true,

      title:
        'Fuel and Energy',

      description:
        'Fuel-station operations, stock and transaction automation.',

      imageUrl:
        '/uploads/public/images/about/industries/oil-gas.jpg',

      imageAlt:
        'Fuel and energy operations',

      to:
        '/industries/fuel-energy',

      sortOrder:
        4,
    },

    {
      id:
        'creative',

      enabled:
        true,

      title:
        'Creative Industries',

      description:
        'Digital platforms for artists, DJs and content distribution.',

      imageUrl:
        '/uploads/public/images/about/industries/creative-industry.jpg',

      imageAlt:
        'Creative and entertainment industry',

      to:
        '/industries/creative',

      sortOrder:
        5,
    },

    {
      id:
        'professional-services',

      enabled:
        true,

      title:
        'Professional Services',

      description:
        'Operational systems, documents, reporting and digital workflows.',

      imageUrl:
        '/uploads/public/images/about/industries/professional-services.jpg',

      imageAlt:
        'Professional services',

      to:
        '/industries/professional-services',

      sortOrder:
        6,
    },

    {
      id:
        'hospitality',

      enabled:
        true,

      title:
        'Hospitality',

      description:
        'Booking, customer-service and operations tooling.',

      imageUrl:
        '/uploads/public/images/about/industries/hospitality.jpg',

      imageAlt:
        'Hospitality operations',

      to:
        '/industries/hospitality',

      sortOrder:
        7,
    },

    {
      id:
        'transport-logistics',

      enabled:
        true,

      title:
        'Transport and Logistics',

      description:
        'Fleet, dispatch, tracking and coordination workflows.',

      imageUrl:
        '/uploads/public/images/about/industries/transport.jpg',

      imageAlt:
        'Transport and logistics',

      to:
        '/industries/transport-logistics',

      sortOrder:
        8,
    },
  ],

  /*
  |--------------------------------------------------------------------------
  | 08. Clients and target markets
  |--------------------------------------------------------------------------
  */

  clientsHeading: {
    enabled:
      true,

    eyebrow:
      'Who We Serve',

    title:
      'Our Clients',

    description:
      'AngiSoft works with businesses, institutions, professionals and growing ventures that need practical digital solutions and dependable technical support.',

    targetMarketLabel:
      'Our solutions are designed for:',

    targetMarkets: [
      'Small and Medium Businesses',
      'Retail and Supermarkets',
      'Schools and Training Institutions',
      'Property and Rental Businesses',
      'Fuel Stations',
      'Creative Professionals',
      'Startups and Growing Ventures',
      'Individual Professionals',
    ],
  },

  /*
   * Only place verified public client relationships here.
   *
   * Do not list:
   *
   * - AngiSoft products as clients.
   * - Government agencies as clients merely because AngiSoft helps users
   *   access their public services.
   * - Companies without permission to display their names or logos.
   */

  clients: [
    {
      id:
        'kingsway',

      enabled:
        true,

      name:
        'Kingsway School Management System',

      logoUrl:
        '/uploads/public/images/about/clients/kingsway.svg',

      logoAlt:
        'Kingsway School Management System',

      relationship:
        'Software system project',

      description:
        'A school-management system rescue and implementation project.',

      url:
        '',

      sortOrder:
        1,
    },
  ],

  clientStats: {
    enabled:
      true,

    description:
      'Our work is growing across software systems, data workflows, practical digital services and original product development.',

    metrics: [
      {
        id:
          'projects',

        value:
          '8+',

        label:
          'Projects contributed to',
      },

      {
        id:
          'products',

        value:
          '4',

        label:
          'Product ecosystems',
      },

      {
        id:
          'founded',

        value:
          '2024',

        label:
          'Officially founded',
      },

      {
        id:
          'service-areas',

        value:
          '10+',

        label:
          'Service areas',
      },
    ],

    targetMarkets: [
      'Individuals',
      'Small and medium businesses',
      'Schools and institutions',
      'Property stakeholders',
      'Retail and fuel businesses',
      'Artists and creative professionals',
    ],
  },

  clientHighlights: [
    {
      id:
        'petroflow',

      enabled:
        true,

      title:
        'PetroFlow',

      subtitle:
        'Fuel-station operations and data automation',

      summary:
        'An AngiSoft product under development for fuel operations, stock, transactions and reporting.',

      imageUrl:
        '/uploads/public/images/about/highlights/ecosystems-2026.jpg',

      imageAlt:
        'PetroFlow product development',

      link: {
        label:
          'Explore PetroFlow',

        to:
          '/products/petroflow',
      },

      sortOrder:
        1,
    },

    {
      id:
        'dukaflow',

      enabled:
        true,

      title:
        'DukaFlow',

      subtitle:
        'POS and ERP for growing businesses',

      summary:
        'A business-management product designed for SMEs, shops and larger retail operations.',

      imageUrl:
        '/uploads/public/images/about/industries/retail.jpg',

      imageAlt:
        'DukaFlow retail product',

      link: {
        label:
          'Explore DukaFlow',

        to:
          '/products/dukaflow',
      },

      sortOrder:
        2,
    },

    {
      id:
        'kejalink',

      enabled:
        true,

      title:
        'KejaLink',

      subtitle:
        'Property and rental platform',

      summary:
        'A platform for agents, agencies, landlords, caretakers and property seekers.',

      imageUrl:
        '/uploads/public/images/about/industries/real-estate.jpg',

      imageAlt:
        'KejaLink property platform',

      link: {
        label:
          'Explore KejaLink',

        to:
          '/products/kejalink',
      },

      sortOrder:
        3,
    },

    {
      id:
        'angitunes',

      enabled:
        true,

      title:
        'AngiTunes',

      subtitle:
        'Music and creator platform',

      summary:
        'A Flutter-based platform for Kenyan artists and DJs to distribute music, sell mixes and engage their audiences.',

      imageUrl:
        '/uploads/public/images/about/industries/creative-industry.jpg',

      imageAlt:
        'AngiTunes music platform',

      link: {
        label:
          'Explore AngiTunes',

        to:
          '/products/angitunes',
      },

      sortOrder:
        4,
    },
  ],

  /*
  |--------------------------------------------------------------------------
  | 09. Testimonials
  |--------------------------------------------------------------------------
  */

  testimonialsHeading: {
    enabled:
      true,

    eyebrow:
      'Client Feedback',

    title:
      'What Our Clients Say',

    description:
      'Published testimonials should be connected to real clients and approved for public display.',

    videoEnabled:
      true,
  },

  /*
  |--------------------------------------------------------------------------
  | 10. Service map
  |--------------------------------------------------------------------------
  */

  serviceMap: {
    enabled:
      true,

    eyebrow:
      'Our Service Map',

    title:
      'Our Service Map',

    description:
      'A practical view of our software, product, data and digital-support capabilities.',

    introTile: {
      title:
        'Our Service Map',

      to:
        '/services',
    },

    services: [
      {
        id:
          'web-development',

        title:
          'Web Development',

        icon:
          'web',

        imageUrl:
          '/uploads/public/images/about/service-map/web-development.webp',

        imageAlt:
          'Web development illustration',

        to:
          '/services/web-development',
      },

      {
        id:
          'mobile-development',

        title:
          'Mobile Development',

        icon:
          'mobile',

        imageUrl:
          '/uploads/public/images/about/service-map/mobile-development.webp',

        imageAlt:
          'Mobile application development illustration',

        to:
          '/services/mobile-development',
      },

      {
        id:
          'code-debugging',

        title:
          'Code Debugging',

        icon:
          'debugging',

        imageUrl:
          '/uploads/public/images/about/service-map/code-debugging.webp',

        imageAlt:
          'Code debugging illustration',

        to:
          '/services/code-debugging',
      },

      {
        id:
          'data-analysis',

        title:
          'Data Analysis',

        icon:
          'data',

        imageUrl:
          '/uploads/public/images/about/service-map/data-analysis.webp',

        imageAlt:
          'Data analysis illustration',

        to:
          '/services/data-analysis',
      },

      {
        id:
          'document-editing',

        title:
          'Document Editing',

        icon:
          'documents',

        imageUrl:
          '/uploads/public/images/about/service-map/document-editing.webp',

        imageAlt:
          'Document editing illustration',

        to:
          '/services/document-editing',
      },

      {
        id:
          'database-design',

        title:
          'System & Database Design',

        icon:
          'database',

        imageUrl:
          '/uploads/public/images/about/service-map/database-design.webp',

        imageAlt:
          'System and database design illustration',

        to:
          '/services/database-design',
      },

      {
        id:
          'custom-systems',

        title:
          'Custom Systems',

        icon:
          'systems',

        imageUrl:
          '/uploads/public/images/about/service-map/custom-systems.webp',

        imageAlt:
          'Custom business systems illustration',

        to:
          '/services/custom-systems',
      },

      {
        id:
          'software-installation',

        title:
          'Software Installation',

        icon:
          'installation',

        imageUrl:
          '/uploads/public/images/about/service-map/software-installation.webp',

        imageAlt:
          'Software installation illustration',

        to:
          '/services/software-installation',
      },

      {
        id:
          'system-upgrades',

        title:
          'System Upgrades',

        icon:
          'upgrades',

        imageUrl:
          '/uploads/public/images/about/service-map/system-upgrades.webp',

        imageAlt:
          'Software and system upgrades illustration',

        to:
          '/services/system-upgrades',
      },

      {
        id:
          'posters-graphics',

        title:
          'Design Posters & Graphics',

        icon:
          'graphics',

        imageUrl:
          '/uploads/public/images/about/service-map/posters-graphics.webp',

        imageAlt:
          'Poster and graphic design illustration',

        to:
          '/services/graphic-design',
      },

      {
        id:
          'online-applications',

        title:
          'Online Applications',

        icon:
          'applications',

        imageUrl:
          '/uploads/public/images/about/service-map/online-applications.webp',

        imageAlt:
          'Online application services illustration',

        to:
          '/services/online-applications',
      },

      {
        id:
          'in-house-products',

        title:
          'In-House Products',

        icon:
          'products',

        imageUrl:
          '/uploads/public/images/about/service-map/in-house-products.webp',

        imageAlt:
          'AngiSoft software products illustration',

        to:
          '/products',
      },
    ],
  },

  /*
  |--------------------------------------------------------------------------
  | 11. Transparency
  |--------------------------------------------------------------------------
  */

  transparency: {
    enabled:
      true,

    eyebrow:
      'Building Trust',

    title:
      'Transparency Throughout the Project',

    description:
      'Clients should understand what is being built, what has changed, what remains and what decisions are required.',

    video: {
      enabled:
        true,

      provider:
        'youtube',

      videoId:
        '',

      url:
        '',

      title:
        'How AngiSoft approaches transparent software delivery',

      thumbnailUrl:
        '/uploads/public/images/about/transparency/video-cover.jpg',

      thumbnailAlt:
        'Transparent software-delivery presentation',
    },

    items: [
      {
        id:
          'scope',

        title:
          'Clear Scope',

        description:
          'Requirements, assumptions and exclusions are documented before implementation.',
      },

      {
        id:
          'progress',

        title:
          'Visible Progress',

        description:
          'Milestones, demonstrations and status updates show what has actually been completed.',
      },

      {
        id:
          'risks',

        title:
          'Honest Risk Communication',

        description:
          'Technical constraints, delays and trade-offs are communicated early.',
      },

      {
        id:
          'handover',

        title:
          'Responsible Handover',

        description:
          'Documentation, training and support are planned as part of delivery.',
      },
    ],
  },

  /*
  |--------------------------------------------------------------------------
  | 12. Partnerships
  |--------------------------------------------------------------------------
  |
  | Leave disabled until AngiSoft has verified public partnerships,
  | certifications, memberships or recognised awards.
  |
  */

  partnerships: {
    enabled:
      false,

    eyebrow:
      'Partnerships and Recognitions',

    title:
      'Verified Relationships Only',

    description:
      'Enable this section when AngiSoft has approved public partnerships, certifications, memberships or recognitions.',

    featuredItems: [],

    supportingItems: [],

    items: [],
  },

  /*
  |--------------------------------------------------------------------------
  | 13. Solution types
  |--------------------------------------------------------------------------
  */

  solutionTypes: {
    enabled:
      true,

    eyebrow:
      'Solutions We Cover',

    title:
      'Solutions We Cover',

    description:
      'From business operations to customer-facing platforms, AngiSoft builds practical digital solutions across areas including:',

    solutions: [
      {
        id:
          'business-management',

        title:
          'Business Management Systems',

        to:
          '/solutions/business-management',
      },

      {
        id:
          'point-of-sale',

        title:
          'Point of Sale Systems',

        to:
          '/solutions/point-of-sale',
      },

      {
        id:
          'customer-management',

        title:
          'Customer Management',

        to:
          '/solutions/customer-management',
      },

      {
        id:
          'operations-management',

        title:
          'Operations Management',

        to:
          '/solutions/operations-management',
      },

      {
        id:
          'financial-tracking',

        title:
          'Financial Tracking',

        to:
          '/solutions/financial-tracking',
      },

      {
        id:
          'payments-billing',

        title:
          'Payments and Billing',

        to:
          '/solutions/payments-billing',
      },

      {
        id:
          'asset-management',

        title:
          'Asset Management',

        to:
          '/solutions/asset-management',
      },

      {
        id:
          'document-management',

        title:
          'Document Management',

        to:
          '/solutions/document-management',
      },

      {
        id:
          'staff-portals',

        title:
          'Staff Portals',

        to:
          '/solutions/staff-portals',
      },

      {
        id:
          'human-resource-systems',

        title:
          'Human Resource Systems',

        to:
          '/solutions/human-resource-systems',
      },

      {
        id:
          'learning-platforms',

        title:
          'Learning Platforms',

        to:
          '/solutions/learning-platforms',
      },

      {
        id:
          'ecommerce',

        title:
          'eCommerce',

        to:
          '/solutions/ecommerce',
      },

      {
        id:
          'inventory-management',

        title:
          'Inventory Management',

        to:
          '/solutions/inventory-management',
      },

      {
        id:
          'property-platforms',

        title:
          'Property Platforms',

        to:
          '/products/kejalink',
      },

      {
        id:
          'data-analytics',

        title:
          'Data Analytics',

        to:
          '/services/data-analysis',
      },

      {
        id:
          'web-portals',

        title:
          'Web Portals',

        to:
          '/solutions/web-portals',
      },
    ],
  },

  /*
  |--------------------------------------------------------------------------
  | 14. Technology expertise
  |--------------------------------------------------------------------------
  */

  technologies: {
    enabled:
      true,

    eyebrow:
      'Our Capabilities and Technological Expertise',

    title:
      'Our Capabilities and Technological Expertise',

    description:
      'Our stack is selected around project needs, maintainability and the team’s genuine implementation capability.',

    columns: [
      {
        id:
          'development',

        sections: [
          {
            id:
              'backend',

            title:
              'Back-End Programming Languages',

            groups: [
              {
                id:
                  'backend-technologies',

                technologies: [
                  'Java',
                  'Spring Boot',
                  'Python',
                  'Django',
                  'PHP',
                  'Laravel',
                  'Node.js',
                  'Express.js',
                ],
              },
            ],
          },

          {
            id:
              'frontend',

            title:
              'Front-End Programming Languages',

            groups: [
              {
                id:
                  'frontend-languages',

                title:
                  'Languages',

                technologies: [
                  'HTML5',
                  'CSS3',
                  'JavaScript',
                  'TypeScript',
                ],
              },

              {
                id:
                  'frontend-frameworks',

                title:
                  'JavaScript Frameworks',

                technologies: [
                  'React',
                  'Vite',
                  'Tailwind CSS',
                  'Bootstrap',
                ],
              },
            ],
          },

          {
            id:
              'mobile',

            title:
              'Mobile',

            groups: [
              {
                id:
                  'mobile-technologies',

                technologies: [
                  'Android',
                  'iOS',
                  'Flutter',
                  'Dart',
                  'Java',
                  'Firebase',
                  'Progressive Web Apps',
                ],
              },
            ],
          },

          {
            id:
              'low-code',

            title:
              'Low-Code Development',

            groups: [
              {
                id:
                  'low-code-technologies',

                technologies: [
                  'Firebase',
                  'Google Forms',
                  'Microsoft Excel Automation',
                  'AppSheet',
                ],
              },
            ],
          },
        ],
      },

      {
        id:
          'data-cloud',

        sections: [
          {
            id:
              'databases',

            title:
              'Databases / Data Storages',

            groups: [
              {
                id:
                  'sql',

                title:
                  'SQL',

                technologies: [
                  'PostgreSQL',
                  'MySQL',
                  'MariaDB',
                  'SQLite',
                  'SQL Server',
                ],
              },

              {
                id:
                  'nosql',

                title:
                  'NoSQL',

                technologies: [
                  'Firestore',
                  'Firebase Realtime Database',
                  'MongoDB',
                ],
              },
            ],
          },

          {
            id:
              'cloud-storage',

            title:
              'Cloud Databases, Warehouses, and Storage',

            groups: [
              {
                id:
                  'firebase-cloud',

                title:
                  'Firebase',

                technologies: [
                  'Cloud Firestore',
                  'Realtime Database',
                  'Cloud Storage',
                  'Firebase Hosting',
                ],
              },

              {
                id:
                  'managed-platforms',

                title:
                  'Managed Platforms',

                technologies: [
                  'Railway',
                  'Netlify',
                  'Supabase',
                ],
              },

              {
                id:
                  'other-cloud',

                title:
                  'Other',

                technologies: [
                  'Linux Servers',
                  'Object Storage',
                  'Managed PostgreSQL',
                ],
              },
            ],
          },
        ],
      },

      {
        id:
          'operations-data',

        sections: [
          {
            id:
              'data-engineering',

            title:
              'Data Analysis and Automation',

            groups: [
              {
                id:
                  'data-tools',

                technologies: [
                  'Python',
                  'SQL',
                  'pandas',
                  'NumPy',
                  'Matplotlib',
                  'Jupyter Notebook',
                  'Microsoft Excel',
                  'CSV',
                  'JSON',
                ],
              },
            ],
          },

          {
            id:
              'devops',

            title:
              'DevOps',

            groups: [
              {
                id:
                  'containerization',

                title:
                  'Containerization',

                technologies: [
                  'Docker',
                ],
              },

              {
                id:
                  'automation',

                title:
                  'Automation',

                technologies: [
                  'Bash',
                  'GitHub Actions',
                  'Deployment Scripts',
                ],
              },

              {
                id:
                  'cicd',

                title:
                  'CI/CD Tools',

                technologies: [
                  'GitHub Actions',
                  'Railway Deployments',
                  'Netlify Deployments',
                  'Firebase CLI',
                ],
              },

              {
                id:
                  'monitoring',

                title:
                  'Monitoring',

                technologies: [
                  'Application Logs',
                  'Railway Logs',
                  'Firebase Logs',
                  'Browser DevTools',
                ],
              },
            ],
          },
        ],
      },
    ],
  },

  /*
  |--------------------------------------------------------------------------
  | 15. Specialized capabilities
  |--------------------------------------------------------------------------
  */

  specializedCapabilities: {
    enabled:
      true,

    eyebrow:
      'Specialized Capabilities',

    title:
      'Specialized Capabilities',

    introduction:
      'We eagerly put in use specialized technology capabilities',

    capabilities: [
      {
        id:
          'ai-assisted-engineering',

        title:
          'AI-Assisted Engineering',

        icon:
          'ai',

        to:
          '/capabilities/ai-assisted-engineering',
      },

      {
        id:
          'data-analysis',

        title:
          'Data Analysis',

        icon:
          'data',

        to:
          '/services/data-analysis',
      },

      {
        id:
          'legacy-modernization',

        title:
          'Legacy Modernization',

        icon:
          'modernization',

        to:
          '/services/software-modernization',
      },

      {
        id:
          'multi-role-systems',

        title:
          'Multi-Role Systems',

        icon:
          'roles',

        to:
          '/capabilities/role-based-systems',
      },

      {
        id:
          'api-integration',

        title:
          'API Integration',

        icon:
          'integration',

        to:
          '/services/system-integration',
      },

      {
        id:
          'cross-platform-apps',

        title:
          'Cross-Platform Apps',

        icon:
          'mobile',

        to:
          '/services/mobile-development',
      },

      {
        id:
          'workflow-automation',

        title:
          'Workflow Automation',

        icon:
          'automation',

        to:
          '/solutions/workflow-automation',
      },

      {
        id:
          'cloud-deployment',

        title:
          'Cloud Deployment',

        icon:
          'cloud',

        to:
          '/services/cloud-deployment',
      },
    ],
  },

  /*
  |--------------------------------------------------------------------------
  | 16. Project-success practices
  |--------------------------------------------------------------------------
  */

  whyGuarantee: {
    enabled:
      true,

    eyebrow:
      'Project Success',

    title:
      'What Do We Do to Help Your Project Succeed?',

    description:
      'Project success comes from disciplined discovery, realistic planning, secure implementation, regular validation and dependable support.',

    question:
      'How does AngiSoft reduce risk and keep delivery connected to the real business need?',

    items: [
      {
        id:
          'discovery',

        title:
          'Understand the Real Requirement',

        description:
          'We clarify users, workflows, constraints and expected outcomes before implementation.',

        details: [
          'Stakeholder and workflow discovery',
          'Scope and assumption documentation',
          'Priority and dependency identification',
        ],

        sortOrder:
          1,
      },

      {
        id:
          'architecture',

        title:
          'Choose a Maintainable Foundation',

        description:
          'Architecture, database and integration choices are made around the actual scale and context.',

        details: [
          'Practical technology selection',
          'Database and API planning',
          'Reuse of existing infrastructure where sensible',
        ],

        sortOrder:
          2,
      },

      {
        id:
          'security',

        title:
          'Build Security into the System',

        description:
          'Authentication, permissions, validation and data protection are considered throughout delivery.',

        details: [
          'Server-side authorization',
          'Input validation',
          'Safe data handling and auditability',
        ],

        sortOrder:
          3,
      },

      {
        id:
          'validation',

        title:
          'Validate Progress Frequently',

        description:
          'Working demonstrations and reviews help catch misunderstandings before they become expensive.',

        details: [
          'Milestone demonstrations',
          'Testing against real workflows',
          'Feedback incorporated before final handover',
        ],

        sortOrder:
          4,
      },

      {
        id:
          'handover',

        title:
          'Prepare Users and Owners',

        description:
          'A system is only successful when the people responsible for it can understand and use it.',

        details: [
          'Documentation',
          'Training and onboarding',
          'Clear ownership after delivery',
        ],

        sortOrder:
          5,
      },

      {
        id:
          'support',

        title:
          'Support the System After Launch',

        description:
          'Fixes, upgrades and operational support help the solution remain useful over time.',

        details: [
          'Post-launch support',
          'Maintenance options',
          'Feature and performance improvements',
        ],

        sortOrder:
          6,
      },
    ],
  },

  /*
  |--------------------------------------------------------------------------
  | 17. Pricing
  |--------------------------------------------------------------------------
  */

  pricing: {
    enabled:
      true,

    eyebrow:
      'Pricing Policy',

    title:
      'Clear Pricing for the Work Required',

    description:
      'Pricing depends on scope, complexity, timeline, integrations, support expectations and delivery model.',

    models: [
      {
        id:
          'fixed-price',

        title:
          'Fixed Price',

        description:
          'Suitable when the scope, deliverables and acceptance criteria are clear.',

        bestFor:
          'Defined projects and focused implementations',

        badge:
          '',

        sortOrder:
          1,
      },

      {
        id:
          'time-materials',

        title:
          'Time and Materials',

        description:
          'Suitable for evolving requirements, recovery work and ongoing development.',

        bestFor:
          'Flexible or technically uncertain work',

        badge:
          '',

        sortOrder:
          2,
      },

      {
        id:
          'retainer',

        title:
          'Support Retainer',

        description:
          'A recurring arrangement for support, maintenance and planned improvements.',

        bestFor:
          'Long-term operational support',

        badge:
          '',

        sortOrder:
          3,
      },

      {
        id:
          'product-access',

        title:
          'Product Use or Lease',

        description:
          'Commercial access to AngiSoft products may use subscription, licensing or leasing models.',

        bestFor:
          'DukaFlow, PetroFlow and future products',

        badge:
          '',

        sortOrder:
          4,
      },
    ],

    note:
      'Small digital services are scoped separately from software projects and priced according to the specific task.',

    cta: {
      label:
        'Request a Project Estimate',

      to:
        '/booking',
    },
  },

  /*
  |--------------------------------------------------------------------------
  | 18. Pricing quotation
  |--------------------------------------------------------------------------
  */

  pricingQuotation: {
    enabled:
      true,

    imageUrl:
      '/uploads/public/images/about/leadership/prof-angera-pricing.jpg',

    imageAlt:
      'Prof Angera Silas discussing software investment',

    author:
      'Prof Angera Silas',

    role:
      'Founder and Lead Software Engineer',

    quote:
      'A useful software quotation should explain what is being built, what is included, what risks exist and what support the client should expect—not simply present a number.',

    introduction:
      'Our estimates are shaped around the work required to deliver and support a dependable solution.',

    investmentAreas: [
      'Discovery and solution planning',
      'Design and implementation',
      'Database and integration work',
      'Security and testing',
      'Deployment and documentation',
      'Training, support and maintenance',
    ],
  },

  /*
  |--------------------------------------------------------------------------
  | 19. Final CTA
  |--------------------------------------------------------------------------
  */

  cta: {
    enabled:
      true,

    eyebrow:
      'Innovate • Build • Empower',

    title:
      'Let’s Build Your Next Digital Solution',

    description:
      'Whether you need custom software, a digital product, data automation, an existing-system upgrade or dependable technical support, AngiSoft will help turn the requirement into a practical working solution.',

    imageUrl:
      '/uploads/public/images/about/final-cta/build-with-angisoft.webp',

    mobileImageUrl:
      '/uploads/public/images/about/final-cta/build-with-angisoft-mobile.webp',

    imageAlt:
      'Building digital solutions with AngiSoft Technologies',

    objectPosition:
      'center',

    primaryCta: {
      label:
        'Start a Project',

      to:
        '/booking',
    },

    secondaryCta: {
      label:
        'Talk to AngiSoft',

      to:
        '/contact',
    },

    contact: {
      phone:
        '+254710398690',

      phoneLabel:
        '+254 710 398 690',

      email:
        'info@angisoft.co.ke',

      whatsapp:
        '254710398690',

      whatsappMessage:
        'Hello AngiSoft Technologies, I would like to discuss a project.',
    },

    reassurance:
      'Clear communication • Practical solutions • Responsible delivery',
  },
};

/*
|--------------------------------------------------------------------------
| Data transformation helpers
|--------------------------------------------------------------------------
*/

const isPlainObject = (
  value
) =>
  Object.prototype.toString.call(
    value
  ) === '[object Object]';

/*
|--------------------------------------------------------------------------
| Deep merge
|--------------------------------------------------------------------------
|
| Objects are merged recursively.
| Arrays from the backend replace default arrays.
|
| This is important because merging arrays by index would combine unrelated
| CMS records.
|
*/

const deepMerge = (
  base,
  override
) => {
  if (
    Array.isArray(override)
  ) {
    return override;
  }

  if (
    !isPlainObject(override)
  ) {
    return override ===
      undefined
      ? base
      : override;
  }

  const result =
    isPlainObject(base)
      ? {
          ...base,
        }
      : {};

  Object.entries(
    override
  ).forEach(
    ([
      key,
      value,
    ]) => {
      result[key] =
        deepMerge(
          result[key],
          value
        );
    }
  );

  return result;
};

/*
|--------------------------------------------------------------------------
| API response normalization
|--------------------------------------------------------------------------
|
| Supported response formats:
|
| 1. [...]
| 2. { data: [...] }
| 3. { sections: [...] }
| 4. { items: [...] }
|
*/

const unwrapList = (
  response
) => {
  if (
    Array.isArray(response)
  ) {
    return response;
  }

  if (
    Array.isArray(
      response?.data
    )
  ) {
    return response.data;
  }

  if (
    Array.isArray(
      response?.sections
    )
  ) {
    return response.sections;
  }

  if (
    Array.isArray(
      response?.items
    )
  ) {
    return response.items;
  }

  return [];
};

/*
|--------------------------------------------------------------------------
| Build the flat About object from database section rows
|--------------------------------------------------------------------------
*/

export const buildAboutFromSections = (
  response
) => {
  const sections =
    unwrapList(response);

  if (
    sections.length === 0
  ) {
    return null;
  }

  return sections
    .filter(
      (section) =>
        section &&
        section.enabled !==
          false &&
        ABOUT_SECTION_KEYS.includes(
          section.key
        )
    )
    .sort(
      (
        first,
        second
      ) =>
        Number(
          first.sortOrder ||
            0
        ) -
        Number(
          second.sortOrder ||
            0
        )
    )
    .reduce(
      (
        about,
        section
      ) => {
        about[
          section.key
        ] =
          section.content;

        return about;
      },
      {}
    );
};

/*
|--------------------------------------------------------------------------
| Shared request cache
|--------------------------------------------------------------------------
*/

let cached =
  null;

let pending =
  null;

/**
 * Pull a single section's `content` out of the public /about-sections list
 * response (an array of { id, key, content, ... }). Used by the Services /
 * Solutions / Industries pages which are driven by the canonical About
 * sections (serviceMap.services, solutionTypes.solutions, industries).
 */
export const extractSectionContent = (response, key) => {
  const sections = unwrapList(response);
  const section = sections.find((s) => s.key === key);
  return section ? section.content : null;
};

/*
|--------------------------------------------------------------------------
| Fetch About-page data
|--------------------------------------------------------------------------
*/

const loadAboutPage = async ({
  force = false,
} = {}) => {
  if (
    cached &&
    !force
  ) {
    return cached;
  }

  if (
    pending &&
    !force
  ) {
    return pending;
  }

  pending =
    Promise.all([
      apiGet(
        '/about-sections'
      ),

      apiGet(
        '/testimonials'
      ).catch(
        () => []
      ),
    ])
      .then(
        ([
          sectionResponse,
          testimonialResponse,
        ]) => {
          const backendAbout =
            buildAboutFromSections(
              sectionResponse
            ) || {};

          const about =
            deepMerge(
              defaultAbout,
              backendAbout
            );

          const testimonials =
            unwrapList(
              testimonialResponse
            )
              .filter(
                (
                  testimonial
                ) =>
                  testimonial
                    ?.enabled !==
                  false
              )
              .sort(
                (
                  first,
                  second
                ) =>
                  Number(
                    first.sortOrder ||
                      0
                  ) -
                  Number(
                    second.sortOrder ||
                      0
                  )
              );

          cached = {
            about,

            testimonials,

            clientStats:
              about.clientStats,

            clientHighlights:
              about.clientHighlights,

            loaded:
              true,
          };

          return cached;
        }
      )
      .finally(() => {
        pending =
          null;
      });

  return pending;
};

/*
|--------------------------------------------------------------------------
| Public hook
|--------------------------------------------------------------------------
*/

export const useAboutPage = () => {
  const [
    data,
    setData,
  ] =
    useState(cached);

  const [
    loading,
    setLoading,
  ] =
    useState(!cached);

  const [
    error,
    setError,
  ] =
    useState('');

  /*
  |--------------------------------------------------------------------------
  | Manual reload
  |--------------------------------------------------------------------------
  */

  const fetchData =
    useCallback(
      async ({
        force = false,
      } = {}) => {
        setLoading(
          true
        );

        setError(
          ''
        );

        try {
          const result =
            await loadAboutPage(
              {
                force,
              }
            );

          setData(
            result
          );
        } catch (
          requestError
        ) {
          /*
           * The defaults preserve the public page while the API is unavailable.
           * The error is still returned for diagnostics and optional UI display.
           */

          setData({
            about:
              defaultAbout,

            testimonials:
              [],

            clientStats:
              defaultAbout.clientStats,

            clientHighlights:
              defaultAbout.clientHighlights,

            loaded:
              true,
          });

          setError(
            requestError
              ?.message ||
              'The About page content could not be loaded from the API.'
          );
        } finally {
          setLoading(
            false
          );
        }
      },
      []
    );

  /*
  |--------------------------------------------------------------------------
  | Initial request
  |--------------------------------------------------------------------------
  */

  useEffect(
    () => {
      let active =
        true;

      if (cached) {
        setLoading(
          false
        );

        return undefined;
      }

      loadAboutPage()
        .then(
          (
            result
          ) => {
            if (
              !active
            ) {
              return;
            }

            setData(
              result
            );

            setLoading(
              false
            );
          }
        )
        .catch(
          (
            requestError
          ) => {
            if (
              !active
            ) {
              return;
            }

            setData({
              about:
                defaultAbout,

              testimonials:
                [],

              clientStats:
                defaultAbout.clientStats,

              clientHighlights:
                defaultAbout.clientHighlights,

              loaded:
                true,
            });

            setError(
              requestError
                ?.message ||
                'The About page content could not be loaded from the API.'
            );

            setLoading(
              false
            );
          }
        );

      return () => {
        active =
          false;
      };
    },
    []
  );

  const about =
    data?.about ||
    defaultAbout;

  return {
    about,

    /*
     * Kept for compatibility with components that previously requested stats.
     */
    stats:
      about.numberStories ||
      [],

    /*
     * Staff profiles should come from the dedicated staff endpoint.
     */
    staff:
      [],

    testimonials:
      data?.testimonials ||
      [],

    clientStats:
      data?.clientStats ||
      about.clientStats,

    clientHighlights:
      data?.clientHighlights ||
      about.clientHighlights,

    loading,

    error,

    refetch:
      () =>
        fetchData({
          force:
            true,
        }),
  };
};

/*
|--------------------------------------------------------------------------
| Cache utility
|--------------------------------------------------------------------------
|
| Useful after an administrator updates About content and the application
| needs to fetch a fresh copy.
|
*/

export const clearAboutPageCache = () => {
  cached =
    null;

  pending =
    null;
};

export {
  resolveAssetUrl,
};