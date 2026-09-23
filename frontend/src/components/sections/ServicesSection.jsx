import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { FaArrowRight, FaLaptopCode, FaChartLine, FaShieldAlt, FaMobileAlt } from 'react-icons/fa';
import homeServices from '../../data/homeServices';
import { resolveAssetUrl } from '../../utils/constants';
import '../../css/ServicesSection.css';

const ICONS = { FaLaptopCode, FaChartLine, FaShieldAlt, FaMobileAlt };

const ServicesSection = () => {
    const [activeTab, setActiveTab] = useState(0);
    const active = homeServices[activeTab];

    return (
        <section id="services" className="angi-services-section">
            <div className="angi-container">
                <div className="angi-section-header">
                    <div className="angi-section-badge">Our Services</div>
                    <h2 className="angi-section-title">
                        Explore Our <span className="angi-section-title-gradient">Offering</span>
                    </h2>
                    <p className="angi-section-subtitle">
                        From custom software to data analysis, we deliver practical solutions that drive real business growth.
                    </p>
                </div>

                <div className="angi-services-tabs-scroll">
                    <div className="angi-services-tabs" role="tablist" aria-label="Service categories">
                        {homeServices.map((cat, i) => (
                            <button
                                key={cat.id}
                                type="button"
                                role="tab"
                                aria-selected={activeTab === i}
                                aria-controls={`service-panel-${cat.id}`}
                                className={`angi-services-tab${activeTab === i ? ' is-active' : ''}`}
                                onClick={() => setActiveTab(i)}
                            >
                                {cat.name}
                            </button>
                        ))}
                    </div>
                </div>

                <div
                    className="angi-services-layout"
                    role="tabpanel"
                    id={`service-panel-${active.id}`}
                    aria-labelledby={`service-tab-${active.id}`}
                >
                    <div className="angi-services-overview">
                        <h3 className="angi-services-title">{active.name}</h3>
                        <p className="angi-services-description">{active.desc}</p>

                        <div className="angi-img-bleed angi-services-image">
                            <img
                                loading="lazy"
                                decoding="async"
                                src={resolveAssetUrl(active.image)}
                                alt={active.name}
                            />
                        </div>
                    </div>

                    <div className="angi-services-list-wrap">
                        <ul className="angi-feature-list angi-services-list">
                            {active.services.map((svc) => (
                                <li key={svc} className="angi-feature-item angi-services-item">
                                    <span className="angi-feature-dot angi-services-item-dot" aria-hidden="true" />
                                    <span className="angi-services-item-text">{svc}</span>
                                </li>
                            ))}
                        </ul>

                        <Link to="/services" className="angi-btn-primary angi-services-action">
                            View All Services <FaArrowRight aria-hidden="true" className="angi-services-action-icon" />
                        </Link>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default ServicesSection;
