import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';

// Existing components that work well
import HeroSlider from '../components/landing/HeroSlider';
import TestimonialSlider from '../components/landing/TestimonialSlider';
import BrandCTA from '../components/landing/BrandCTA';
import KeyFacts from '../components/sections/KeyFacts';
import IndustryExpertise from '../components/sections/IndustryExpertise';
import SolutionsWeDeliver from '../components/sections/SolutionsWeDeliver';
import SuccessStories from '../components/sections/SuccessStories';
import TechPlatforms from '../components/sections/TechPlatforms';
import FaqSection from '../components/sections/FaqSection';
import Blog from '../components/sections/Blog';

// Icons
import {
  FaArrowRight, FaLaptopCode, FaMobileAlt, FaShieldAlt,
  FaChartLine, FaCloud, FaBrain, FaNetworkWired,
  FaRobot, FaDatabase, FaLock, FaMicrochip,
  FaCheckCircle, FaCalendarCheck
} from 'react-icons/fa';

const Home = () => {
  return (
    <>
      {/* 1. HERO */ }
      <HeroSlider />

      {/* 2. KEY FACTS */}
      <KeyFacts />

      {/* 3. SERVICES */}
      <ServicesSection />

      {/* 4. INDUSTRY EXPERTISE */}
      <IndustryExpertise />

      {/* 5. SOLUTIONS */}
      <SolutionsWeDeliver />

      {/* 6. TECH TRENDS */}
      <TechTrendsSection />
      
      {/* 7. SUCCESS STORIES */}
      <SuccessStories />

      {/* 8. BOTTOM CTA */}
      <BrandCTA />

      {/* 9. BLOG */}
      <Blog />

      {/* 10. TESTIMONIALS */}
      <TestimonialSlider />

      {/* 11 . TECH PLATFORMS */}
      <TechPlatforms />

      {/* 12. FAQ */}
      <FaqSection />

      {/* 13. CONTACT */}
      <ContactSection />


    </>
  );
};

