import { useState, type ChangeEvent, type FormEvent } from 'react';
import { useCrud, Card, Spinner, EmptyState, PageHeader, Button, Table, Field, inputClass, type CrudConfig } from '@/components';
import { formatDate, truncate, ModalShell, saveJson, SaveStatus } from './shared';

interface Row {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  coverImage: string;
  author: string;
  publishedAt: string;
  createdAt?: string;
  updatedAt?: string;
}

const ENDPOINT = '/blogs';

export function BlogAdmin() {
  const { rows, loading, error, refresh, remove } = useCrud<Row, CrudConfig<Row>>({ endpoint: ENDPOINT });
  const [editing, setEditing] = useState<Row | null>(null);

  const handleDelete = (r: Row) => {
    if (window.confirm(`Delete post "${r.title || r.slug || r.id}"?`)) void remove(String(r.id));
  };

  return (
    <div>
      <PageHeader
        title="Blog Posts"
        subtitle="Create and manage blog posts"
        actions={<Button onClick={() => setEditing({} as Row)}>New Post</Button>}
      />
      {loading ? (
        <Spinner />
      ) : error ? (
        <Card>
          <p className="text-sm text-red-600">{error}</p>
        </Card>
      ) : rows.length === 0 ? (
        <EmptyState />
      ) : (
        <Table<Row>
          rows={rows}
          onEdit={setEditing}
          onDelete={handleDelete}
          columns={[
            { key: 'title', header: 'Title', render: (r) => <span className="font-medium">{truncate(r.title)}</span> },
            { key: 'slug', header: 'Slug', render: (r) => <span className="text-slate-500">{truncate(r.slug, 30)}</span> },
            { key: 'author', header: 'Author' },
            { key: 'publishedAt', header: 'Published', render: (r) => formatDate(r.publishedAt) },
            { key: 'updatedAt', header: 'Updated', render: (r) => formatDate(r.updatedAt ?? r.createdAt) },
          ]}
        />
      )}
      {editing && <BlogFormModal row={editing} onClose={() => setEditing(null)} onSaved={refresh} />}
    </div>
  );
}

function BlogFormModal({ row, onClose, onSaved }: { row: Row; onClose: () => void; onSaved: () => void }) {
  const isEdit = Boolean(row.id);
  const [form, setForm] = useState<Record<string, string>>(() => ({
    title: String(row.title ?? ''),
    slug: String(row.slug ?? ''),
    excerpt: String(row.excerpt ?? ''),
    content: String(row.content ?? ''),
    coverImage: String(row.coverImage ?? ''),
    author: String(row.author ?? ''),
    publishedAt: String(row.publishedAt ?? ''),
  }));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const set = (key: string) => (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      await saveJson(isEdit ? 'PUT' : 'POST', `${ENDPOINT}${isEdit ? `/${row.id}` : ''}`, { ...form });
      setSuccess(true);
      onSaved();
    } catch (err) {
      setError((err as Error).message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell title={`${isEdit ? 'Edit' : 'New'} Blog Post`} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Title">
            <input className={inputClass} value={form.title} onChange={set('title')} required />
          </Field>
          <Field label="Slug">
            <input className={inputClass} value={form.slug} onChange={set('slug')} placeholder="my-blog-post" />
          </Field>
        </div>
        <Field label="Excerpt">
          <textarea className={inputClass} rows={2} value={form.excerpt} onChange={set('excerpt')} />
        </Field>
        <Field label="Content">
          <textarea className={inputClass} rows={6} value={form.content} onChange={set('content')} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Cover Image URL">
            <input className={inputClass} value={form.coverImage} onChange={set('coverImage')} placeholder="https://…" />
          </Field>
          <Field label="Author">
            <input className={inputClass} value={form.author} onChange={set('author')} />
          </Field>
        </div>
        <Field label="Published At (ISO date)">
          <input className={inputClass} value={form.publishedAt} onChange={set('publishedAt')} placeholder="2026-01-01T09:00:00Z" />
        </Field>
        <SaveStatus error={error} success={success} />
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" className={saving ? 'opacity-60' : ''}>
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Post'}
          </Button>
        </div>
      </form>
    </ModalShell>
  );
}

export default BlogAdmin;