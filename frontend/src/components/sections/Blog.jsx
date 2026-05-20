import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import { apiGet } from '../../js/httpClient';
import { resolveAssetUrl } from '../../utils/constants';
import { getBlogDetailPath } from '../../utils/detailPaths';
import { FaArrowRight } from 'react-icons/fa';
import { IoSparkles } from 'react-icons/io5';

const Blog = () => {
  const { colors, mode } = useTheme();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const isDark = mode === 'dark';

  useEffect(() => {
    apiGet('/blogs')
      .then((data) => {
        const published = Array.isArray(data) ? data.filter(p => p.published !== false) : [];
        setPosts(published.slice(0, 4));
      })
      .catch((err) => console.error('Failed to load blogs:', err))
      .finally(() => setLoading(false));
  }, []);

  const getAuthorName = (post) => {
    if (post?.author && typeof post.author === 'object') {
      return `${post.author.firstName || ''} ${post.author.lastName || ''}`.trim() || 'AngiSoft Team';
    }
    return post?.author || 'AngiSoft Team';
  };

  const getAuthorInitial = (post) => getAuthorName(post).charAt(0);

  const getDate = (post) => {
    const date = post?.publishedAt || post?.createdAt;
    if (!date) return '';
    return new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const getTags = (post) => {
    if (Array.isArray(post?.tags) && post.tags.length > 0) return post.tags.slice(0, 4);
    if (post?.category) return [post.category];
    return [];
  };

  if (loading || posts.length === 0) return null;

  return (
    <section id="blog" style={{
      position: 'relative',
      padding: '5rem 0 4rem',
      overflow: 'hidden',
      background: isDark
        ? 'linear-gradient(180deg, #07142B 0%, #0B1E3D 50%, #07142B 100%)'
        : 'linear-gradient(180deg, #F8FAFF 0%, #EFF5FF 50%, #F8FAFF 100%)',
      color: isDark ? '#fff' : '#07142B',
    }}>
      {/* Decorative sparkle */}
      <IoSparkles style={{
        position: 'absolute', top: '3rem', right: '3rem',
        fontSize: '2.5rem',
        color: 'rgba(0,175,255,0.25)',
        filter: 'drop-shadow(0 0 12px rgba(0,175,255,0.3))',
      }} />

      <div style={{ position: 'relative', zIndex: 1, maxWidth: '1000px', margin: '0 auto', padding: '0 1.5rem' }}>

        {/* ── Header ── */}
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
            padding: '0.5rem 1.25rem', borderRadius: '999px',
            fontSize: '0.8125rem', fontWeight: 600,
            background: `${colors.primary}15`,
            color: colors.primary,
            marginBottom: '1.25rem',
          }}>
            <IoSparkles style={{ fontSize: '0.75rem' }} />
            Featured posts
          </div>

          <h2 style={{
            fontFamily: "'Sora', sans-serif",
            fontSize: 'clamp(1.75rem, 4vw, 2.75rem)',
            fontWeight: 800,
            lineHeight: 1.2,
            marginBottom: '0.75rem',
          }}>
            Featured{' '}
            <span style={{
              background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary || '#00AFFF'})`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>posts</span>
          </h2>

          <p style={{
            fontSize: '1rem',
            color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.45)',
            maxWidth: '520px',
            margin: '0 auto',
            lineHeight: 1.6,
          }}>
            Explore the latest articles, tutorials, and tech news from our team.
          </p>
        </div>

        {/* ── Blog Cards Grid ── */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '1.5rem',
        }}>
          {posts.map((post, i) => {
            const tags = getTags(post);
            const postPath = getBlogDetailPath(post);

            return (
              <Link
                key={post.id || i}
                to={postPath}
                style={{
                  textDecoration: 'none',
                  color: 'inherit',
                  borderRadius: '1rem',
                  overflow: 'hidden',
                  background: isDark ? 'rgba(255,255,255,0.04)' : '#fff',
                  border: `1px solid ${isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)'}`,
                  display: 'flex', flexDirection: 'column',
                  transition: 'border-color 0.3s, box-shadow 0.3s, transform 0.3s',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = `${colors.primary}30`;
                  e.currentTarget.style.boxShadow = `0 4px 24px ${colors.primary}08`;
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)';
                  e.currentTarget.style.boxShadow = 'none';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                {/* Thumbnail */}
                <div style={{
                  height: '200px',
                  background: post.coverImage
                    ? `url(${resolveAssetUrl(post.coverImage)}) center/cover`
                    : `linear-gradient(135deg, ${colors.primary}40, ${colors.secondary || '#00AFFF'}40)`,
                  position: 'relative',
                }}>
                  {!post.coverImage && (
                    <div style={{
                      position: 'absolute', inset: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: 'rgba(255,255,255,0.2)', fontSize: '3rem', fontFamily: "'Sora', sans-serif", fontWeight: 800,
                    }}>
                      A
                    </div>
                  )}
                </div>

                {/* Content */}
                <div style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', flex: 1 }}>
                  {/* Date */}
                  <div style={{
                    fontSize: '0.75rem',
                    color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)',
                    marginBottom: '0.5rem',
                  }}>
                    {getDate(post)}
                  </div>

                  {/* Title */}
                  <h3 style={{
                    fontFamily: "'Sora', sans-serif",
                    fontSize: '1.0625rem',
                    fontWeight: 700,
                    lineHeight: 1.4,
                    color: isDark ? '#fff' : '#1e293b',
                    marginBottom: '1rem',
                  }}>
                    {post.title}
                  </h3>

                  {/* Author */}
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '0.625rem',
                    marginBottom: '1rem',
                  }}>
                    <div style={{
                      width: '32px', height: '32px',
                      borderRadius: '50%',
                      background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary || '#00AFFF'})`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.75rem', fontWeight: 700, color: '#fff',
                      flexShrink: 0,
                    }}>
                      {getAuthorInitial(post)}
                    </div>
                    <span style={{
                      fontSize: '0.8125rem',
                      fontWeight: 600,
                      color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.7)',
                    }}>
                      {getAuthorName(post)}
                    </span>
                  </div>

                  {/* Tags */}
                  {tags.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: 'auto' }}>
                      {tags.map((tag, ti) => (
                        <span key={ti} style={{
                          padding: '0.3rem 0.75rem',
                          borderRadius: '999px',
                          fontSize: '0.6875rem',
                          fontWeight: 600,
                          background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                          color: isDark ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.55)',
                          border: `1px solid ${isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}`,
                        }}>
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </Link>
            );
          })}
        </div>

        {/* ── View All Button ── */}
        <div style={{ textAlign: 'center', marginTop: '2.5rem' }}>
          <Link
            to="/blog"
            style={{
              display: 'inline-block',
              padding: '0.875rem 2rem',
              borderRadius: '0.75rem',
              fontSize: '0.9375rem',
              fontWeight: 600,
              color: '#fff',
              textDecoration: 'none',
              background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary || '#00AFFF'})`,
              boxShadow: `0 4px 16px ${colors.primary}25`,
              transition: 'transform 0.2s, box-shadow 0.2s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = `0 6px 20px ${colors.primary}35`;
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = `0 4px 16px ${colors.primary}25`;
            }}
          >
            View All Posts
          </Link>
        </div>
      </div>
    </section>
  );
};

export default Blog;
