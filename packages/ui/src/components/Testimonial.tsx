import { type ReactNode } from 'react';

export interface TestimonialProps {
  quote: string;
  author: string;
  role?: string;
  company?: string;
  avatarUrl?: string;
}

const Testimonial = ({ quote, author, role, company, avatarUrl }: TestimonialProps) => (
  <figure className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
    <blockquote className="text-base leading-relaxed text-slate-700 text-pretty dark:text-slate-200">
      “{quote}”
    </blockquote>
    <figcaption className="flex items-center gap-3">
      {avatarUrl ? (
        <img src={avatarUrl} alt={author} className="h-10 w-10 rounded-full object-cover" loading="lazy" />
      ) : (
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#0875FF]/10 text-sm font-semibold text-[#0875FF]">
          {author.charAt(0)}
        </div>
      )}
      <div>
        <div className="text-sm font-semibold text-slate-900 dark:text-white">{author}</div>
        {role || company ? (
          <div className="text-sm text-slate-500 dark:text-slate-400">
            {role ? `${role}${company ? ` · ${company}` : ''}` : company}
          </div>
        ) : null}
      </div>
    </figcaption>
  </figure>
);

export default Testimonial;