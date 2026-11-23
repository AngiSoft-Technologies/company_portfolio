import { useEffect, useState, type FormEvent } from 'react';
import { Button, Card, Field, PageHeader, Spinner, inputClass } from '@/components';
import { apiFetch } from '@/lib/adminApi';
import { SaveStatus, saveJson } from './shared';

/**
 * Editor for the structured copy served by the public `GET /v1/legal/:key`.
 *
 * Sections are edited as JSON rather than HTML: the public pages render them
 * as React text nodes, so no sanitizer or `dangerouslySetInnerHTML` is needed.
 * Writes go through the whitelisted `/v1/site/legal-*` settings endpoints,
 * which are ADMIN-only and validated with the same schema as the public read.
 */

type LegalKey = 'privacy' | 'terms';
type Source = 'cms' | 'fallback';

interface LegalDocument {
  key: LegalKey;
  titleLead: string;
  titleAccent: string;
  summary: string;
  sections: unknown;
  source: Source;
}

interface EditorState {
  titleLead: string;
  titleAccent: string;
  summary: string;
  sections: string;
  source: Source;
}

const DOCUMENTS: { key: LegalKey; label: string; endpoint: string }[] = [
  { key: 'privacy', label: 'Privacy Policy', endpoint: '/site/legal-privacy' },
  { key: 'terms', label: 'Terms & Conditions', endpoint: '/site/legal-terms' },
];

const toEditor = (doc: LegalDocument): EditorState => ({
  titleLead: doc.titleLead ?? '',
  titleAccent: doc.titleAccent ?? '',
  summary: doc.summary ?? '',
  sections: JSON.stringify(doc.sections ?? [], null, 2),
  source: doc.source,
});

const isText = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;

/** Mirrors the backend `storedDocumentSchema` for inline feedback before save. */
function parseSections(raw: string): unknown[] {
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    throw new Error('Sections must be valid JSON.');
  }
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error('Sections must be a non-empty array.');
  }
  for (const section of value) {
    if (!section || typeof section !== 'object') throw new Error('Every section must be an object.');
    const { id, title, navTitle, blocks } = section as Record<string, unknown>;
    if (!isText(id) || !isText(title)) throw new Error('Every section needs a non-empty id and title.');
    if (navTitle !== undefined && !isText(navTitle)) throw new Error(`Section "${id}" has an invalid navTitle.`);
    if (!Array.isArray(blocks) || blocks.length === 0) throw new Error(`Section "${id}" needs at least one block.`);
    for (const block of blocks) {
      if (!block || typeof block !== 'object') throw new Error(`Section "${id}" has an invalid block.`);
      const typed = block as Record<string, unknown>;
      if (typed.type === 'paragraph' || typed.type === 'heading') {
        if (!isText(typed.text)) throw new Error(`Section "${id}" has a ${typed.type} block without text.`);
      } else if (typed.type === 'list') {
        if (!Array.isArray(typed.items) || typed.items.length === 0 ||
            typed.items.some((item) => !item || typeof item !== 'object' || !isText((item as Record<string, unknown>).text))) {
          throw new Error(`Section "${id}" has a list block with invalid items.`);
        }
      } else if (typed.type === 'contact') {
        if (!isText(typed.title) || !Array.isArray(typed.lines) || typed.lines.some((line) => !isText(line))) {
          throw new Error(`Section "${id}" has an invalid contact block.`);
        }
      } else {
        throw new Error(`Section "${id}" has an unsupported block type.`);
      }
    }
  }
  return value;
}

