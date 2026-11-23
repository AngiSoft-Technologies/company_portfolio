import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiFetch } from '@/lib/adminApi';
import { Badge } from '@/lib/Badge';
import { useEffectiveAccess } from '@/lib/permissions';
import { Button, Card, EmptyState, Field, PageHeader, Spinner, inputClass } from '@/components';

/**
 * Portfolio Studio (plan Phase 3.4) — self-service editor for the logged-in
 * employee's public portfolio. Persists theme/layout/section order+visibility
 * plus a free-form draft payload through `/v1/employee-profiles/portfolio-config`.
 * Publishing snapshots the draft server-side (`publishedConfig`) and bumps the
 * version; the public `/staff/:id` payload then exposes it as `portfolioStudio`.
 */

interface SectionState {
  key: string;
  visible: boolean;
  title: string;
}

interface PortfolioConfig {
  id?: string;
  employeeId: string;
  theme: string;
  layout: string;
  sections: SectionState[] | null;
  draftConfig: Record<string, unknown> | null;
  publishedConfig: Record<string, unknown> | null;
  versionHistory?: Array<{
    version: number;
    publishedAt: string;
    theme?: string;
    layout?: string;
    sections?: SectionState[] | null;
    config?: Record<string, unknown> | null;
  }> | null;
  published: boolean;
  version: number;
}

// Mirrors DEFAULT_SECTION_ORDER in frontend/web StaffDetail.tsx — keep in sync.
const SECTION_LABELS: Record<string, string> = {
  about: 'About',
  experience: 'Experience',
  projects: 'Projects',
  featuredWork: 'Featured Work',
  caseStudies: 'Case Studies',
  cv: 'CV / Resume',
  services: 'Services',
  skills: 'Skills',
  education: 'Education',
  certifications: 'Certifications',
  achievements: 'Achievements',
  articles: 'Articles',
  documents: 'Documents',
  testimonials: 'Testimonials',
  contact: 'Contact',
};

const DEFAULT_SECTIONS: SectionState[] = Object.keys(SECTION_LABELS).map((key) => ({
  key,
  visible: true,
  title: '',
}));

const THEMES = [
  { value: 'default', label: 'Default (brand)' },
  { value: 'dark', label: 'Dark' },
  { value: 'light', label: 'Light' },
];

const LAYOUTS = [
  { value: 'standard', label: 'Standard' },
  { value: 'compact', label: 'Compact' },
  { value: 'spotlight', label: 'Spotlight' },
];

const WEB_ORIGIN =
  (import.meta.env.VITE_WEB_URL as string | undefined) ?? 'https://angisoft.co.ke';

function toSectionState(raw: unknown): SectionState[] {
  if (!Array.isArray(raw)) return DEFAULT_SECTIONS;
  const byKey = new Map(
    (raw as Array<Record<string, unknown>>)
      .filter((s) => typeof s?.key === 'string')
      .map((s) => [
        s.key as string,
        {
          key: s.key as string,
          visible: s.visible !== false,
          title: typeof s.title === 'string' ? s.title : '',
        },
      ]),
  );
  const ordered = (raw as Array<Record<string, unknown>>)
    .map((s) => s.key as string)
    .filter((k) => SECTION_LABELS[k]);
  const rest = Object.keys(SECTION_LABELS).filter((k) => !ordered.includes(k));
  return [...ordered, ...rest].map(
    (k) => byKey.get(k) ?? { key: k, visible: true, title: '' },
  );
}