/* ===================== SERVICES SECTION ===================== */
const ServicesSection = () => {
  const [activeTab, setActiveTab] = useState(0);

  const categories = [
    {
      name: 'Software Development',
      icon: FaLaptopCode,
      image: '/images/services/software-development.jpg',
      desc: 'Custom web and mobile applications built with modern technologies — from MVPs to enterprise platforms.',
      services: ['Web Application Development', 'Mobile App Development (Flutter/Kotlin)', 'API & Microservices', 'SaaS Product Development', 'Legacy System Modernization', 'UI/UX Design & Prototyping'],
    },
    {
      name: 'IT Consulting',
      icon: FaCloud,
      image: '/images/services/it-consulting.jpg',
      desc: 'Strategic technology consulting to help businesses choose the right stack, scale infrastructure, and optimize operations.',
      services: ['Technology Strategy & Roadmap', 'Cloud Migration Planning', 'System Architecture Review', 'Digital Transformation', 'IT Infrastructure Audit', 'Vendor Selection & Evaluation'],
    },
    {
      name: 'AI & Automation',
      icon: FaBrain,
      image: '/images/services/ai-automation.jpg',
      desc: 'Integrate artificial intelligence and automation into your business processes to work smarter, not harder.',
      services: ['AI Chatbot Development', 'Workflow Automation', 'Predictive Analytics', 'Document Processing AI', 'Bash & Shell Scripting', 'Report Generation Systems'],
    },
    {
      name: 'Cybersecurity',
      icon: FaShieldAlt,
      image: '/images/services/cybersecurity.jpg',
      desc: 'Protect your digital assets with comprehensive security services — from code reviews to penetration testing.',
      services: ['Security Code Reviews', 'Vulnerability Assessments', 'Compliance Auditing', 'Incident Response Planning', 'Data Encryption & Protection', 'Security Awareness Training'],
    },
    {
      name: 'Data Analytics',
      icon: FaChartLine,
      image: '/images/services/data-analytics.jpg',
      desc: 'Transform raw data into actionable insights with custom dashboards, reports, and data pipelines.',
      services: ['Custom BI Dashboards', 'ETL Pipeline Development', 'Excel & Power BI Reporting', 'Real-Time Data Processing', 'Data Warehouse Design', 'Data Quality & Governance'],
    },
    {
      name: 'Infrastructure',
      icon: FaNetworkWired,
      image: '/images/services/infrastructure.jpg',
      desc: 'Design, deploy, and manage cloud infrastructure and networking solutions that scale with your business.',
      services: ['Cloud Deployment (AWS/Azure/DO)', 'Docker & Kubernetes Setup', 'CI/CD Pipeline Configuration', 'Network Design & Management', 'ISP Billing & Management', 'Server Administration'],
    },
  ];

  return (
    <section className="angi-section angi-section-dark" id="services">
      <div className="angi-container">
        <div className="angi-section-header">
          <div className="angi-section-badge">Our Services</div>
          <h2 className="angi-section-title">
            Explore Our <span className="angi-section-title-gradient">Offering</span>
          </h2>
          <p className="angi-section-subtitle">
            From custom software to AI automation, we deliver solutions that drive real business growth.
          </p>
        </div>

        <div className="angi-tab-group">
          {categories.map((cat, i) => {
            const Icon = cat.icon;
            return (
              <button
                key={i}
                className={`angi-tab ${activeTab === i ? 'angi-tab-active' : ''}`}
                onClick={() => setActiveTab(i)}
              >
                {cat.name}
              </button>
            );
          })}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2.5rem', alignItems: 'start' }}>
          {/* Left: Heading, Description, Image */}
          <div>
            <h3 style={{ fontFamily: "'Sora', sans-serif", fontSize: '1.5rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--text-primary)' }}>
              {categories[activeTab].name}
            </h3>
            <p className="angi-card-text" style={{ fontSize: '1rem', maxWidth: '28rem', marginBottom: '1.5rem' }}>
              {categories[activeTab].desc}
            </p>

            {/* Image below heading + description */}
            <div style={{ borderRadius: '0.75rem', overflow: 'hidden', border: '1px solid rgba(0,175,255,0.1)' }}>
              <img
                src={categories[activeTab].image}
                alt={categories[activeTab].name}
                style={{
                  width: '100%',
                  height: '260px',
                  objectFit: 'cover',
                  display: 'block',
                }}
              />
            </div>
          </div>

          {/* Right: Service List + Button */}
          <div>
            <div className="angi-feature-list">
              {categories[activeTab].services.map((svc, i) => (
                <div key={i} className="angi-feature-item">
                  <div className="angi-feature-dot" />
                  <span style={{ fontSize: '0.9375rem', fontWeight: 500, color: 'rgba(245,247,250,0.8)' }}>
                    {svc}
                  </span>
                </div>
              ))}
            </div>
            <Link to="/services" className="angi-btn-primary" style={{ display: 'inline-flex', marginTop: '1.5rem' }}>
              View All Services <FaArrowRight style={{ fontSize: '0.75rem' }} />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

/* ===================== TECH TRENDS ===================== */
const TechTrendsSection = () => {
  const [active, setActive] = useState(0);

  const trends = [
    {
      name: 'Artificial Intelligence',
      icon: FaBrain,
      bgImage: '/images/services/ai-bg.jpg',
      desc: 'We integrate machine learning, NLP, and computer vision into business applications — from intelligent chatbots to predictive analytics.',
      caps: ['AI Chatbot Development', 'Predictive Analytics & Forecasting', 'Natural Language Processing', 'Computer Vision & Image Recognition', 'AI-Powered Document Processing', 'Recommendation Engines'],
    },
    {
      name: 'Cloud',
      icon: FaCloud,
      bgImage: '/images/services/cloud-bg.jpg',
      desc: 'We design and deploy scalable cloud infrastructure on AWS, Azure, and DigitalOcean — enabling your applications to grow without limits.',
      caps: ['Cloud Migration Strategy', 'Microservices Architecture', 'Serverless Functions', 'CI/CD Pipeline Setup', 'Auto-Scaling Infrastructure', 'Multi-Cloud Deployments'],
    },
    {
      name: 'Big Data',
      icon: FaDatabase,
      bgImage: '/images/services/bigdata-bg.jpg',
      desc: 'Transform raw data into actionable insights with custom dashboards, ETL pipelines, and real-time analytics tailored to your business KPIs.',
      caps: ['Custom BI Dashboards', 'ETL Pipeline Development', 'Real-Time Data Processing', 'Data Warehouse Design', 'Excel & Power BI Reporting', 'Data Quality & Governance'],
    },
    {
      name: 'Automation',
      icon: FaRobot,
      bgImage: '/images/services/automation-bg.jpg',
      desc: 'Automate repetitive tasks and complex workflows with scripting, RPA, and process orchestration to free your team for high-value work.',
      caps: ['Workflow Automation', 'Bash & Shell Scripting', 'Report Generation', 'Data Entry Automation', 'Email & Notification Systems', 'Legacy System Integration'],
    },
    {
      name: 'Cybersecurity',
      icon: FaLock,
      bgImage: '/images/services/security-bg.jpg',
      desc: 'Embed security into every layer — from code reviews and penetration testing to compliance audits and incident response planning.',
      caps: ['Security Code Reviews', 'Vulnerability Assessments', 'Compliance Auditing', 'Incident Response Planning', 'Data Encryption & Protection', 'Security Awareness Training'],
    },
  ];

  return (
    <section className="angi-section angi-section-gradient" id="trends">
      <div className="angi-container">
        <div className="angi-section-header">
          <div className="angi-section-badge">Tech Trends</div>
          <h2 className="angi-section-title">
            Improve and Innovate <span className="angi-section-title-gradient">With Technology</span>
          </h2>
          <p className="angi-section-subtitle">
            We leverage cutting-edge technologies to build solutions that keep your business ahead of the curve.
          </p>
        </div>

        <div className="angi-tab-group">
          {trends.map((t, i) => (
            <button
              key={i}
              className={`angi-tab ${active === i ? 'angi-tab-active' : ''}`}
              onClick={() => setActive(i)}
            >
              {t.name}
            </button>
          ))}
        </div>

        <div style={{
          position: 'relative', borderRadius: '1.25rem', overflow: 'hidden',
          border: '1px solid rgba(0,175,255,0.1)',
        }}>
          {/* Background image */}
          <div style={{
            position: 'absolute', inset: 0,
            backgroundImage: `url(${trends[active].bgImage})`,
            backgroundSize: 'cover', backgroundPosition: 'center',
            filter: 'brightness(0.3)',
            transition: 'background-image 0.6s ease',
          }} />
          {/* Overlay */}
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(135deg, rgba(7,20,43,0.88) 0%, rgba(7,20,43,0.7) 100%)',
          }} />

          {/* Content */}
          <div style={{ position: 'relative', zIndex: 2, padding: '2.5rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3rem', alignItems: 'start' }}>
              <div>
                <div style={{
                  width: '3.5rem', height: '3.5rem', borderRadius: '0.875rem',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '1.5rem', color: 'var(--primary)', marginBottom: '1.25rem',
                  background: 'rgba(8,117,255,0.1)', backdropFilter: 'blur(10px)',
                }}>
                  {React.createElement(trends[active].icon)}
                </div>
                <h3 style={{ fontFamily: "'Sora', sans-serif", fontSize: '1.375rem', fontWeight: 700, marginBottom: '1rem', color: '#fff' }}>
                  {trends[active].name}
                </h3>
                <p style={{ fontSize: '0.9375rem', lineHeight: 1.7, color: 'rgba(245,247,250,0.6)' }}>
                  {trends[active].desc}
                </p>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--primary)', marginBottom: '1rem' }}>
                  Key Capabilities
                </div>
                <div className="angi-feature-list">
                  {trends[active].caps.map((cap, i) => (
                    <div key={i} className="angi-feature-item">
                      <div className="angi-feature-dot" />
                      <span style={{ fontSize: '0.875rem', fontWeight: 500, color: 'rgba(245,247,250,0.8)' }}>{cap}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

/* ===================== CONTACT SECTION ===================== */
const ContactSection = () => {
  const [form, setForm] = useState({ name: '', email: '', phone: '', company: '', message: '', comm: 'email', nda: false });
  const [submitted, setSubmitted] = useState(false);

  const inputStyle = { marginBottom: '1rem' };

  return (
    <section className="angi-section angi-section-dark" id="contact">
      <div className="angi-container">
        <div className="angi-section-header">
          <div className="angi-section-badge">Get In Touch</div>
          <h2 className="angi-section-title">
            Let's Start <span className="angi-section-title-gradient">Your Project</span>
          </h2>
          <p className="angi-section-subtitle">
            Share your project details and we'll get back to you within 24 hours.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', maxWidth: '1100px', margin: '0 auto' }}>
          {/* LEFT: Form */}
          <div className="angi-contact-card">
            <h3 style={{ fontFamily: "'Sora', sans-serif", fontSize: '1.25rem', fontWeight: 700, marginBottom: '1.5rem' }}>
              Tell Us About Your Project
            </h3>

            {submitted ? (
              <div style={{ textAlign: 'center', padding: '3rem 0' }}>
                <div style={{ width: '4rem', height: '4rem', borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary), var(--secondary))', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', fontSize: '1.5rem', color: '#fff' }}>
                  <FaCheckCircle />
                </div>
                <h3 style={{ fontFamily: "'Sora', sans-serif", fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>Message Sent!</h3>
                <p style={{ color: 'rgba(245,247,250,0.6)' }}>We'll get back to you within 24 hours.</p>
              </div>
            ) : (
              <form onSubmit={(e) => { e.preventDefault(); setSubmitted(true); }} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <textarea
                  className="angi-input"
                  placeholder="Describe your project, goals, and timeline..."
                  rows={4}
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  style={{ resize: 'none' }}
                />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <input className="angi-input" placeholder="Full Name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                  <input className="angi-input" placeholder="Company" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <input className="angi-input" type="email" placeholder="Work Email *" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                  <input className="angi-input" placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                </div>

                <div style={{ fontSize: '0.875rem', fontWeight: 500, color: 'rgba(245,247,250,0.7)', marginBottom: '0.25rem' }}>Preferred Communication</div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {['email', 'phone', 'whatsapp'].map((m) => (
                    <button key={m} type="button" className={`angi-tab ${form.comm === m ? 'angi-tab-active' : ''}`} onClick={() => setForm({ ...form, comm: m })} style={{ flex: 1, textTransform: 'capitalize' }}>
                      {m}
                    </button>
                  ))}
                </div>

                <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', fontSize: '0.875rem', color: 'rgba(245,247,250,0.6)' }}>
                  <input type="checkbox" checked={form.nda} onChange={(e) => setForm({ ...form, nda: e.target.checked })} style={{ accentColor: 'var(--primary)' }} />
                  I'd like to sign an NDA before sharing details
                </label>

                <button type="submit" className="angi-btn-primary" style={{ width: '100%', marginTop: '0.5rem' }}>
                  Send Message
                </button>
              </form>
            )}
          </div>

          {/* RIGHT: Contact Info */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <h3 style={{ fontFamily: "'Sora', sans-serif", fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>
              Get In Touch Instantly
            </h3>

            {[
              { icon: FaNetworkWired, label: 'Call Us', value: '+254 710 398 690', href: 'tel:+254710398690' },
              { icon: FaCalendarCheck, label: 'Email Us', value: 'info@angisoft.co.ke', href: 'mailto:info@angisoft.co.ke' },
              { icon: FaMobileAlt, label: 'WhatsApp', value: '+254 710 398 690', href: 'https://wa.me/254710398690' },
            ].map((item, i) => (
              <a key={i} href={item.href} target={item.href?.startsWith('http') ? '_blank' : undefined} rel="noopener noreferrer" className="angi-card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.25rem 1.5rem', textDecoration: 'none' }}>
                <div className="angi-card-icon" style={{ marginBottom: 0, width: '2.75rem', height: '2.75rem', fontSize: '1rem' }}>
                  <item.icon />
                </div>
                <div>
                  <div style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-primary)' }}>{item.label}</div>
                  <div style={{ fontSize: '0.8125rem', color: 'rgba(245,247,250,0.55)' }}>{item.value}</div>
                </div>
              </a>
            ))}

            <div className="angi-card" style={{ background: 'rgba(8, 117, 255, 0.06)', borderColor: 'rgba(8, 117, 255, 0.15)' }}>
              <div style={{ fontSize: '0.9375rem', fontWeight: 600, marginBottom: '0.5rem' }}>Need Immediate Help?</div>
              <p style={{ fontSize: '0.8125rem', color: 'rgba(245,247,250,0.55)', marginBottom: '1rem' }}>
                Our team is available Monday to Saturday, 8AM - 6PM EAT for urgent inquiries.
              </p>
              <a href="https://wa.me/254710398690" target="_blank" rel="noopener noreferrer" className="angi-btn-primary" style={{ background: '#25D366', boxShadow: '0 4px 16px rgba(37,211,102,0.3)', padding: '0.625rem 1.25rem', fontSize: '0.8125rem' }}>
                Chat on WhatsApp
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Home;
