import { Link, useParams } from 'react-router-dom';
import { Button, Section } from '@angisoft/ui';
import { fetchBlogBySlug } from '@/hooks/data/useBlog';
import { formatDate } from '@/lib/format';
import { useAsync } from '@/hooks/useAsync';

export default function BlogDetail() {
  const { slug = '' } = useParams<{ slug: string }>();
  const post = useAsync(() => fetchBlogBySlug(slug), [slug]);

  if (post.loading) {
    return <div className="animate-spin h-8 w-8 border-4 border-[#0875FF] border-t-transparent rounded-full mx-auto my-20" />;
  }

  if (post.error || !post.data) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-24 text-center">
        <div className="text-6xl font-black text-[var(--border)]">404</div>
        <h1 className="mt-4 text-2xl font-bold text-[var(--text-primary)]">Post not found</h1>
        <p className="mt-3 text-[var(--text-muted)]">The article you're looking for doesn't exist or was removed.</p>
        <div className="mt-8 flex justify-center">
          <Link to="/blog">
            <Button variant="outline">Back to blog</Button>
          </Link>
        </div>
      </div>
    );
  }

  const p = post.data;
  const paragraphs = (p.content ?? '').split(/\n+/).filter((line) => line.trim().length > 0);

  return (
    <Section className="py-12">
      <article className="mx-auto max-w-3xl">
        <Link to="/blog" className="text-sm font-medium text-[#0875FF] hover:underline">
          ← All posts
        </Link>
        <h1 className="mt-6 text-4xl font-bold tracking-tight text-[var(--text-primary)]">{p.title}</h1>
        <div className="mt-4 flex items-center gap-3 text-sm text-[var(--text-muted)]">
          <span className="font-medium text-[var(--text-secondary)]">{p.author ?? 'AngiSoft Team'}</span>
          <span>·</span>
          <span>{formatDate(p.publishedAt)}</span>
        </div>
        {p.tags && p.tags.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {p.tags.map((tag) => (
              <span key={tag} className="rounded-full bg-[#0875FF]/10 px-3 py-1 text-xs font-medium text-[#0875FF]">
                {tag}
              </span>
            ))}
          </div>
        ) : null}
        {p.coverImage ? (
          <img src={p.coverImage} alt={p.title} className="mt-8 h-72 w-full rounded-2xl border border-[var(--border)] object-cover" />
        ) : null}
        <div className="mt-8 flex flex-col gap-5">
          {paragraphs.length > 0 ? (
            paragraphs.map((para, i) => (
              <p key={i} className="text-base leading-relaxed text-[var(--text-secondary)]">
                {para}
              </p>
            ))
          ) : (
            <p className="text-base leading-relaxed text-[var(--text-secondary)]">{p.excerpt}</p>
          )}
        </div>
      </article>
    </Section>
  );
}