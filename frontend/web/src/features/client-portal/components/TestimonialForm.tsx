import { useState, type FormEvent } from 'react';
import { portalPost } from '../lib/portalSession';

type SubmitState = 'idle' | 'saving' | 'done' | 'error';

const fieldClass =
  'w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--color-primary)]';

/** Client testimonials are created unconfirmed and moderated by staff. */
export function TestimonialForm() {
  const [text, setText] = useState('');
  const [rating, setRating] = useState(5);
  const [projectType, setProjectType] = useState('');
  const [state, setState] = useState<SubmitState>('idle');
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (text.trim().length < 10) return;
    setState('saving');
    setError(null);
    try {
      await portalPost('/client-portal/testimonials', {
        text: text.trim(),
        rating: Number(rating),
        ...(projectType.trim() ? { projectType: projectType.trim() } : {}),
      });
      setText('');
      setProjectType('');
      setRating(5);
      setState('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not submit your testimonial.');
      setState('error');
    }
  };

  return (
    <form onSubmit={submit} className="space-y-3" aria-busy={state === 'saving'}>
      <label className="block text-sm font-semibold text-[var(--text-secondary)]" htmlFor="testimonial-text">
        Your experience
      </label>
      <textarea
        id="testimonial-text"
        value={text}
        onChange={(event) => {
          setText(event.target.value);
          if (state !== 'saving') setState('idle');
        }}
        rows={4}
        minLength={10}
        maxLength={5000}
        required
        placeholder="Your experience working with AngiSoft…"
        aria-describedby="testimonial-help"
        className={fieldClass}
      />
      <p id="testimonial-help" className="text-xs text-[var(--text-muted)]">
        At least 10 characters. Published only after our team reviews it.
      </p>

      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-xs font-medium text-[var(--text-secondary)]" htmlFor="testimonial-rating">
          Rating
          <select
            id="testimonial-rating"
            value={rating}
            onChange={(event) => setRating(Number(event.target.value))}
            className={fieldClass}
          >
            {[5, 4, 3, 2, 1].map((value) => (
              <option key={value} value={value}>{value} star{value > 1 ? 's' : ''}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-1 flex-col gap-1 text-xs font-medium text-[var(--text-secondary)]" htmlFor="testimonial-project">
          Project type <span className="text-[var(--text-muted)]">(optional)</span>
          <input
            id="testimonial-project"
            value={projectType}
            onChange={(event) => setProjectType(event.target.value)}
            maxLength={100}
            placeholder="e.g. mobile app"
            className={fieldClass}
          />
        </label>
        <button
          type="submit"
          disabled={state === 'saving' || text.trim().length < 10}
          className="rounded-full px-5 py-2 text-sm font-bold text-[var(--color-white)] disabled:opacity-50"
          style={{ background: 'var(--color-primary)' }}
        >
          {state === 'saving' ? 'Submitting…' : 'Submit testimonial'}
        </button>
      </div>

      <div aria-live="polite" className="min-h-5 text-sm">
        {state === 'done' && <span style={{ color: 'var(--color-success)' }}>Thanks — your testimonial was submitted for review.</span>}
        {state === 'error' && <span role="alert" style={{ color: 'var(--color-error)' }}>{error || 'Submission failed — please try again.'}</span>}
      </div>
    </form>
  );
}

export default TestimonialForm;
