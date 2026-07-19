import React, { useMemo } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useBlogs } from '../hooks/useBlogs';
import { useBlogFilters } from '../hooks/useBlogFilters';
import BlogHero from '../components/blog/BlogHero';
import BlogFeaturedPost from '../components/blog/BlogFeaturedPost';
import BlogToolbar from '../components/blog/BlogToolbar';
import BlogGrid from '../components/blog/BlogGrid';
import BlogCardSkeleton from '../components/blog/BlogCardSkeleton';
import BlogEmptyState from '../components/blog/BlogEmptyState';
import BlogErrorState from '../components/blog/BlogErrorState';
import BlogPagination from '../components/blog/BlogPagination';
import '../css/blog/blog-list.css';

const BlogList = () => {
  const { mode } = useTheme();
  const { posts, featuredPosts, categories, tags, loading, error, refetch } = useBlogs();
  const filters = useBlogFilters(posts);

  const featured = useMemo(() => {
    const chosen = featuredPosts[0] || posts[0] || null;
    return chosen;
  }, [featuredPosts, posts]);

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
          <BlogErrorState onRetry={refetch} message={error} />
        ) : (
          <>
            {featured ? (
              <section className="blog-section" aria-label="Featured article">
                <BlogFeaturedPost post={featured} />
              </section>
            ) : null}

            <section className="blog-section" aria-label="Article filters">
              <BlogToolbar
                posts={filters.filtered}
                categories={categories}
                tags={tags}
                search={filters.search}
                selectedCategory={filters.selectedCategory}
                selectedTag={filters.selectedTag}
                setSearch={filters.setSearch}
                setCategory={filters.setCategory}
                setTag={filters.setTag}
                hasActiveFilters={filters.hasActiveFilters}
                onClear={filters.clearFilters}
                totalResults={filters.totalResults}
              />
            </section>

            {remaining.length === 0 ? (
              <BlogEmptyState onClear={filters.clearFilters} />
            ) : (
              <section className="blog-section" aria-label="All articles">
                <BlogGrid posts={remaining} />
                <BlogPagination
                  page={filters.page}
                  totalPages={filters.totalPages}
                  onPage={filters.setPage}
                />
              </section>
            )}
          </>
        )}
      </div>
    </main>
  );
};

export default BlogList;
