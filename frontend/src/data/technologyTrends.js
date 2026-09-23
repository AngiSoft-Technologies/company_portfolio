// Frontend-owned Technology Trends data.
// These describe technology areas AngiSoft works with practically — not enterprise
// capabilities proven at scale. Defined outside the component to avoid per-render recreation.

const technologyTrends = [
  {
    id: 'ai-assisted-engineering',
    name: 'AI-Assisted Engineering',
    icon: 'FaBrain',
    bgImage: '/uploads/public/images/trends/ai-assisted-engineering.jpg',
    description:
      'We use AI-assisted tooling to write, review and refactor code faster, while keeping a human engineer responsible for correctness and security.',
    capabilities: [
      'Responsible AI-assisted coding',
      'Chatbot or API integration where supported',
      'Code review and documentation support',
      'Prototyping and scaffolding assistance',
    ],
  },
  {
    id: 'cloud-deployment',
    name: 'Cloud Deployment',
    icon: 'FaCloud',
    bgImage: '/uploads/public/images/trends/cloud-deployment.jpg',
    description:
      'We ship projects using modern hosting platforms so your application is reachable, reliable and easy to update.',
    capabilities: [
      'Firebase, Railway and Netlify deployment',
      'Static and server-rendered hosting',
      'Environment and config management',
      'Safe, repeatable deploys',
    ],
  },
  {
    id: 'data-reporting',
    name: 'Data & Reporting',
    icon: 'FaDatabase',
    bgImage: '/uploads/public/images/trends/data-reporting.jpg',
    description:
      'We turn raw data into clear reports and dashboards using tools your team already understands.',
    capabilities: [
      'Python, Excel and SQL data workflows',
      'Reporting and dashboards',
      'Automated report generation',
      'Data validation and cleanup',
    ],
  },
  {
    id: 'workflow-automation',
    name: 'Workflow Automation',
    icon: 'FaRobot',
    bgImage: '/uploads/public/images/trends/workflow-automation.jpg',
    description:
      'We automate repetitive tasks with scripts and integrations so your team spends time on the work that matters.',
    capabilities: [
      'Bash and workflow automation',
      'Scheduled tasks and batch jobs',
      'Form and document automations',
      'Notifications and simple integrations',
    ],
  },
  {
    id: 'secure-software-practices',
    name: 'Secure Software Practices',
    icon: 'FaLock',
    bgImage: '/uploads/public/images/trends/secure-software-practices.jpg',
    description:
      'We build with security in mind from the start — careful with data, access and validation.',
    capabilities: [
      'Authentication and permission design',
      'Validation and secure data handling',
      'System monitoring and maintenance',
      'Safe dependency and config hygiene',
    ],
  },
];

export default technologyTrends;