export function PortfolioStudio() {
  const { access, loading: accessLoading } = useEffectiveAccess();
  const employeeId = access?.employeeId;

  const [config, setConfig] = useState<PortfolioConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [theme, setTheme] = useState('default');
  const [layout, setLayout] = useState('standard');
  const [sections, setSections] = useState<SectionState[]>(DEFAULT_SECTIONS);
  const [draftJson, setDraftJson] = useState('{}');

  const load = useCallback(async () => {
    if (!employeeId) return;
    setLoading(true);
    setError(null);
    try {
      const row = (await apiFetch(`/v1/employee-profiles/portfolio-config/${employeeId}`)) as PortfolioConfig | null;
      setConfig(row);
      if (row) {
        setTheme(row.theme || 'default');
        setLayout(row.layout || 'standard');
        setSections(toSectionState(row.sections));
        setDraftJson(JSON.stringify(row.draftConfig ?? {}, null, 2));
      }
    } catch (e) {
      setError((e as Error).message || 'Failed to load portfolio config');
    } finally {
      setLoading(false);
    }
  }, [employeeId]);

  useEffect(() => {
    void load();
  }, [load]);

  const dirty = useMemo(() => {
    if (!config) return true;
    return (
      theme !== (config.theme || 'default') ||
      layout !== (config.layout || 'standard') ||
      JSON.stringify(sections) !== JSON.stringify(toSectionState(config.sections)) ||
      draftJson !== JSON.stringify(config.draftConfig ?? {}, null, 2)
    );
  }, [config, theme, layout, sections, draftJson]);

  const draftObj = useMemo<Record<string, unknown>>(() => {
    try {
      const parsed = JSON.parse(draftJson || '{}');
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch {
      return {};
    }
  }, [draftJson]);

  const testimonials = useMemo(
    () => (Array.isArray(draftObj.testimonials) ? (draftObj.testimonials as Array<Record<string, string>>) : []),
    [draftObj],
  );

  const setTestimonials = (next: Array<Record<string, string>>) => {
    setDraftJson(JSON.stringify({ ...draftObj, testimonials: next }, null, 2));
  };

  const updateTestimonial = (i: number, patch: Record<string, string>) => {
    setTestimonials(testimonials.map((t, j) => (j === i ? { ...t, ...patch } : t)));
  };

  const featuredWork = useMemo(
    () => (Array.isArray(draftObj.featuredWork) ? (draftObj.featuredWork as Array<Record<string, unknown>>) : []),
    [draftObj],
  );

  const setFeaturedWork = (next: Array<Record<string, unknown>>) => {
    setDraftJson(JSON.stringify({ ...draftObj, featuredWork: next }, null, 2));
  };

  const updateFeaturedWork = (i: number, patch: Record<string, unknown>) => {
    setFeaturedWork(featuredWork.map((t, j) => (j === i ? { ...t, ...patch } : t)));
  };

  const featuredWorkTags = (item: Record<string, unknown>) =>
    Array.isArray(item.tags) ? (item.tags as string[]).join(', ') : String(item.tags ?? '');

  const caseStudies = useMemo(
    () => (Array.isArray(draftObj.caseStudies) ? (draftObj.caseStudies as Array<Record<string, unknown>>) : []),
    [draftObj],
  );

  const setCaseStudies = (next: Array<Record<string, unknown>>) => {
    setDraftJson(JSON.stringify({ ...draftObj, caseStudies: next }, null, 2));
  };

  const updateCaseStudy = (i: number, patch: Record<string, unknown>) => {
    setCaseStudies(caseStudies.map((t, j) => (j === i ? { ...t, ...patch } : t)));
  };

  const certifications = useMemo(
    () => (Array.isArray(draftObj.certifications) ? (draftObj.certifications as Array<Record<string, unknown>>) : []),
    [draftObj],
  );

  const setCertifications = (next: Array<Record<string, unknown>>) => {
    setDraftJson(JSON.stringify({ ...draftObj, certifications: next }, null, 2));
  };

  const updateCertification = (i: number, patch: Record<string, unknown>) => {
    setCertifications(certifications.map((t, j) => (j === i ? { ...t, ...patch } : t)));
  };

  const restoreVersion = (v: NonNullable<PortfolioConfig['versionHistory']>[number]) => {
    if (v.theme) setTheme(v.theme);
    if (v.layout) setLayout(v.layout);
    if (Array.isArray(v.sections) && v.sections.length > 0) {
      setSections(
        v.sections.map((s) => ({
          key: s.key,
          visible: s.visible !== false,
          title: s.title ?? '',
        })),
      );
    }
    setDraftJson(JSON.stringify(v.config ?? {}, null, 2));
    setNotice(`Loaded v${v.version} into the draft — save, then publish to make it live.`);
  };

  const parseDraft = (): Record<string, unknown> | null => {
    try {
      const parsed = JSON.parse(draftJson || '{}');
      if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
        setError('Draft config must be a JSON object');
        return null;
      }
      return parsed as Record<string, unknown>;
    } catch {
      setError('Draft config is not valid JSON');
      return null;
    }
  };

  const save = async () => {
    if (!employeeId) return;
    const draftConfig = parseDraft();
    if (draftConfig === null) return;
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const saved = (await apiFetch(`/v1/employee-profiles/portfolio-config/${employeeId}`, {
        method: 'PUT',
        body: {
          theme,
          layout,
          sections: sections.map((s) => ({ key: s.key, visible: s.visible, title: s.title || null })),
          draftConfig,
        },
      })) as PortfolioConfig;
      setConfig(saved);
      setNotice('Draft saved.');
    } catch (e) {
      setError((e as Error).message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const publish = async () => {
    if (!employeeId) return;
    setPublishing(true);
    setError(null);
    setNotice(null);
    try {
      const saved = (await apiFetch(`/v1/employee-profiles/portfolio-config/${employeeId}/publish`, {
        method: 'POST',
      })) as PortfolioConfig;
      setConfig(saved);
      setNotice(`Published as version ${saved.version}.`);
    } catch (e) {
      setError((e as Error).message || 'Failed to publish');
    } finally {
      setPublishing(false);
    }
  };

  const unpublish = async () => {
    if (!employeeId) return;
    setPublishing(true);
    setError(null);
    setNotice(null);
    try {
      const saved = (await apiFetch(`/v1/employee-profiles/portfolio-config/${employeeId}/unpublish`, {
        method: 'POST',
      })) as PortfolioConfig;
      setConfig(saved);
      setNotice('Portfolio unpublished.');
    } catch (e) {
      setError((e as Error).message || 'Failed to unpublish');
    } finally {
      setPublishing(false);
    }
  };

  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const move = (index: number, delta: -1 | 1) => {
    setSections((prev) => {
      const next = [...prev];
      const target = index + delta;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const dropOn = (target: number) => {
    if (dragIndex === null || dragIndex === target) {
      setDragIndex(null);
      return;
    }
    setSections((prev) => {
      const next = [...prev];
      const [moved] = next.splice(dragIndex, 1);
      next.splice(target, 0, moved);
      return next;
    });
    setDragIndex(null);
  };

  const publicUrl = `${WEB_ORIGIN}/staff/${employeeId ?? ''}`;

  if (accessLoading || loading) {
    return (
      <div>
        <PageHeader title="Portfolio Studio" subtitle="Design and publish your public portfolio" />
        <Card><Spinner /></Card>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Portfolio Studio"
        subtitle={
          config?.published
            ? `Published · v${config.version}`
            : 'Draft — not visible on your public profile yet'
        }
        actions={
          <>
            {config?.published ? <Badge tone="green">Live</Badge> : <Badge tone="slate">Draft</Badge>}
            <a href={publicUrl} target="_blank" rel="noreferrer" className="text-sm text-[var(--color-primary)] hover:underline">
              View public profile ↗
            </a>
          </>
        }
      />

      {error ? <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}
      {notice ? <div className="mb-4 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">{notice}</div> : null}

      {!config && !dirty ? (
        <Card>
          <EmptyState title="No portfolio config yet — fill the form below and save to create one" />
        </Card>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <h2 className="mb-4 text-base font-semibold">Sections</h2>
          <p className="mb-4 text-xs text-[var(--text-muted)]">
            Drag rows or use the arrows to reorder. Custom titles replace the default section heading on your public page.
          </p>
          <ul className="divide-y divide-[var(--border-light)]">
            {sections.map((s, i) => (
              <li
                key={s.key}
                draggable
                onDragStart={() => setDragIndex(i)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => dropOn(i)}
                onDragEnd={() => setDragIndex(null)}
                className={`flex cursor-grab items-center gap-3 py-2.5 active:cursor-grabbing ${dragIndex === i ? 'opacity-50' : ''}`}
              >
                <div className="flex flex-col">
                  <button
                    type="button"
                    aria-label={`Move ${SECTION_LABELS[s.key]} up`}
                    disabled={i === 0}
                    onClick={() => move(i, -1)}
                    className="px-1 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] disabled:opacity-30"
                  >
                    ▲
                  </button>
                  <button
                    type="button"
                    aria-label={`Move ${SECTION_LABELS[s.key]} down`}
                    disabled={i === sections.length - 1}
                    onClick={() => move(i, 1)}
                    className="px-1 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] disabled:opacity-30"
                  >
                    ▼
                  </button>
                </div>
                <label className="flex min-w-0 flex-1 items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={s.visible}
                    onChange={(e) =>
                      setSections((prev) => prev.map((p, j) => (j === i ? { ...p, visible: e.target.checked } : p)))
                    }
                    className="h-4 w-4 accent-[var(--color-primary)]"
                  />
                  <span className="w-32 shrink-0 font-medium">{SECTION_LABELS[s.key]}</span>
                  <input
                    type="text"
                    value={s.title}
                    placeholder={SECTION_LABELS[s.key]}
                    onChange={(e) =>
                      setSections((prev) => prev.map((p, j) => (j === i ? { ...p, title: e.target.value } : p)))
                    }
                    className={`${inputClass} !py-1 text-xs`}
                  />
                </label>
              </li>
            ))}
          </ul>
        </Card>

        <div className="space-y-4">
          <Card>
            <h2 className="mb-4 text-base font-semibold">Appearance</h2>
            <div className="space-y-4">
              <Field label="Theme">
                <select value={theme} onChange={(e) => setTheme(e.target.value)} className={inputClass}>
                  {THEMES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </Field>
              <Field label="Layout">
                <select value={layout} onChange={(e) => setLayout(e.target.value)} className={inputClass}>
                  {LAYOUTS.map((l) => (
                    <option key={l.value} value={l.value}>{l.label}</option>
                  ))}
                </select>
              </Field>
            </div>
          </Card>

          <Card>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-semibold">Live preview</h2>
              <Badge tone={theme === 'light' ? 'green' : 'slate'}>{theme === 'light' ? 'Light' : 'Dark'} · {layout}</Badge>
            </div>
            <div
              className={`max-h-96 overflow-y-auto rounded-xl border p-3 ${
                theme === 'light'
                  ? 'border-[var(--border)] bg-[var(--bg-secondary)] text-[var(--text-primary)]'
                  : 'border-[var(--border-light)] bg-[var(--bg-primary)] text-[var(--text-primary)]'
              }`}
            >
              {sections
                .filter((s) => s.visible)
                .map((s, i) => (
                  <div key={s.key} className="mb-2 rounded-lg border border-[var(--border-light)] bg-[var(--card-bg)] p-3 last:mb-0">
                    <div className="mb-1 text-[10px] uppercase tracking-widest opacity-50">{String(i + 1).padStart(2, '0')}</div>
                    <div className="text-sm font-semibold">{s.title?.trim() || SECTION_LABELS[s.key]}</div>
                    <div className="mt-1 space-y-1">
                      <div className="h-1.5 w-3/4 rounded bg-[var(--border-light)]" />
                      <div className="h-1.5 w-1/2 rounded bg-[var(--border-light)]" />
                    </div>
                  </div>
                ))}
              {sections.every((s) => !s.visible) ? (
                <p className="text-xs opacity-60">All sections hidden — nothing renders publicly.</p>
              ) : null}
            </div>
            <p className="mt-2 text-[11px] text-[var(--text-muted)]">
              Wireframe of section order, titles and theme — publish to see real content on your public profile.
            </p>
          </Card>

          <Card>
            <h2 className="mb-4 text-base font-semibold">Content blocks (draft)</h2>

            <div className="mb-4">
              <Field label="CV / resume URL">
                <input
                  value={String(draftObj.cvUrl ?? '')}
                  onChange={(e) => setDraftJson(JSON.stringify({ ...draftObj, cvUrl: e.target.value }, null, 2))}
                  placeholder="https://…/cv.pdf — shown when the CV / Resume section is enabled"
                  className={inputClass}
                />
              </Field>
            </div>

            <div className="mb-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-medium text-[var(--text-secondary)]">Testimonials</span>
                <Button
                  variant="outline"
                  className="!px-3 !py-1 text-xs"
                  onClick={() => setTestimonials([...testimonials, { quote: '', author: '', role: '' }])}
                >
                  + Add
                </Button>
              </div>
              {testimonials.length === 0 ? (
                <p className="text-xs text-[var(--text-muted)]">No testimonials — shown on your public page when the Testimonials section is enabled.</p>
              ) : (
                <ul className="space-y-3">
                  {testimonials.map((t, i) => (
                    <li key={i} className="rounded-lg border border-[var(--border)] p-3">
                      <textarea
                        value={t.quote ?? ''}
                        onChange={(e) => updateTestimonial(i, { quote: e.target.value })}
                        rows={2}
                        placeholder="Quote…"
                        className={`${inputClass} mb-2 text-xs`}
                      />
                      <div className="flex gap-2">
                        <input
                          value={t.author ?? ''}
                          onChange={(e) => updateTestimonial(i, { author: e.target.value })}
                          placeholder="Author"
                          className={`${inputClass} flex-1 !py-1 text-xs`}
                        />
                        <input
                          value={t.role ?? ''}
                          onChange={(e) => updateTestimonial(i, { role: e.target.value })}
                          placeholder="Role / company"
                          className={`${inputClass} flex-1 !py-1 text-xs`}
                        />
                        <Button variant="ghost" className="!px-2 text-xs" onClick={() => setTestimonials(testimonials.filter((_, j) => j !== i))}>
                          ✕
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="mb-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-medium text-[var(--text-secondary)]">Featured work</span>
                <Button
                  variant="outline"
                  className="!px-3 !py-1 text-xs"
                  onClick={() => setFeaturedWork([...featuredWork, { title: '', client: '', summary: '', url: '', tags: [] }])}
                >
                  + Add
                </Button>
              </div>
              {featuredWork.length === 0 ? (
                <p className="text-xs text-[var(--text-muted)]">No featured work — curated case cards shown on your public page when the Featured Work section is enabled.</p>
              ) : (
                <ul className="space-y-3">
                  {featuredWork.map((item, i) => (
                    <li key={i} className="rounded-lg border border-[var(--border)] p-3">
                      <input
                        value={String(item.title ?? '')}
                        onChange={(e) => updateFeaturedWork(i, { title: e.target.value })}
                        placeholder="Title"
                        className={`${inputClass} mb-2 text-xs`}
                      />
                      <div className="mb-2 flex gap-2">
                        <input
                          value={String(item.client ?? '')}
                          onChange={(e) => updateFeaturedWork(i, { client: e.target.value })}
                          placeholder="Client"
                          className={`${inputClass} flex-1 !py-1 text-xs`}
                        />
                        <input
                          value={String(item.url ?? '')}
                          onChange={(e) => updateFeaturedWork(i, { url: e.target.value })}
                          placeholder="Link (optional)"
                          className={`${inputClass} flex-1 !py-1 text-xs`}
                        />
                      </div>
                      <textarea
                        value={String(item.summary ?? '')}
                        onChange={(e) => updateFeaturedWork(i, { summary: e.target.value })}
                        rows={2}
                        placeholder="Summary…"
                        className={`${inputClass} mb-2 text-xs`}
                      />
                      <div className="flex gap-2">
                        <input
                          value={featuredWorkTags(item)}
                          onChange={(e) =>
                            updateFeaturedWork(i, {
                              tags: e.target.value.split(',').map((t) => t.trim()).filter(Boolean),
                            })
                          }
                          placeholder="Tags (comma-separated)"
                          className={`${inputClass} flex-1 !py-1 text-xs`}
                        />
                        <Button variant="ghost" className="!px-2 text-xs" onClick={() => setFeaturedWork(featuredWork.filter((_, j) => j !== i))}>
                          ✕
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="mb-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-medium text-[var(--text-secondary)]">Case studies</span>
                <Button
                  variant="outline"
                  className="!px-3 !py-1 text-xs"
                  onClick={() => setCaseStudies([...caseStudies, { title: '', client: '', url: '', challenge: '', approach: '', outcome: '' }])}
                >
                  + Add
                </Button>
              </div>
              {caseStudies.length === 0 ? (
                <p className="text-xs text-[var(--text-muted)]">No case studies — challenge/approach/outcome write-ups shown when the Case Studies section is enabled.</p>
              ) : (
                <ul className="space-y-3">
                  {caseStudies.map((item, i) => (
                    <li key={i} className="rounded-lg border border-[var(--border)] p-3">
                      <input
                        value={String(item.title ?? '')}
                        onChange={(e) => updateCaseStudy(i, { title: e.target.value })}
                        placeholder="Title"
                        className={`${inputClass} mb-2 text-xs`}
                      />
                      <div className="mb-2 flex gap-2">
                        <input
                          value={String(item.client ?? '')}
                          onChange={(e) => updateCaseStudy(i, { client: e.target.value })}
                          placeholder="Client"
                          className={`${inputClass} flex-1 !py-1 text-xs`}
                        />
                        <input
                          value={String(item.url ?? '')}
                          onChange={(e) => updateCaseStudy(i, { url: e.target.value })}
                          placeholder="Link (optional)"
                          className={`${inputClass} flex-1 !py-1 text-xs`}
                        />
                      </div>
                      {(['challenge', 'approach', 'outcome'] as const).map((field) => (
                        <textarea
                          key={field}
                          value={String(item[field] ?? '')}
                          onChange={(e) => updateCaseStudy(i, { [field]: e.target.value })}
                          rows={2}
                          placeholder={`${field[0].toUpperCase()}${field.slice(1)}…`}
                          className={`${inputClass} mb-2 text-xs`}
                        />
                      ))}
                      <div className="flex justify-end">
                        <Button variant="ghost" className="!px-2 text-xs" onClick={() => setCaseStudies(caseStudies.filter((_, j) => j !== i))}>
                          ✕ Remove
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="mb-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-medium text-[var(--text-secondary)]">Certifications override</span>
                <Button
                  variant="outline"
                  className="!px-3 !py-1 text-xs"
                  onClick={() => setCertifications([...certifications, { title: '', issuer: '', issuedAt: '', credentialUrl: '' }])}
                >
                  + Add
                </Button>
              </div>
              {certifications.length === 0 ? (
                <p className="text-xs text-[var(--text-muted)]">Empty — your profile certifications are used. Add entries here to override them on the public page.</p>
              ) : (
                <ul className="space-y-3">
                  {certifications.map((item, i) => (
                    <li key={i} className="rounded-lg border border-[var(--border)] p-3">
                      <div className="mb-2 grid grid-cols-2 gap-2">
                        <input
                          value={String(item.title ?? '')}
                          onChange={(e) => updateCertification(i, { title: e.target.value })}
                          placeholder="Title"
                          className={`${inputClass} !py-1 text-xs`}
                        />
                        <input
                          value={String(item.issuer ?? '')}
                          onChange={(e) => updateCertification(i, { issuer: e.target.value })}
                          placeholder="Issuer"
                          className={`${inputClass} !py-1 text-xs`}
                        />
                      </div>
                      <div className="flex gap-2">
                        <input
                          value={String(item.issuedAt ?? '')}
                          onChange={(e) => updateCertification(i, { issuedAt: e.target.value })}
                          placeholder="Issued (YYYY-MM-DD)"
                          className={`${inputClass} flex-1 !py-1 text-xs`}
                        />
                        <input
                          value={String(item.credentialUrl ?? '')}
                          onChange={(e) => updateCertification(i, { credentialUrl: e.target.value })}
                          placeholder="Verify URL (optional)"
                          className={`${inputClass} flex-1 !py-1 text-xs`}
                        />
                        <Button variant="ghost" className="!px-2 text-xs" onClick={() => setCertifications(certifications.filter((_, j) => j !== i))}>
                          ✕
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <Field label="draftConfig JSON (advanced)">
              <textarea
                value={draftJson}
                onChange={(e) => setDraftJson(e.target.value)}
                rows={10}
                spellCheck={false}
                className={`${inputClass} font-mono text-xs`}
              />
            </Field>
            <p className="mt-2 text-xs text-[var(--text-muted)]">
              Free-form payload consumed by the public portfolio renderer (featured work, case studies, testimonials).
            </p>
          </Card>

          {Array.isArray(config?.versionHistory) && config.versionHistory.length > 0 ? (
            <Card>
              <h2 className="mb-3 text-base font-semibold">Version history</h2>
              <ul className="space-y-1.5 text-xs text-[var(--text-muted)]">
                {config.versionHistory.toReversed().map((v) => (
                  <li key={v.version} className="flex items-center justify-between gap-2">
                    <span>
                      v{v.version}
                      <span className="ml-2">{v.publishedAt ? new Date(v.publishedAt).toLocaleString() : '—'}</span>
                    </span>
                    <Button variant="ghost" className="!px-2 !py-0.5 text-xs" onClick={() => restoreVersion(v)}>
                      Restore
                    </Button>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}

          <Card>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => void save()} disabled={saving || publishing}>
                {saving ? 'Saving…' : 'Save draft'}
              </Button>
              <Button variant="outline" onClick={() => void publish()} disabled={saving || publishing || !dirty && !!config?.published}>
                {publishing ? 'Working…' : config?.published ? 'Republish' : 'Publish'}
              </Button>
              {config?.published ? (
                <Button variant="danger" onClick={() => void unpublish()} disabled={saving || publishing}>
                  Unpublish
                </Button>
              ) : null}
            </div>
            {dirty ? <p className="mt-2 text-xs text-[var(--text-muted)]">Unsaved changes.</p> : null}
          </Card>
        </div>
      </div>
    </div>
  );
}

export default PortfolioStudio;
