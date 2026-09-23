import React, { useState } from 'react';
import {
    FaBrain, FaCloud, FaDatabase, FaRobot, FaLock, FaArrowRight,
} from 'react-icons/fa';
import { Link } from 'react-router-dom';
import technologyTrends from '../../data/technologyTrends';
import '../../css/TechTrendsSection.css';

const ICONS = { FaBrain, FaCloud, FaDatabase, FaRobot, FaLock };

const TechTrendsSection = () => {
    const [active, setActive] = useState(0);
    const trend = technologyTrends[active];

    return (
        <section id="trends" className="angi-trends-section">
            <div className="angi-container">
                <div className="angi-section-header">
                    <div className="angi-section-badge">Technology</div>
                    <h2 className="angi-section-title">
                        Tech Trends We <span className="angi-section-title-gradient">Build With</span>
                    </h2>
                    <p className="angi-section-subtitle">
                        Practical technologies we use to ship reliable software, reports and automations.
                    </p>
                </div>

                <div className="angi-trends-tabs-scroll">
                    <div className="angi-trends-tabs" role="tablist" aria-label="Technology trends">
                        {technologyTrends.map((t, i) => {
                            const Icon = ICONS[t.icon];
                            return (
                                <button
                                    key={t.id}
                                    type="button"
                                    role="tab"
                                    aria-selected={active === i}
                                    aria-controls={`trends-panel-${t.id}`}
                                    className={`angi-trends-tab${active === i ? ' is-active' : ''}`}
                                    onClick={() => setActive(i)}
                                >
                                    {Icon && <Icon aria-hidden="true" className="angi-trends-tab-icon" />}
                                    {t.name}
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div
                    className="angi-trends-panel"
                    role="tabpanel"
                    id={`trends-panel-${trend.id}`}
                    aria-labelledby={`trends-tab-${trend.id}`}
                    style={{ '--trend-background-image': `url(${trend.bgImage})` }}
                >
                    <div className="angi-trends-background" aria-hidden="true" />
                    <div className="angi-trends-overlay" aria-hidden="true" />

                    <div className="angi-trends-content">
                        <div className="angi-trends-introduction">
                            <div className="angi-trends-icon">
                                {React.createElement(ICONS[trend.icon], { 'aria-hidden': 'true' })}
                            </div>
                            <h3 className="angi-trends-title">{trend.name}</h3>
                            <p className="angi-trends-description">{trend.description}</p>
                        </div>

                        <div className="angi-trends-capabilities">
                            <div className="angi-trends-capabilities-label">What this includes</div>
                            <ul className="angi-trends-list">
                                {trend.capabilities.map((cap) => (
                                    <li key={cap} className="angi-trends-item">
                                        <span className="angi-trends-item-dot" aria-hidden="true" />
                                        {cap}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>

                <div className="angi-trends-footer">
                    <Link to="/services" className="angi-btn-primary">
                        See How We Work <FaArrowRight aria-hidden="true" />
                    </Link>
                </div>
            </div>
        </section>
    );
};

export default TechTrendsSection;
