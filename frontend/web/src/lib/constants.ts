export const API_BASE = '/api';

export const CONTACT_INFO = {
  phone: '+254 700 000 000',
  email: 'hello@angisoft.co.ke',
  address: 'Nairobi, Kenya',
};

export const NAV_LINKS = [
  { to: '/', label: 'Home' },
  { to: '/products', label: 'Products' },
  { to: '/services', label: 'Services' },
  { to: '/solutions', label: 'Solutions' },
  { to: '/pricing', label: 'Pricing' },
  { to: '/blog', label: 'Blog' },
  { to: '/contact', label: 'Contact' },
];

export const PRICING_TIERS = [
  { name: 'Starter', price: 'KSh 25,000', period: '/project', features: ['Landing page', '5 sections', 'Contact form', 'Basic SEO', '2 revisions'] },
  { name: 'Business', price: 'KSh 75,000', period: '/project', features: ['Custom web app', 'Admin dashboard', 'Payments', 'SMS/WhatsApp', 'Priority support'], highlighted: true },
  { name: 'Enterprise', price: 'Custom', period: '/quote', features: ['Full ERP', 'IoT integrations', 'AI assistant', 'Dedicated team', 'SLA'] },
] as const;