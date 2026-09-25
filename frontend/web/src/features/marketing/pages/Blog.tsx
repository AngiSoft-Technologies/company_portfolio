import { Link } from 'react-router-dom';
import { Card, Hero, Section } from '@angisoft/ui';
import { fetchBlogs } from '@/hooks/data/useBlog';
import { formatDate } from '@/lib/format';
import { useAsync } from '@/hooks/useAsync';

export default function Blog() {
  const blog = useAsync(() => fetchBlogs({}), []);

  return (
    <>
      <Hero
        badge="Blog"
        title="Ideas, insights and how-tos from the studio"
        subtitle="Notes on building software for African business — from the trenches."
      />

      <Section>
        {blog.loading ? (
          <div className="animate-spin h-8 w-8 border-4 border-[#0875FF] border-t-transparent rounded-full mx-auto my-20" />
        ) : null}
        {!blog.loading && (!blog.data || blog.data.length === 0) ? (
          <div className="rounded-2xl border border-dashed border-[var(--border)] py-12 text-center text-sm text-[var(--text-muted)]">
            No posts yet — check back soon.
          </div>
        ) : null}
        {!blog.loading && blog.data ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {blog.data.map((post) => (
              <Link key={post.id} to={`/blog/${post.slug}`}>
                <Card hoverable className="h-full overflow-hidden">
                  {post.coverImage ? (
                    <img src={post.coverImage} alt={post.title} className="h-44 w-full object-cover" loading="lazy" />
                  ) : (
                    <div className="flex h-44 w-full items-center justify-center bg-[var(--surface-hover)] text-2xl text-[var(--text-muted)]">
                      {post.title.charAt(0)}
                    </div>
                  )}
                  <div className="p-6">
                    <h3 className="text-lg font-semibold text-[var(--text-primary)]">{post.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-[var(--text-muted)]">{post.excerpt}</p>
                    <div className="mt-4 flex items-center justify-between text-xs text-[var(--text-muted)]">
                      <span className="font-medium">{post.author ?? 'AngiSoft Team'}</span>
                      <span>{formatDate(post.publishedAt)}</span>
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        ) : null}
      </Section>
    </>
  );
}