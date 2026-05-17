import React, { useState } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { ScrollReveal } from '../modern';
import {
  FaBrain, FaCloud, FaDatabase, FaMicrochip,
  FaLock, FaRobot, FaLink
} from 'react-icons/fa';

const trends = [
  {
    id: 'ai',
    label: 'Artificial Intelligence',
    icon: FaBrain,
    headline: 'AI-Powered Solutions',
    desc: 'We integrate machine learning, natural language processing, and computer vision into business applications — from intelligent chatbots to predictive analytics.',
    capabilities: [
      'AI Chatbot Development',
      'Predictive Analytics & Forecasting',
      'Natural Language Processing',
      'Computer Vision & Image Recognition',
      'AI-Powered Document Processing',
      'Recommendation Engines',
    ],
  },
  {
    id: 'cloud',
    label: 'Cloud',
    icon: FaCloud,
    headline: 'Cloud-Native Architecture',
    desc: 'We design and deploy scalable cloud infrastructure on AWS, Azure, and DigitalOcean — enabling your applications to grow without limits.',
    capabilities: [
      'Cloud Migration Strategy',
      'Microservices Architecture',
      'Serverless Functions',
      'CI/CD Pipeline Setup',
      'Auto-Scaling Infrastructure',
      'Multi-Cloud Deployments',
    ],
  },
  {
    id: 'data',
    label: 'Big Data',
    icon: FaDatabase,
    headline: 'Data-Driven Decisions',
    desc: 'Transform raw data into actionable insights with custom dashboards, ETL pipelines, and real-time analytics tailored to your business KPIs.',
    capabilities: [
      'Custom BI Dashboards',
      'ETL Pipeline Development',
      'Real-Time Data Processing',
      'Data Warehouse Design',
      'Excel & Power BI Reporting',
      'Data Quality & Governance',
    ],
  },
  {
    id: 'iot',
    label: 'IoT',
    icon: FaMicrochip,
    headline: 'Connected Systems',
    desc: 'Build IoT solutions that connect devices, sensors, and systems — from smart metering to fleet tracking and environmental monitoring.',
    capabilities: [
      'IoT Device Integration',
      'Sensor Data Collection',
      'Real-Time Monitoring Dashboards',
      'Fleet & Asset Tracking',
      'Smart Metering Systems',
      'Edge Computing Solutions',
    ],
  },
  {
    id: 'blockchain',
    label: 'Blockchain',
    icon: FaLink,
    headline: 'Distributed Trust',
    desc: 'Implement blockchain-based solutions for supply chain transparency, digital identity verification, and secure transaction recording.',
    capabilities: [
      'Smart Contract Development',
      'Supply Chain Tracking',
      'Digital Identity Systems',
      'Secure Record Keeping',
      'Tokenization Platforms',
      'Audit Trail Systems',
    ],
  },
  {
    id: 'automation',
    label: 'Automation',
    icon: FaRobot,
    headline: 'Intelligent Automation',
    desc: 'Automate repetitive tasks and complex workflows with scripting, RPA, and process orchestration to free your team for high-value work.',
    capabilities: [
      'Workflow Automation',
      'Bash & Shell Scripting',
      'Report Generation',
      'Data Entry Automation',
      'Email & Notification Systems',
      'Legacy System Integration',
    ],
  },
  {
    id: 'security',
    label: 'Cybersecurity',
    icon: FaLock,
    headline: 'Security by Design',
    desc: 'Embed security into every layer — from code reviews and penetration testing to compliance audits and incident response planning.',
    capabilities: [
      'Security Code Reviews',
      'Vulnerability Assessments',
      'Compliance Auditing',
      'Incident Response Planning',
      'Data Encryption & Protection',
      'Security Awareness Training',
    ],
  },
];

const TechTrends = () => {
  const { colors, mode } = useTheme();
  const [active, setActive] = useState('ai');
  const isDark = mode === 'dark';
  const current = trends.find((t) => t.id === active);

  return (
    <section
      className="relative py-20 md:py-28 overflow-hidden"
      style={{
        background: isDark
          ? 'linear-gradient(180deg, #0B1E3D 0%, #07142B 100%)'
          : 'linear-gradient(180deg, #EFF5FF 0%, #F8FAFF 100%)',
        color: isDark ? '#fff' : '#07142B',
      }}
    >
      <div className="relative z-10 max-w-6xl mx-auto px-6">
        <ScrollReveal animation="fadeUp">
          <div className="text-center mb-16">
            <div
              className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-5 text-sm font-medium"
              style={{
                background: `linear-gradient(135deg, ${colors.primary}15, ${colors.secondary}15)`,
                color: colors.primary,
                border: `1px solid ${colors.primary}25`,
              }}
            >
              Tech Trends
            </div>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
              Improve and Innovate{' '}
              <span style={{
                background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}>With Tech Trends</span>
            </h2>
            <p
              className="text-lg max-w-2xl mx-auto"
              style={{ color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.55)' }}
            >
              We leverage cutting-edge technologies to build solutions that keep your business ahead of the curve.
            </p>
          </div>
        </ScrollReveal>

        {/* Tabs */}
        <ScrollReveal animation="fadeUp" delay={100}>
          <div className="flex flex-wrap justify-center gap-2 mb-12">
            {trends.map((trend) => {
              const Icon = trend.icon;
              const isActive = active === trend.id;
              return (
                <button
                  key={trend.id}
                  onClick={() => setActive(trend.id)}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-300"
                  style={{
                    background: isActive
                      ? `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`
                      : isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
                    color: isActive ? '#fff' : isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)',
                    border: `1px solid ${isActive ? 'transparent' : isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`,
                    boxShadow: isActive ? `0 4px 16px ${colors.primary}30` : 'none',
                  }}
                >
                  <Icon className="text-sm" />
                  {trend.label}
                </button>
              );
            })}
          </div>
        </ScrollReveal>

        {/* Active Content */}
        <ScrollReveal animation="fadeUp" delay={200}>
          <div
            className="rounded-3xl p-8 md:p-12"
            style={{
              background: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.85)',
              border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`,
              backdropFilter: 'blur(12px)',
            }}
          >
            <div className="grid md:grid-cols-2 gap-8 items-start">
              <div>
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5"
                  style={{
                    background: `linear-gradient(135deg, ${colors.primary}20, ${colors.secondary}20)`,
                    border: `1px solid ${colors.primary}25`,
                  }}
                >
                  {current && <current.icon className="text-2xl" style={{ color: colors.primary }} />}
                </div>
                <h3
                  className="text-2xl md:text-3xl font-bold mb-4"
                  style={{ color: isDark ? '#fff' : '#1e293b' }}
                >
                  {current?.headline}
                </h3>
                <p
                  className="text-base leading-relaxed"
                  style={{ color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.55)' }}
                >
                  {current?.desc}
                </p>
              </div>
              <div>
                <h4
                  className="text-sm font-semibold uppercase tracking-wider mb-4"
                  style={{ color: colors.primary }}
                >
                  Key Capabilities
                </h4>
                <div className="space-y-3">
                  {current?.capabilities.map((cap, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 p-3 rounded-xl transition-all duration-200 hover:translate-x-1"
                      style={{
                        background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                        border: `1px solid ${isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)'}`,
                      }}
                    >
                      <div
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ background: colors.success }}
                      />
                      <span
                        className="text-sm font-medium"
                        style={{ color: isDark ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.75)' }}
                      >
                        {cap}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
};

export default TechTrends;
