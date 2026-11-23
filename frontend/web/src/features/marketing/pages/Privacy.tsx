import { useEffect, useState, type ComponentType, type ReactNode } from 'react';
import type { IconType } from 'react-icons';
import { useTheme } from '@/lib/theme';
import {
  type LegalBlock,
  useLegalDocument,
} from '@/lib/marketing/legalContent';
import { ScrollReveal, ParallaxSection as LegacyParallaxSection } from '../components/modern';

// The legacy component is `@ts-nocheck`'d and infers optional props as required.
const ParallaxSection = LegacyParallaxSection as unknown as ComponentType<{
  speed?: number;
  className?: string;
  children?: ReactNode;
}>;
import {
    FaShieldAlt, FaLock, FaEye, FaCookie, FaShareAlt, FaShieldVirus,
    FaUserShield, FaEnvelope, FaChevronRight, FaFileContract
} from 'react-icons/fa';

// Icons are presentation only; titles, anchors and copy come from CMS/fallback.
const SECTION_ICONS: Record<string, IconType> = {
    introduction: FaFileContract,
    'data-collection': FaEye,
    'data-usage': FaLock,
    cookies: FaCookie,
    'third-parties': FaShareAlt,
    security: FaShieldVirus,
    rights: FaUserShield,
    contact: FaEnvelope,
};