export function LegalContentAdmin() {
  const [active, setActive] = useState<LegalKey>('privacy');
  const [editors, setEditors] = useState<Partial<Record<LegalKey, EditorState>>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [privacy, terms] = await Promise.all([
          apiFetch('/legal/privacy') as Promise<LegalDocument>,
          apiFetch('/legal/terms') as Promise<LegalDocument>,
        ]);
        if (!cancelled) setEditors({ privacy: toEditor(privacy), terms: toEditor(terms) });
      } catch (err) {
        if (!cancelled) setError((err as Error).message || 'Could not load legal copy.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const config = DOCUMENTS.find((item) => item.key === active)!;
  const editor = editors[active];

  const setField = (field: keyof Omit<EditorState, 'source'>) => (event: { target: { value: string } }) => {
    setEditors((current) => ({
      ...current,
      [active]: { ...current[active]!, [field]: event.target.value },
    }));
  };

  const reload = async () => {
    const refreshed = await apiFetch(`/legal/${config.key}`) as LegalDocument;
    setEditors((current) => ({ ...current, [config.key]: toEditor(refreshed) }));
  };

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (!editor) return;
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      const sections = parseSections(editor.sections);
      await saveJson('PUT', config.endpoint, {
        titleLead: editor.titleLead,
        titleAccent: editor.titleAccent,
        summary: editor.summary,
        sections,
      });
      await reload();
      setSuccess(true);
    } catch (err) {
      setError((err as Error).message || 'Save failed.');
    } finally {
      setSaving(false);
    }
  };

  const reset = async () => {
    if (!window.confirm(`Remove the CMS override for ${config.label} and use the checked-in copy?`)) return;
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      await saveJson('PUT', config.endpoint, {});
      await reload();
      setSuccess(true);
    } catch (err) {
      setError((err as Error).message || 'Reset failed.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Legal Pages"
        subtitle="Structured privacy and terms copy for the public website"
      />
      <div className="mb-4 flex flex-wrap gap-2" role="tablist" aria-label="Legal document">
        {DOCUMENTS.map((item) => (
          <button
            key={item.key}
            type="button"
            role="tab"
            aria-selected={active === item.key}
            onClick={() => { setActive(item.key); setError(null); setSuccess(false); }}
            className={`rounded-lg px-3 py-2 text-sm font-medium ${
              active === item.key
                ? 'bg-[var(--surface-hover)] text-[var(--text)]'
                : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>
      {loading || !editor ? (
        <Spinner />
      ) : (
        <Card>
          <form onSubmit={save} className="space-y-4">
            <p className="text-xs text-[var(--text-muted)]">
              Showing the {editor.source === 'cms' ? 'CMS override' : 'checked-in fallback'}. Saving any field
              creates an override; omitted fields keep their fallback values.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Title (leading)">
                <input className={inputClass} value={editor.titleLead} onChange={setField('titleLead')} required />
              </Field>
              <Field label="Title (accent)">
                <input className={inputClass} value={editor.titleAccent} onChange={setField('titleAccent')} required />
              </Field>
            </div>
            <Field label="Summary">
              <textarea className={inputClass} rows={3} value={editor.summary} onChange={setField('summary')} required />
            </Field>
            <Field label="Sections (JSON)">
              <textarea
                className={`${inputClass} font-mono text-xs`}
                rows={18}
                value={editor.sections}
                onChange={setField('sections')}
                aria-describedby="legal-sections-help"
                required
              />
            </Field>
            <p id="legal-sections-help" className="text-xs text-[var(--text-muted)]">
              Each section has an <code>id</code>, <code>title</code>, optional <code>navTitle</code> and
              <code> blocks</code> of type <code>paragraph</code>, <code>heading</code>, <code>list</code> or
              <code> contact</code>. HTML is not supported or stored.
            </p>
            <SaveStatus error={error} success={success} />
            <div className="flex flex-wrap justify-end gap-3 pt-2">
              <Button type="button" variant="ghost" onClick={() => void reset()} disabled={saving}>
                Use checked-in copy
              </Button>
              <Button type="submit" disabled={saving} className={saving ? 'opacity-60' : ''}>
                {saving ? 'Saving…' : 'Save Legal Copy'}
              </Button>
            </div>
          </form>
        </Card>
      )}
    </div>
  );
}

export default LegalContentAdmin;
