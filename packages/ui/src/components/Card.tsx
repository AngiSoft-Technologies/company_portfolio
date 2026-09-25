import { type HTMLAttributes } from 'react';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  hoverable?: boolean;
}

const Card = ({ className = '', hoverable = false, ...props }: CardProps) => (
  <div
    className={`rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800 ${
      hoverable ? 'transition-all duration-200 hover:-translate-y-1 hover:shadow-md' : ''
    } ${className}`}
    {...props}
  />
);

export default Card;