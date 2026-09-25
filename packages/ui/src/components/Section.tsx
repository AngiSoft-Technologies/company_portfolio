import { type HTMLAttributes, type ReactNode } from 'react';

export interface SectionProps extends HTMLAttributes<HTMLElement> {
  children: ReactNode;
  containerClassName?: string;
}

const Section = ({ className = '', containerClassName = '', children, ...props }: SectionProps) => (
  <section className={`py-16 sm:py-24 ${className}`} {...props}>
    <div className={`mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 ${containerClassName}`}>
      {children}
    </div>
  </section>
);

export default Section;