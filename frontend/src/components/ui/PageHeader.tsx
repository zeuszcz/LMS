import { ReactNode } from 'react';
import { clsx } from 'clsx';

interface Props {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

export function PageHeader({ eyebrow, title, description, actions, className }: Props) {
  return (
    <div className={clsx('flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between pb-6 border-b border-ink-900/10', className)}>
      <div className="max-w-2xl">
        {eyebrow && <div className="eyebrow">{eyebrow}</div>}
        <h1 className="font-display text-display-lg font-semibold tracking-tight text-ink-900 text-balance">
          {title}
        </h1>
        {description && (
          <p className="mt-2 text-ink-500 text-sm text-balance leading-relaxed">{description}</p>
        )}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
