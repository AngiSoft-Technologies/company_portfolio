import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { FaArrowRight } from 'react-icons/fa';
import { LoadingIndicator, VisualState } from '@angisoft/ui';
import { apiGet } from '@/lib/httpClient';
import { resolveAssetUrl } from '@/lib/marketing/constants';
import { getBlogDetailPath } from '@/lib/marketing/detailPaths';
import './FeaturedInsights.css';

type BlogAuthor = { firstName?: string; lastName?: string };
type BlogPost = {
  id?: string;
  slug?: string;
  title?: string;
  excerpt?: string;
  summary?: string;
  description?: string;
  coverImage?: string;
  coverImageAlt?: string;
  publishedAt?: string;
  createdAt?: string;
  tags?: string[];
  author?: BlogAuthor | string;
  published?: boolean;
  status?: string;
};
type SectionCopy = {
  badge?: string;
  title?: string;
  subtitle?: string;
  ctaLabel?: string;
  readLabel?: string;
};

const authorName = (post: BlogPost) => {
  if (typeof post.author === 'object' && post.author) {
    return `${post.author.firstName || ''} ${post.author.lastName || ''}`.trim();
  }
  return typeof post.author === 'string' ? post.author : '';
};

const postDate = (post: BlogPost) => {
  const value = post.publishedAt || post.createdAt;
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ''
    : new Intl.DateTimeFormat('en-KE', { year: 'numeric', month: 'short', day: 'numeric' }).format(date);
};

const FeaturedInsights = () => {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [copy, setCopy] = useState<SectionCopy | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    Promise.all([
      apiGet<BlogPost[] | { posts?: BlogPost[]; blogs?: BlogPost[]; data?: BlogPost[] }>('/blogs'),
      apiGet<{ home?: { blog?: SectionCopy } }>('/site/ui'),
    ])
      .then(([postResponse, uiResponse]) => {
        if (!active) return;
        const source = Array.isArray(postResponse)
          ? postResponse
          : postResponse?.posts || postResponse?.blogs || postResponse?.data || [];
        const published = source
          .filter((post) => post && post.published !== false && post.status !== 'DRAFT' && post.status !== 'ARCHIVED')
          .sort((a, b) => {
            const first = new Date(a.publishedAt || a.createdAt || 0).getTime();
            const second = new Date(b.publishedAt || b.createdAt || 0).getTime();
            return second - first;
          });
        setPosts(published.slice(0, 5));
        setCopy(uiResponse?.home?.blog || null);
        setLoading(false);
      })
      .catch(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const articles = useMemo(
    () =>
      posts.map((post) => ({
        id: post.id || post.slug,
        title: post.title || '',
        excerpt: post.excerpt || post.summary || post.description || '',
        cover: resolveAssetUrl(post.coverImage || ''),
        alt: post.coverImageAlt || post.title || '',
        date: postDate(post),
        author: authorName(post),
        tags: (post.tags || []).slice(0, 2),
        path: getBlogDetailPath(post),
      })),
    [posts],
  );

  const featured = articles[0];
  const latest = articles.slice(1);

  if (loading) {
    return (
      <section className="featured-insights">
        <LoadingIndicator variant="skeleton" size="lg" />
      </section>
    );
  }

  if (articles.length === 0) return null;

  return (
    <section className="featured-insights">
      <div className="featured-insights__container">
        <header className="featured-insights__header">
          <div>
            {copy?.badge ? <p className="featured-insights__eyebrow">{copy.badge}</p> : null}
            <h2>{copy?.title}</h2>
            {copy?.subtitle ? <p className="featured-insights__subtitle">{copy.subtitle}</p> : null}
          </div>
          {copy?.ctaLabel ? (
            <Link to="/blog" className="featured-insights__all">
              {copy.ctaLabel}
              <FaArrowRight aria-hidden="true" />
            </Link>
          ) : null}
        </header>

        <div className="featured-insights__layout">
          {featured ? (
            <article className="featured-insights__feature">
              <Link to={featured.path} className="featured-insights__media">
                {featured.cover ? (
                  <img src={featured.cover} alt={featured.alt} loading="lazy" decoding="async" />
                ) : (
                  <span aria-hidden="true">{(featured.title || 'A').charAt(0).toUpperCase()}</span>
                )}
              </Link>
              <div className="featured-insights__content">
                <div className="featured-insights__meta">
                  {featured.date ? <time>{featured.date}</time> : null}
                  {featured.author ? <span>{featured.author}</span> : null}
                </div>
                <h3>{featured.title}</h3>
                {featured.excerpt ? <p>{featured.excerpt}</p> : null}
                <Link to={featured.path} className="featured-insights__read">
                  {copy?.readLabel || 'Read'}
                  <FaArrowRight aria-hidden="true" />
                </Link>
              </div>
            </article>
          ) : null}

          <div className="featured-insights__news">
            {latest.map((post) => (
              <Link key={post.id} to={post.path} className="featured-insights__news-item">
                <span className="featured-insights__news-media">
                  {post.cover ? (
                    <img src={post.cover} alt={post.alt} loading="lazy" decoding="async" />
                  ) : (
                    <span aria-hidden="true">{(post.title || 'A').charAt(0).toUpperCase()}</span>
                  )}
                </span>
                <span className="featured-insights__news-copy">
                  {post.date ? <time>{post.date}</time> : null}
                  <strong>{post.title}</strong>
                </span>
              </Link>
            ))}
          </div>
        </div>

        {articles.length === 0 ? <VisualState variant="unavailable" /> : null}
      </div>
    </section>
  );
};

export default FeaturedInsights;
