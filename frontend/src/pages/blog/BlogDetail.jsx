import React, { useEffect, useRef } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { useBlogDetail } from '../../hooks/useBlogDetail';
import { resolveBlogImage, BlogImageFallback } from '../../components/blog/blogAssets';
import BlogBreadcrumbs from '../../components/blog/BlogBreadcrumbs';
import BlogArticleHero from '../../components/blog/BlogArticleHero';
import BlogArticleMeta from '../../components/blog/BlogArticleMeta';
import BlogArticleContent from '../../components/blog/BlogArticleContent';
import BlogTableOfContents from '../../components/blog/BlogTableOfContents';
import BlogShareActions from '../../components/blog/BlogShareActions';
import BlogAuthorCard from '../../components/blog/BlogAuthorCard';
import BlogArticleCTA from '../../components/blog/BlogArticleCTA';
import BlogRelatedPosts from '../../components/blog/BlogRelatedPosts';
import BlogPostNavigation from '../../components/blog/BlogPostNavigation';
import BlogDetailSkeleton from '../../components/blog/BlogDetailSkeleton';
import BlogNotFound from '../../components/blog/BlogNotFound';
import BlogErrorState from '../../components/blog/BlogErrorState';
import BlogMediaEmbed from '../../components/blog/BlogMediaEmbed';
import { getContentType } from '../../utils/blog/blogTypes';
import '../../css/blog/blog.css';

// Best-effort service/product link derived ONLY from tags/category.
const deriveCta = (post) => {
  if (!post) return null;
  const cat = post.category?.name?.toLowerCase() || '';
  if (cat.includes('service') || post.tags?.some((t) => /service|app|web|mobile/.test(t))) {
    return { link: '/services', title: 'Need this built?', text: 'See how AngiSoft can deliver it for you.', linkLabel: 'Explore Services' };
  }
  if (cat.includes('product') || post.tags?.some((t) => /product|tool/.test(t))) {
    return { link: '/products', title: 'Discover our products', text: 'Explore the AngiSoft product lineup.', linkLabel: 'Browse Products' };
  }
  return null;
};

const BlogDetail = () => {
  const { mode } = useTheme();
  const { post, relatedPosts, previousPost, nextPost, loading, error, notFound, refetch } = useBlogDetail();
  const contentRef = useRef(null);

  useEffect(() => {
    if (post?.title) document.title = post.seoTitle || `${post.title} — AngiSoft Journal`;
  }, [post]);

  const themeClass = mode === 'light' ? 'blog-detail-page is-light' : 'blog-detail-page is-dark';

  if (loading) return <main className={themeClass}><BlogDetailSkeleton /></main>;
  if (notFound) return <main className={themeClass}><BlogNotFound /></main>;
  if (error) return <main className={themeClass}><BlogErrorState onRetry={refetch} /></main>;
  if (!post) return <main className={themeClass}><BlogNotFound /></main>;

  const image = resolveBlogImage(post.coverImage);
  const cta = deriveCta(post);
  const type = getContentType(post.contentType);

  return (
    <main className={`${themeClass} blog-detail--${type.id}`} aria-label="Article">
      <div className="blog-page-wrap">
        <BlogBreadcrumbs post={post} />

        <BlogArticleHero post={post} />

        <div className="blog-article-type">
          <span className={`blog-type-badge ${type.badge}`}>
            <i className={type.icon} aria-hidden="true" />
            <span>{type.label}</span>
          </span>
          {post.subtitle ? <p className="blog-article-subtitle">{post.subtitle}</p> : null}
        </div>

        <BlogArticleMeta post={post} />

        {image ? (
          <figure className="blog-article-cover">
            <img src={image} alt={post.title} loading="eager" decoding="async" />
          </figure>
        ) : (
          <div className="blog-article-cover"><BlogImageFallback categoryName={post.category?.name} /></div>
        )}

        <BlogMediaEmbed post={post} />

        <div className="blog-reading-layout">
          <div className="blog-reading-main">
            {type.id !== 'code' && type.id !== 'command' ? (
              <BlogArticleContent ref={contentRef} post={post} />
            ) : null}

            <BlogAuthorCard post={post} />

            <BlogArticleCTA
              title={cta?.title}
              text={cta?.text}
              link={cta?.link}
              linkLabel={cta?.linkLabel}
            />

            <BlogRelatedPosts posts={relatedPosts} />

            <BlogPostNavigation previousPost={previousPost} nextPost={nextPost} />

            <section className="blog-section blog-section--cta" aria-label="Final call to action">
              <div className="blog-cta">
                <h2 className="blog-cta__title">Have a project in mind?</h2>
                <p className="blog-cta__text">Let's talk about how AngiSoft can help you build, analyze and grow.</p>
                <a className="blog-btn blog-btn--primary" href="/contact">Contact us</a>
              </div>
            </section>
          </div>

          <aside className="blog-side" aria-label="Article tools">
            <BlogTableOfContents content={post.content} />
            <BlogShareActions post={post} />
          </aside>
        </div>
      </div>
    </main>
  );
};

export default BlogDetail;
