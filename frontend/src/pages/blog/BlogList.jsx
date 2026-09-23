import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import { useBlogs } from '../../hooks/useBlogs';
import { useBlogFilters } from '../../hooks/useBlogFilters';
import BlogHero from '../../components/blog/BlogHero';
import BlogFeaturedPost from '../../components/blog/BlogFeaturedPost';
import BlogToolbar from '../../components/blog/BlogToolbar';
import BlogGrid from '../../components/blog/BlogGrid';
import BlogCardSkeleton from '../../components/blog/BlogCardSkeleton';
import BlogEmptyState from '../../components/blog/BlogEmptyState';
import BlogErrorState from '../../components/blog/BlogErrorState';
import BlogPagination from '../../components/blog/BlogPagination';
import '../../css/blog/blog.css';

const BlogList = () => {
  const { mode } = useTheme();
  const { posts, featuredPosts, categories, tags, loading, error, refetch } = useBlogs();
  const filters = useBlogFilters(posts);

  const featured = useMemo(() => {
    const chosen = featuredPosts[0] || posts[0] || null;
    return chosen;
  }, [featuredPosts, posts]);

  // Remaining posts (exclude featured) for the main grid.
  const remaining = useMemo(
    () => filters.filtered.filter((p) => p.id !== (featured && featured.id)),
    [filters.filtered, featured]
  );

  const themeClass = mode === 'light' ? 'blog-list is-light' : 'blog-list is-dark';

  return (
    <main className={themeClass} aria-label="Blog">
      <div className="blog-page-wrap">
        <BlogHero count={posts.length} />

        {loading ? (
          <>
            <div className="blog-section"><BlogCardSkeleton /></div>
            <div className="blog-section blog-grid">
              <BlogCardSkeleton /><BlogCardSkeleton /><BlogCardSkeleton />
            </div>
          </>
        ) : error ? (
          <BlogErrorState onRetry={refetch} />
        ) : posts.length === 0 ? (
          <BlogEmptyState message="No published articles yet. Check back soon." />
        ) : (
          <>
            {featured ? <BlogFeaturedPost post={featured} /> : null}

            <section className="blog-section" aria-label="Filters">
              <BlogToolbar
                categories={categories}
                tags={tags}
                query={filters.search}
                onQueryChange={filters.setSearch}
                selectedCategory={filters.selectedCategory}
                onCategoryChange={filters.setCategory}
                selectedTag={filters.selectedTag}
                onTagChange={filters.setTag}
                totalResults={filters.totalResults}
                hasActiveFilters={filters.hasActiveFilters}
                onClear={filters.clearFilters}
              />
            </section>

            <section className="blog-section" aria-label="Latest articles">
              <h2 className="blog-section__heading">Latest Articles</h2>
              {remaining.length === 0 ? (
                <BlogEmptyState onClear={filters.clearFilters} />
              ) : (
                <>
                  <BlogGrid posts={remaining} />
                  <BlogPagination
                    page={filters.page}
                    totalPages={Math.max(
                      1,
                      Math.ceil(remaining.length / filters.pageSize)
                    )}
                    onPage={filters.setPage}
                  />
                </>
              )}
            </section>

            <section className="blog-section" aria-label="Newsletter">
              <div className="blog-cta">
                <h2 className="blog-cta__title">Level up with the AngiSoft Journal</h2>
                <p className="blog-cta__text">
                  Get engineering guides, product notes and service updates delivered to your inbox.
                </p>
                <Link to="/contact" className="blog-btn blog-btn--primary">Subscribe</Link>
              </div>
            </section>

            <section className="blog-section" aria-label="Discover">
              <div className="blog-discovery">
                <Link to="/services" className="blog-btn">Explore Services</Link>
                <Link to="/products" className="blog-btn">Browse Products</Link>
                <Link to="/about" className="blog-btn">About AngiSoft</Link>
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
};

export default BlogList;