const Privacy = () => {
    const { colors, mode } = useTheme();
    const isDark = mode === 'dark';
    const legalDoc = useLegalDocument('privacy');
    const sections = legalDoc.sections;
    const [activeSection, setActiveSection] = useState('introduction');

    useEffect(() => {
        setActiveSection(sections[0]?.id ?? '');
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        setActiveSection(entry.target.id);
                    }
                });
            },
            { threshold: 0.3, rootMargin: '-80px 0px -60% 0px' }
        );

        sections.forEach(section => {
            const el = document.getElementById(section.id);
            if (el) observer.observe(el);
        });

        return () => observer.disconnect();
    }, [sections]);

    const scrollToSection = (id: string) => {
        const el = document.getElementById(id);
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    // Structured blocks are rendered as React text nodes — never as HTML.
    const renderBlock = (block: LegalBlock, index: number) => {
        switch (block.type) {
            case 'heading':
                return (
                    <h3
                        key={index}
                        className="text-xl font-semibold mt-6 mb-3"
                        style={{ color: colors.text }}
                    >
                        {block.text}
                    </h3>
                );
            case 'list':
                return (
                    <ul key={index} className="list-disc pl-6 space-y-2">
                        {block.items.map((item, itemIndex) => (
                            <li key={itemIndex}>
                                {item.label ? <strong>{item.label}:</strong> : null}
                                {item.label ? ' ' : ''}
                                {item.text}
                            </li>
                        ))}
                    </ul>
                );
            case 'contact':
                return (
                    <div
                        key={index}
                        className="p-6 rounded-2xl mt-6"
                        style={{
                            backgroundColor: `${colors.primary}10`,
                            border: `1px solid ${colors.primary}30`
                        }}
                    >
                        <p className="font-semibold mb-1" style={{ color: colors.text }}>
                            {block.title}
                        </p>
                        {block.lines.map((line, lineIndex) => (
                            <p key={lineIndex}>{line}</p>
                        ))}
                    </div>
                );
            case 'paragraph':
            default:
                return <p key={index}>{block.text}</p>;
        }
    };

    return (
        <div style={{ backgroundColor: colors.background, color: colors.text }} className="min-h-screen">
            {/* Hero Section */}
            <ParallaxSection speed={0.3} className="relative py-32 overflow-hidden">
                <div
                    className="absolute inset-0 z-0"
                    style={{
                        background: `linear-gradient(135deg, ${colors.primary}15 0%, ${colors.secondary}15 50%, ${colors.accent}15 100%)`
                    }}
                />
                <div className="absolute inset-0 z-0 overflow-hidden">
                    <div
                        className="absolute w-96 h-96 rounded-full blur-3xl opacity-20 animate-pulse"
                        style={{
                            background: `radial-gradient(circle, ${colors.primary}, transparent)`,
                            top: '10%',
                            left: '10%'
                        }}
                    />
                </div>

                <div className="relative z-10 max-w-7xl mx-auto px-4 text-center">
                    <ScrollReveal animation="fadeUp">
                        <span
                            className="inline-block px-6 py-2 rounded-full text-sm font-semibold mb-6"
                            style={{
                                backgroundColor: `${colors.primary}20`,
                                color: colors.primary,
                                border: `1px solid ${colors.primary}40`
                            }}
                        >
                            <FaShieldAlt className="inline mr-2" />
                            Legal
                        </span>
                    </ScrollReveal>

                    <ScrollReveal animation="fadeUp" delay={100}>
                        <h1 className="text-5xl md:text-7xl font-bold mb-6">
                            <span style={{ color: colors.text }}>{legalDoc.titleLead}</span>
                            <span style={{ color: colors.primary }}>
                                {legalDoc.titleAccent}
                            </span>
                        </h1>
                    </ScrollReveal>

                    <ScrollReveal animation="fadeUp" delay={200}>
                        <p
                            className="text-lg max-w-2xl mx-auto"
                            style={{ color: colors.textSecondary }}
                        >
                            {legalDoc.summary}
                        </p>
                    </ScrollReveal>
                </div>
            </ParallaxSection>

            {/* Content Section */}
            <section className="py-16 px-4">
                <div className="max-w-7xl mx-auto">
                    <div className="flex gap-12">
                        {/* Sidebar TOC */}
                        <aside className="hidden lg:block w-72 flex-shrink-0">
                            <div className="sticky top-24">
                                <ScrollReveal animation="fadeLeft">
                                    <div
                                        className="p-6 rounded-2xl"
                                        style={{
                                            backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
                                            border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'}`
                                        }}
                                    >
                                        <h3
                                            className="text-sm font-semibold uppercase tracking-wider mb-4"
                                            style={{ color: colors.textSecondary }}
                                        >
                                            Table of Contents
                                        </h3>
                                        <nav className="space-y-1" aria-label="Privacy policy sections">
                                            {sections.map((section) => {
                                                const Icon = SECTION_ICONS[section.id] ?? FaFileContract;
                                                const isActive = activeSection === section.id;
                                                return (
                                                    <button
                                                        key={section.id}
                                                        type="button"
                                                        onClick={() => scrollToSection(section.id)}
                                                        aria-current={isActive ? 'true' : undefined}
                                                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-sm transition-all duration-300"
                                                        style={{
                                                            backgroundColor: isActive
                                                                ? `${colors.primary}15`
                                                                : 'transparent',
                                                            color: isActive
                                                                ? colors.primary
                                                                : colors.textSecondary,
                                                            fontWeight: isActive ? 600 : 400
                                                        }}
                                                    >
                                                        <Icon className="text-xs flex-shrink-0" aria-hidden="true" />
                                                        <span className="truncate">{section.navTitle ?? section.title}</span>
                                                        {isActive && (
                                                            <FaChevronRight className="ml-auto text-xs flex-shrink-0" aria-hidden="true" />
                                                        )}
                                                    </button>
                                                );
                                            })}
                                        </nav>
                                    </div>
                                </ScrollReveal>
                            </div>
                        </aside>

                        {/* Main Content */}
                        <main className="flex-1 min-w-0 max-w-4xl">
                            {sections.map((section) => {
                                const Icon = SECTION_ICONS[section.id] ?? FaFileContract;
                                return (
                                    <ScrollReveal animation="fadeUp" key={section.id}>
                                        <div id={section.id} className="mb-16 scroll-mt-24">
                                            <h2
                                                className="text-3xl font-bold mb-6 flex items-center gap-3"
                                                style={{ color: colors.text }}
                                            >
                                                <Icon style={{ color: colors.primary }} aria-hidden="true" />
                                                {section.title}
                                            </h2>
                                            <div className="space-y-4" style={{ color: colors.textSecondary }}>
                                                {section.blocks.map(renderBlock)}
                                            </div>
                                        </div>
                                    </ScrollReveal>
                                );
                            })}
                        </main>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default Privacy;
