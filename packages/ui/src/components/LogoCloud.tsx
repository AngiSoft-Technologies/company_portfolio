import { type ReactNode } from 'react';

export interface LogoCloudProps {
  title?: string;
  items: { name: string; logoUrl?: string }[];
}

const LogoCloud = ({ title, items }: LogoCloudProps) => (
  <div className="flex flex-col items-center gap-8 py-12">
    {title ? <p className="text-sm font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">{title}</p> : null}
    <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-6">
      {items.map((item) => (
        <span key={item.name} className="text-lg font-semibold text-slate-400 transition-colors hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300">
          {item.logoUrl ? <img src={item.logoUrl} alt={item.name} className="h-8" loading="lazy" /> : item.name}
        </span>
      ))}
    </div>
  </div>
);

export default LogoCloud;