import React, { useEffect, useState } from 'react';
import { useParams, useLocation, Link } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { apiGet } from '../js/httpClient';
import { FaArrowLeft, FaArrowRight, FaSpinner } from 'react-icons/fa';

/* ── Static content for industries, solutions, technologies ── */
const categoryData = {
  industry: {
    'healthcare': {
      title: 'Healthcare',
      headline: 'Digital Solutions for Healthcare',
      desc: 'Patient management systems, telehealth platforms, electronic health records, and medical data analytics that improve care delivery and operational efficiency.',
      features: ['Patient Management Systems', 'Appointment Scheduling', 'Medical Records (EHR)', 'Telehealth Platforms', 'Lab Result Portals', 'Prescription Management'],
    },
    'retail-ecommerce': {
      title: 'Retail & eCommerce',
      headline: 'Retail & eCommerce Solutions',
      desc: 'POS systems, inventory management, online stores, and customer engagement tools that help retail businesses sell more and operate efficiently.',
      features: ['Point-of-Sale Systems', 'Inventory Management', 'Online Storefronts', 'Customer Loyalty Programs', 'Sales Analytics', 'Supplier Management'],
    },
    'finance': {
      title: 'Finance',
      headline: 'Financial Technology Solutions',
      desc: 'Payment systems, financial dashboards, compliance tools, and reporting platforms for banks, SACCOs, and fintech companies.',
      features: ['Payment Processing', 'Financial Dashboards', 'Loan Management', 'Compliance Reporting', 'SACCO Management', 'Mobile Banking'],
    },
    'education': {
      title: 'Education',
      headline: 'Education Technology',
      desc: 'E-learning platforms, student portals, learning management systems, and school administration tools that transform education delivery.',
      features: ['Learning Management Systems', 'Student Portals', 'Online Exams & Grading', 'Course Management', 'Fee Payment Systems', 'Parent Communication'],
    },
    'real-estate': {
      title: 'Real Estate',
      headline: 'Real Estate Technology',
      desc: 'Property management platforms, tenant portals, listing systems, and CRM tools for property developers and managers.',
      features: ['Property Listings', 'Tenant Portals', 'Rent Collection', 'Maintenance Tracking', 'Property Analytics', 'Agent CRM'],
    },
    'transport-logistics': {
      title: 'Transport & Logistics',
      headline: 'Transport & Logistics Solutions',
      desc: 'Fleet management, delivery tracking, route optimization, and logistics platforms that streamline operations and reduce costs.',
      features: ['Fleet Tracking', 'Delivery Management', 'Route Optimization', 'Driver Management', 'Fuel Monitoring', 'Dispatch Systems'],
    },
  },
  solution: {
    'pos-systems': {
      title: 'POS Systems',
      headline: 'Point-of-Sale Solutions',
      desc: 'Custom POS systems for retail shops, restaurants, salons, and service businesses — with offline support, receipt printing, and real-time sales analytics.',
      features: ['Offline-First Design', 'Receipt Printing', 'Inventory Sync', 'Sales Reports', 'Multi-Outlet Support', 'Payment Integration'],
    },
    'management-systems': {
      title: 'Management Systems',
      headline: 'Business Management Platforms',
      desc: 'Inventory, HR, CRM, and operations management systems that automate workflows and give you full visibility into your business.',
      features: ['HR & Payroll', 'CRM & Sales Pipeline', 'Inventory Control', 'Project Management', 'Procurement', 'Document Management'],
    },
    'mobile-apps': {
      title: 'Mobile Apps',
      headline: 'Cross-Platform Mobile Applications',
      desc: 'Flutter and Kotlin mobile apps for Android and iOS — from consumer apps to enterprise field tools and customer-facing portals.',
      features: ['Flutter Cross-Platform', 'Kotlin Native Android', 'Offline Capability', 'Push Notifications', 'In-App Payments', 'App Store Deployment'],
    },
    'data-dashboards': {
      title: 'Data Dashboards',
      headline: 'Analytics & Reporting Dashboards',
      desc: 'Real-time data dashboards and BI tools that turn your raw data into actionable insights — built with Python, Excel, and Power BI.',
      features: ['Real-Time Analytics', 'Custom Charts & Graphs', 'Automated Reports', 'KPI Tracking', 'Data Pipelines', 'Excel & Power BI'],
    },
    'web-platforms': {
      title: 'Web Platforms',
      headline: 'Web Application Platforms',
      desc: 'SaaS products, customer portals, e-commerce platforms, and content management systems built with modern web technologies.',
      features: ['SaaS Development', 'Customer Portals', 'E-Commerce Stores', 'CMS & Blogs', 'API-First Architecture', 'Cloud Hosting'],
    },
    'ai-chatbots': {
      title: 'AI & Chatbots',
      headline: 'AI & Conversational Solutions',
      desc: 'Intelligent chatbots, workflow automation, predictive analytics, and document processing powered by modern AI.',
      features: ['AI Chatbots', 'Workflow Automation', 'Predictive Analytics', 'Document Processing', 'Natural Language Processing', 'Report Generation'],
    },
  },
  technology: {
    'flutter': {
      title: 'Flutter',
      headline: 'Flutter Development',
      desc: 'Build beautiful, natively compiled mobile, web, and desktop applications from a single Dart codebase. We use Flutter for cross-platform mobile apps that look and feel native on both Android and iOS.',
      features: ['Single Codebase for iOS & Android', 'Native Performance', 'Rich Widget Library', 'Hot Reload Development', 'Custom Animations', 'Web & Desktop Support'],
    },
    'kotlin': {
      title: 'Kotlin',
      headline: 'Kotlin Development',
      desc: 'Modern, concise, and safe programming for Android and server-side applications. We build high-performance native Android apps and backend services with Kotlin.',
      features: ['Native Android Apps', 'Jetpack Compose UI', 'Coroutines & Async', 'Type Safety', 'Java Interoperability', 'Ktor Backend'],
    },
    'react': {
      title: 'React.js',
      headline: 'React.js Development',
      desc: 'Component-driven web applications with React — from single-page apps to complex enterprise dashboards. We use React with Vite, Next.js, and TypeScript.',
      features: ['Component Architecture', 'State Management', 'Server-Side Rendering', 'TypeScript Integration', 'Performance Optimization', 'Testing & CI/CD'],
    },
    'python': {
      title: 'Python',
      headline: 'Python Development',
      desc: 'Data analysis, automation, backend services, and AI/ML solutions built with Python. From Django REST APIs to Pandas data pipelines and machine learning models.',
      features: ['Data Analysis (Pandas)', 'Django & FastAPI', 'Automation Scripts', 'Machine Learning', 'ETL Pipelines', 'Report Generation'],
    },
    'tailwind-css': {
      title: 'Tailwind CSS',
      headline: 'Tailwind CSS Design & Development',
      desc: 'Utility-first CSS framework for rapid, responsive, and consistent UI development. We build custom design systems with Tailwind that scale with your product.',
      features: ['Responsive Design', 'Custom Design Systems', 'Dark Mode Support', 'Component Libraries', 'Performance Optimization', 'Accessibility'],
    },
    'html-css': {
      title: 'HTML/CSS',
      headline: 'HTML & CSS Development',
      desc: 'Semantic HTML markup and pixel-perfect CSS styling — from landing pages to complex web applications. We focus on accessibility, performance, and cross-browser compatibility.',
      features: ['Semantic Markup', 'Responsive Layouts', 'CSS Animations', 'Cross-Browser Testing', 'Accessibility (WCAG)', 'Performance Optimization'],
    },
    'bash-shell': {
      title: 'Bash & Shell',
      headline: 'Bash & Shell Automation',
      desc: 'Server administration, deployment automation, and system scripting with Bash. We build CI/CD pipelines, monitoring scripts, and infrastructure automation.',
      features: ['CI/CD Pipelines', 'Server Administration', 'Deployment Scripts', 'Log Monitoring', 'Backup Automation', 'System Integration'],
    },
  },
};

