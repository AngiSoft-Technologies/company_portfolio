import { type ReactNode, type HTMLAttributes } from 'react';

export interface HeroProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  badge?: string;
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  visual?: ReactNode;
}

const Hero = ({ badge, title, subtitle, actions, visual, className = '', ...props }: HeroProps) => (
  <div className={`relative overflow-hidden ${className}`} {...props}>
    <div className="mx-auto grid w-full max-w-7xl gap-12 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-2 lg:items-center lg:px-8">
      <div className="flex flex-col items-start gap-6">
        {badge ? (
          <span className="inline-flex items-center rounded-full border border-[#00AFFF]/30 px-3 py-1 text-xs font-medium text-[#0875FF]">
            {badge}
          </span>
        ) : null}
        <h1 className="font-display text-4xl font-bold leading-[1.1] tracking-tight text-balance sm:text-5xl">
          {title}
        </h1>
        {subtitle ? <p className="max-w-xl text-lg leading-relaxed text-pretty text-slate-600 dark:text-slate-300">{subtitle}</p> : null}
        {actions ? <div className="flex flex-wrap items-center gap-4">{actions}</div> : null}
      </div>
      {visual ? <div className="relative">{visual}</div> : null}
    </div>
  </div>
);

export default Hero;