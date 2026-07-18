import React, { useEffect, useState } from 'react';
import {
  FaReact, FaNodeJs, FaPython, FaJava, FaPhp,
  FaDocker, FaAws, FaLinux, FaHtml5, FaJs,
  FaGitAlt, FaAndroid, FaApple, FaMicrosoft, FaDatabase,
  FaChartBar,
} from 'react-icons/fa';

import {
  SiTypescript, SiTailwindcss, SiNextdotjs, SiLaravel,
  SiDjango, SiSpringboot, SiFlutter, SiKotlin,
  SiPostgresql, SiMongodb, SiFirebase, SiRedis,
  SiKubernetes, SiTerraform, SiMysql, SiNginx,
  SiVuedotjs, SiGraphql, SiTensorflow,
  SiStripe, SiOpenai, SiAngular,
} from 'react-icons/si';
import { apiGet } from '../../js/httpClient';
import '../../css/TechPlatforms.css';

const iconRegistry = {
  FaReact,
  FaNodeJs,
  FaPython,
  FaJava,
  FaPhp,
  FaDocker,
  FaAws,
  FaLinux,
  FaHtml5,
  FaJs,
  FaGitAlt,
  FaAndroid,
  FaApple,
  FaMicrosoft,
  FaDatabase,
  FaChartBar,
  SiTypescript,
  SiTailwindcss,
  SiNextdotjs,
  SiLaravel,
  SiDjango,
  SiSpringboot,
  SiFlutter,
  SiKotlin,
  SiPostgresql,
  SiMongodb,
  SiFirebase,
  SiRedis,
  SiKubernetes,
  SiTerraform,
  SiMysql,
  SiNginx,
  SiVuedotjs,
  SiGraphql,
  SiTensorflow,
  SiStripe,
  SiOpenai,
  SiAngular,
};

const resolveIcon = (iconName) => iconRegistry[iconName] || FaDatabase;

const slugify = (value = '') =>
  String(value)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || `item-${Math.random().toString(36).slice(2, 8)}`;

// Accept either a bare categories array or an object wrapping { categories, groups }.
const extractCategories = (data) => {
  if (Array.isArray(data)) return data;
  if (data && typeof data === 'object') {
    return data.categories || data.groups || [];
  }
  return [];
};

const TechPlatforms = () => {
  const [cms, setCms] = useState(null);
  const [status, setStatus] = useState('loading'); // loading | ready | error

  useEffect(() => {
    let active = true;

    apiGet('/site/tech-platforms')
      .then((data) => {
        if (!active) return;
        const rawCategories = extractCategories(data).map((group, gi) => ({
          id: group?.id || slugify(group?.name || `category-${gi}`),
          name: group?.name || group?.title || `Category ${gi + 1}`,
          items: (group?.items || []).map((item, ii) => {
            const svc = typeof item === 'string'
              ? { name: item, icon: FaDatabase, color: '#00AFFF' }
              : { ...item, icon: resolveIcon(item.icon), color: item.color || '#00AFFF' };
            return { ...svc, id: svc.id || `${slugify(group?.name)}-${ii}` };
          }),
        }));

        setCms({ ...data, categories: rawCategories });
        setStatus(rawCategories.length > 0 ? 'ready' : 'ready');
      })
      .catch((err) => {
        if (!active) return;
        console.error('Failed to load tech platforms:', err);
        setStatus('error');
      });

    return () => {
      active = false;
    };
  }, []);

  const categories = cms?.categories || [];

  return (
    <section className="angi-tech" id="tech">
      <div className="angi-container">
        <div className="angi-section-header">
          <div className="angi-section-badge">{cms?.badge || 'Technology Stack'}</div>
          <h2 className="angi-section-title">
            {cms?.title || 'Technologies and Platforms'}{' '}
            <span className="angi-section-title-gradient">We Work With</span>
          </h2>
          {cms?.subtitle && <p className="angi-section-subtitle">{cms.subtitle}</p>}
        </div>

        {status === 'loading' && (
          <div className="angi-tech-state" role="status">Loading technologies…</div>
        )}
        {status === 'error' && (
          <div className="angi-tech-state" role="alert">Could not load technologies right now.</div>
        )}

        {status === 'ready' && (
          <div className="angi-tech-categories">
            {categories.map((cat) => (
              <div key={cat.id}>
                <h3 className="angi-tech-category-heading">{cat.name}</h3>

                <div className="angi-tech-grid">
                  {cat.items.map((tech) => {
                    const Icon = tech.icon;
                    return (
                      <div
                        key={tech.id}
                        className="angi-tech-tile"
                        style={{ '--tech-tile-border': `${tech.color}30` }}
                      >
                        <Icon className="angi-tech-icon" style={{ color: tech.color }} aria-hidden="true" />
                        <span className="angi-tech-name">{tech.name}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default TechPlatforms;
