import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiGet } from '../js/httpClient';
import { useTheme } from '../contexts/ThemeContext';
import { ScrollReveal, GlassmorphismCard, ParallaxSection } from '../components/modern';
import { useSiteCopy } from '../hooks/useSiteCopy';
import { FaCalendarAlt, FaUser, FaTags, FaArrowRight } from 'react-icons/fa';

const formatDate = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
};

const toExcerpt = (text, length = 180) => {
  if (!text) return '';
  const cleaned = text
    .replace(/[#>*_`]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (cleaned.length <= length) return cleaned;
  return `${cleaned.slice(0, length).trim()}...`;
};

const BlogList = () => {
  const navigate = useNavigate();
  const { colors, mode } = useTheme();
  const { copy: uiCopy } = useSiteCopy();
  const pageCopy = uiCopy?.pages?.blog || {};
  const homeCopy = uiCopy?.home?.blog || {};
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const data = await apiGet('/blogs');
        const list = Array.isArray(data) ? data : (data?.data || []);
        setPosts(list);
      } catch (err) {
        setError(err.message || 'Failed to load blog posts');
      } finally {
        setLoading(false);
      }
    };
    fetchPosts();
  }, []);

  const visiblePosts = useMemo(() => posts.filter((post) => post.published !== false), [posts]);

  return (
    <div style={{ backgroundColor: colors.background, color: colors.text }} className="min-h-screen">
      <ParallaxSection speed={0.3} className="relative py-28 overflow-hidden">
        <div
          className="absolute inset-0 z-0"
          style={{
            background: `linear-gradient(135deg, ${colors.primary}18 0%, ${colors.secondary}18 50%, ${colors.primaryDark}18 100%)`
          }}
        />
        <div className="relative z-10 max-w-6xl mx-auto px-4 text-center">
          <ScrollReveal animation="fadeUp">
            {pageCopy.badge && (
              <span
                className="inline-block px-6 py-2 rounded-full text-sm font-semibold mb-6"
                style={{
                  backgroundColor: `${colors.primary}20`,
                  color: colors.primary,
                  border: `1px solid ${colors.primary}40`
                }}
              >
                {pageCopy.badge}
              </span>
            )}
          </ScrollReveal>
          <ScrollReveal animation="fadeUp" delay={100}>
            {pageCopy.title && (
              <h1 className="text-4xl md:text-6xl font-bold mb-4" style={{ color: colors.text }}>
                {pageCopy.title}
              </h1>
            )}
          </ScrollReveal>
          <ScrollReveal animation="fadeUp" delay={200}>
            {pageCopy.subtitle && (
              <p className="text-lg md:text-xl max-w-3xl mx-auto" style={{ color: colors.textSecondary }}>
                {pageCopy.subtitle}
              </p>
            )}
          </ScrollReveal>
        </div>
      </ParallaxSection>

      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          {loading && (
            <div className="flex justify-center items-center py-16">
              <div
                className="w-14 h-14 border-4 rounded-full animate-spin"
                style={{ borderColor: `${colors.primary}30`, borderTopColor: colors.primary }}
              />
            </div>
          )}

          {error && (
            <div
              className="text-center p-6 rounded-2xl"
              style={{ backgroundColor: `${colors.danger || '#ef4444'}20`, color: colors.danger || '#ef4444' }}
            >
              {error}
            </div>
          )}

          {!loading && !error && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {visiblePosts.length === 0 ? (
                <GlassmorphismCard className="p-10 text-center">
                  <p style={{ color: colors.textSecondary }}>No blog posts published yet.</p>
                </GlassmorphismCard>
              ) : (
                visiblePosts.map((post, idx) => (
                  <ScrollReveal key={post.id || idx} animation="fadeUp" delay={idx * 100}>
                    <div
                      className="group h-full cursor-pointer"
                      onClick={() => navigate(`/blog/${post.id}`)}
                    >
                      <GlassmorphismCard className="p-8 h-full flex flex-col gap-5 transition-all duration-300 hover:-translate-y-2">
                        <div className="flex items-center justify-between text-sm" style={{ color: colors.textSecondary }}>
                          <div className="flex items-center gap-2">
                            <FaUser />
                            <span>
                              {post.author
                                ? `${post.author.firstName || ''} ${post.author.lastName || ''}`.trim()
                                : 'Team'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <FaCalendarAlt />
                            <span>{formatDate(post.publishedAt || post.createdAt)}</span>
                          </div>
                        </div>
                        <div>
                          <h3 className="text-2xl font-bold mb-3" style={{ color: colors.text }}>
                            {post.title}
                          </h3>
                          <p className="text-sm leading-relaxed" style={{ color: colors.textSecondary }}>
                            {toExcerpt(post.content)}
                          </p>
                        </div>
                        <div className="mt-auto flex items-center justify-between">
                          <div className="flex flex-wrap items-center gap-2">
                            {Array.isArray(post.tags) && post.tags.length > 0 && (
                              <span
                                className="inline-flex items-center gap-2 text-xs px-3 py-1 rounded-full"
                                style={{
                                  backgroundColor: mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
                                  color: colors.textSecondary
                                }}
                              >
                                <FaTags />
                                {post.tags.slice(0, 2).join(', ')}
                              </span>
                            )}
                          </div>
                          {homeCopy.readLabel && (
                            <span className="inline-flex items-center gap-2 font-semibold" style={{ color: colors.primary }}>
                              {homeCopy.readLabel}
                              <FaArrowRight className="text-xs" />
                            </span>
                          )}
                        </div>
                      </GlassmorphismCard>
                    </div>
                  </ScrollReveal>
                ))
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default BlogList;
