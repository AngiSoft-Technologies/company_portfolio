export interface RouteMeta {
  path: string;
  title: string;
  description: string;
}

export const PRERENDER_ROUTES: RouteMeta[] = [
  {
    path: '/',
    title: 'AngiSoft Technologies — Software products and services for African businesses',
    description:
      'Web, mobile, ERP, IoT and AI solutions built in Nairobi. Products: PetroFlow, DukaFlow, KejaLink, AngiTunes.',
  },
  {
    path: '/products',
    title: 'Products — AngiSoft Technologies',
    description: 'Explore AngiSoft products: PetroFlow, DukaFlow, KejaLink and AngiTunes.',
  },
  {
    path: '/services',
    title: 'Services — AngiSoft Technologies',
    description: 'Custom software development, ERP, IoT integrations and AI services.',
  },
  {
    path: '/about',
    title: 'About — AngiSoft Technologies',
    description: 'Nairobi-based software studio building products that move African business forward.',
  },
  {
    path: '/pricing',
    title: 'Pricing — AngiSoft Technologies',
    description: 'Transparent project pricing for web apps, dashboards and enterprise systems.',
  },
  {
    path: '/contact',
    title: 'Contact — AngiSoft Technologies',
    description: 'Talk to the AngiSoft team about your next project.',
  },
  {
    path: '/blog',
    title: 'Blog — AngiSoft Technologies',
    description: 'Engineering notes and company updates from the AngiSoft team.',
  },
  {
    path: '/careers',
    title: 'Careers — AngiSoft Technologies',
    description: 'Open roles at AngiSoft Technologies in Nairobi.',
  },
  {
    path: '/solutions',
    title: 'Solutions — AngiSoft Technologies',
    description: 'Industry-tailored software solutions by AngiSoft.',
  },
  {
    path: '/industries',
    title: 'Industries — AngiSoft Technologies',
    description: 'Industries we serve with purpose-built software.',
  },
];

export const routeMeta = (path: string): RouteMeta | undefined =>
  PRERENDER_ROUTES.find((r) => r.path === path);

export default PRERENDER_ROUTES;