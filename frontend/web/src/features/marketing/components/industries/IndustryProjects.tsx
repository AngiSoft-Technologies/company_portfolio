// @ts-nocheck
// Projects delivered in this industry — proof, not promises.
// Filters the published projects collection by the industry slug and links
// each card through to the full project story.
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiGet } from '@/lib/httpClient';

export default function IndustryProjects({ industry }) {
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        apiGet('/projects')
            .then((data) => {
                if (cancelled) return;
                const list = Array.isArray(data) ? data : [];
                setProjects(
                    list.filter(
                        (p) =>
                            p.published !== false &&
                            (p.industry === industry?.slug || p.industry === industry?.name),
                    ),
                );
            })
            .catch(() => { if (!cancelled) setProjects([]); })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, [industry?.slug, industry?.name]);

    if (loading || projects.length === 0) return null;

    return (
        <section className="industry-related" aria-labelledby="industry-projects-heading">
            <div className="industry-related__head">
                <h2 id="industry-projects-heading" className="industry-related__title">
                    Work in {industry.name}
                </h2>
                <p className="industry-related__sub">
                    Projects and products we've delivered for this sector.
                </p>
            </div>
            <ul className="industry-related__grid">
                {projects.map((p) => {
                    const cover = p.images?.[0];
                    return (
                        <li key={p.id}>
                            <Link to={`/project/${p.slug}`} className="industry-related__card industry-related__card--project">
                                {cover ? (
                                    <span
                                        className="industry-related__media"
                                        style={{ backgroundImage: `url(${cover})` }}
                                        aria-hidden="true"
                                    />
                                ) : null}
                                <span className="industry-related__body">
                                    <strong>{p.title}</strong>
                                    {p.description ? <span>{p.description}</span> : null}
                                </span>
                            </Link>
                        </li>
                    );
                })}
            </ul>
        </section>
    );
}
