// Frontend-owned Services section data.
// Claims reflect AngiSoft's established service scope (see AGENTS.md service scope).
// Defined outside the component so it is created once, not on every render.

const homeServices = [
  {
    id: 'software-development',
    name: 'Software Development',
    icon: 'FaLaptopCode',
    image: '/uploads/public/images/services/software-development.jpg',
    desc: 'Custom web and mobile applications built with modern technologies — from MVPs to management systems that run your business.',
    services: [
      'Web Application Development',
      'Mobile App Development (Flutter / Kotlin)',
      'Custom Management Systems',
      'API & Integrations',
      'Code Debugging & Recovery',
      'UI/UX Design & Prototyping',
    ],
  },
  {
    id: 'data-analysis',
    name: 'Data Analysis',
    icon: 'FaChartLine',
    image: '/uploads/public/images/services/data-analysis.jpg',
    desc: 'Turn raw data into clear, decision-ready insights with dashboards and reports built in the tools you already use.',
    services: [
      'Excel Dashboards & Reports',
      'Python Data Workflows',
      'SQL Queries & Reporting',
      'Business Reporting Automation',
      'Data Cleanup & Validation',
      'Visual Charts & Summaries',
    ],
  },
  {
    id: 'document-cyber',
    name: 'Documents & Cyber Services',
    icon: 'FaShieldAlt',
    image: '/uploads/public/images/services/documents-cyber.jpg',
    desc: 'Professional document preparation and guided applications, plus careful, secure handling of your files and data.',
    services: [
      'Report & Attachment Editing',
      'Thesis, Poster & Presentation Design',
      'KRA / SHA / Good Conduct Applications',
      'Secure Document Handling',
      'Data Protection Best Practices',
      'Guided Online Applications',
    ],
  },
  {
    id: 'creative-products',
    name: 'Creative & Products',
    icon: 'FaMobileAlt',
    image: '/uploads/public/images/services/creative-products.jpg',
    desc: 'Branded creative support and product development — from posters to digital products and small automation tools.',
    services: [
      'Posters & Digital Creative Support',
      'Product Development',
      'Branding & Marketing Assets',
      'Bash & Workflow Automation',
      'System Installation & Upgrades',
      'Technical Support',
    ],
  },
];

export default homeServices;