const CategoryDetail = () => {
  const { slug } = useParams();
  const location = useLocation();
  const { colors } = useTheme();

  // Determine category from URL path
  const getCategoryType = () => {
    if (location.pathname.startsWith('/industry')) return 'industry';
    if (location.pathname.startsWith('/solution')) return 'solution';
    if (location.pathname.startsWith('/technology')) return 'technology';
    return 'industry';
  };

  const categoryType = getCategoryType();
  const [cmsContent, setCmsContent] = useState(null);
  const fallbackContent = categoryData[categoryType]?.[slug];
  const content = cmsContent || fallbackContent;

  // Also try to fetch related services/projects from the API
  const [, setRelatedServices] = useState([]);
  const [relatedProjects, setRelatedProjects] = useState([]);

  useEffect(() => {
    const endpoint = categoryType === 'industry'
      ? '/site/industries'
      : categoryType === 'technology'
        ? '/site/tech-platforms'
        : '/site/home-content';

    apiGet(endpoint)
      .then((data) => {
        const source = categoryType === 'industry'
          ? data?.industries
          : categoryType === 'technology'
            ? data?.groups
            : data?.solutions;
        const match = source?.find((item) => (item.slug || item.name || item.title || '').toLowerCase().replace(/[^a-z0-9]+/g, '-') === slug);
        if (match) {
          setCmsContent({
            title: match.name || match.title,
            headline: match.headline || match.title || match.name,
            desc: match.description || match.subtitle || '',
            features: match.features || match.capabilities || match.items || [],
          });
        }
      })
      .catch(() => {});
    apiGet('/services')
      .then(data => { if (Array.isArray(data)) setRelatedServices(data.filter(s => s.published !== false).slice(0, 4)); })
      .catch(() => {});
    apiGet('/projects')
      .then(data => { if (Array.isArray(data)) setRelatedProjects(data.filter(p => p.published !== false).slice(0, 4)); })
      .catch(() => {});
  }, [slug, categoryType]);

  if (!content) {
    return (
      <section style={{
        minHeight: '100vh', padding: '7rem 0 5rem',
        background: '#070E1A', color: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ fontFamily: "'Sora', sans-serif", fontSize: '1.5rem', fontWeight: 700, marginBottom: '1rem' }}>
            Page not found
          </h2>
          <Link to="/" style={{ color: colors.primary, textDecoration: 'none', fontWeight: 600 }}>
            Go back home
          </Link>
        </div>
      </section>
    );
  }

  const categoryLabels = { industry: 'Industry', solution: 'Solution', technology: 'Technology' };

  return (
    <section style={{
      minHeight: '100vh', padding: '7rem 0 5rem',
      background: '#070E1A', color: '#fff',
      position: 'relative', overflow: 'hidden',
    }}>
      {/* Grid */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: 'linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)',
        backgroundSize: '60px 60px', pointerEvents: 'none',
      }} />
      {/* Glow */}
      <div style={{
        position: 'absolute', top: '15%', left: '50%', transform: 'translateX(-50%)',
        width: '800px', height: '400px',
        background: 'radial-gradient(ellipse, rgba(8,117,255,0.06) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <div style={{ position: 'relative', zIndex: 1, maxWidth: '860px', margin: '0 auto', padding: '0 1.5rem' }}>

        {/* Back */}
        <Link to="/" style={{
          display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
          fontSize: '0.8125rem', fontWeight: 600,
          color: 'rgba(255,255,255,0.5)', textDecoration: 'none',
          marginBottom: '2rem', transition: 'color 0.2s',
        }}
          onMouseEnter={e => e.currentTarget.style.color = colors.primary}
          onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.5)'}
        >
          <FaArrowLeft style={{ fontSize: '0.65rem' }} /> Back to Home
        </Link>

        {/* Badge */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
          padding: '0.4rem 1rem', borderRadius: '999px',
          fontSize: '0.75rem', fontWeight: 600,
          background: `${colors.primary}15`, color: colors.primary,
          marginBottom: '1rem',
        }}>
          {categoryLabels[categoryType]}
        </div>

        {/* Title */}
        <h1 style={{
          fontFamily: "'Sora', sans-serif",
          fontSize: 'clamp(1.75rem, 4vw, 2.5rem)',
          fontWeight: 800, lineHeight: 1.2, marginBottom: '1rem',
        }}>
          {content.headline.split(' ').map((word, i, arr) =>
            i === arr.length - 1 ? (
              <span key={i} style={{
                background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary || '#00AFFF'})`,
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              }}>{word}</span>
            ) : <span key={i}>{word} </span>
          )}
        </h1>

        <p style={{
          fontSize: '1rem', lineHeight: 1.7,
          color: 'rgba(255,255,255,0.55)', marginBottom: '2.5rem',
          maxWidth: '680px',
        }}>
          {content.desc}
        </p>

        {/* Features */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem',
          marginBottom: '3rem',
        }}>
          {content.features.map((f, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: '0.75rem',
              padding: '1rem 1.25rem', borderRadius: '0.75rem',
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.06)',
            }}>
              <div style={{
                width: '0.375rem', height: '0.375rem', borderRadius: '50%',
                background: colors.primary, flexShrink: 0,
              }} />
              <span style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.75)' }}>{f}</span>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <Link to="/book" style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
            padding: '0.875rem 1.75rem', borderRadius: '0.75rem',
            fontSize: '0.9375rem', fontWeight: 600,
            color: '#fff', textDecoration: 'none',
            background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary || '#00AFFF'})`,
            boxShadow: `0 4px 16px ${colors.primary}25`,
            transition: 'transform 0.2s',
          }}
            onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
          >
            Start a Project <FaArrowRight style={{ fontSize: '0.7rem' }} />
          </Link>
          <Link to="/contact" style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
            padding: '0.875rem 1.75rem', borderRadius: '0.75rem',
            fontSize: '0.9375rem', fontWeight: 600,
            color: 'rgba(255,255,255,0.85)', textDecoration: 'none',
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.1)',
            transition: 'all 0.2s',
          }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
          >
            Contact Us
          </Link>
        </div>

        {/* Related Projects */}
        {relatedProjects.length > 0 && (
          <div style={{ marginTop: '4rem' }}>
            <h3 style={{
              fontFamily: "'Sora', sans-serif", fontSize: '1.25rem', fontWeight: 700,
              marginBottom: '1.25rem',
            }}>
              Related <span style={{
                background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary || '#00AFFF'})`,
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              }}>Projects</span>
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
              {relatedProjects.map((p, i) => (
                <Link key={p.id || i} to={`/project/${p.slug || p.id}`} style={{
                  textDecoration: 'none', color: 'inherit',
                  padding: '1.25rem', borderRadius: '0.75rem',
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  transition: 'border-color 0.3s',
                }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = `${colors.primary}30`}
                  onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'}
                >
                  <div style={{ fontSize: '0.9375rem', fontWeight: 700, color: '#fff', marginBottom: '0.25rem' }}>
                    {p.title}
                  </div>
                  <div style={{ fontSize: '0.8125rem', color: 'rgba(255,255,255,0.45)', lineHeight: 1.5 }}>
                    {p.summary || p.description?.substring(0, 100) || ''}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default CategoryDetail;
