import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { apiGet } from '../js/httpClient';
import { useTheme } from '../contexts/ThemeContext';
import { ScrollReveal, GlassmorphismCard, ParallaxSection } from '../components/modern';
import { useSiteCopy } from '../hooks/useSiteCopy';
import { FaArrowLeft, FaCalendarAlt, FaUser, FaTags } from 'react-icons/fa';

const formatDate = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
};

const splitParagraphs = (text) => {
  if (!text) return [];
  return text.split(/\n\n+/).map((line) => line.trim()).filter(Boolean);
};

const BlogDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { colors } = useTheme();
  const { copy: uiCopy } = useSiteCopy();
  const pageCopy = uiCopy?.pages?.blog || {};
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchPost = async () => {
      try {
        const data = await apiGet(`/blogs/${id}`);
        setPost(data || null);
      } catch (err) {
        setError(err.message || 'Failed to load post');
      } finally {
        setLoading(false);
      }
    };
    fetchPost();
  }, [id]);

  const paragraphs = useMemo(() => splitParagraphs(post?.content || ''), [post]);

  return (
    <div style={{ backgroundColor: colors.background, color: colors.text }} className="min-h-screen">
      <ParallaxSection speed={0.25} className="relative py-24 overflow-hidden">
        <div
          className="absolute inset-0 z-0"
          style={{
            background: `linear-gradient(135deg, ${colors.primary}18 0%, ${colors.secondary}18 50%, ${colors.primaryDark}18 100%)`
          }}
        />
        <div className="relative z-10 max-w-4xl mx-auto px-4">
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
            <h1 className="text-3xl md:text-5xl font-bold mb-4" style={{ color: colors.text }}>
              {post?.title || 'Blog Post'}
            </h1>
          </ScrollReveal>
          <ScrollReveal animation="fadeUp" delay={200}>
            <div className="flex flex-wrap items-center gap-4 text-sm" style={{ color: colors.textSecondary }}>
              <span className="inline-flex items-center gap-2">
                <FaUser />
                {post?.author
                  ? `${post.author.firstName || ''} ${post.author.lastName || ''}`.trim()
                  : 'Team'}
              </span>
              <span className="inline-flex items-center gap-2">
                <FaCalendarAlt />
                {formatDate(post?.publishedAt || post?.createdAt)}
              </span>
              {Array.isArray(post?.tags) && post.tags.length > 0 && (
                <span className="inline-flex items-center gap-2">
                  <FaTags />
                  {post.tags.join(', ')}
                </span>
              )}
            </div>
          </ScrollReveal>
        </div>
      </ParallaxSection>

      <section className="py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <button
              type="button"
              onClick={() => navigate('/blog')}
              className="inline-flex items-center gap-2 text-sm font-semibold"
              style={{ color: colors.primary }}
            >
              <FaArrowLeft />
              {pageCopy.ctaLabel || 'View All Articles'}
            </button>
          </div>

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

          {!loading && !error && post && (
            <GlassmorphismCard className="p-8 md:p-10">
              <div className="space-y-6" style={{ color: colors.text }}>
                {paragraphs.length > 0 ? (
                  paragraphs.map((paragraph, idx) => (
                    <p key={idx} className="leading-relaxed" style={{ color: colors.textSecondary }}>
                      {paragraph}
                    </p>
                  ))
                ) : (
                  <p style={{ color: colors.textSecondary }}>No content available for this post.</p>
                )}
              </div>
            </GlassmorphismCard>
          )}
        </div>
      </section>
    </div>
  );
};

export default BlogDetail;
