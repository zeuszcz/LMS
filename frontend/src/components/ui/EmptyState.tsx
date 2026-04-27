import { ReactNode } from 'react';
import { clsx } from 'clsx';

interface Props {
  icon?: ReactNode;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: Props) {
  return (
    <div
      className={clsx(
        'card flex flex-col items-center justify-center text-center py-12',
        className,
      )}
    >
      {icon && (
        <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-paper-200 text-ink-500">
          {icon}
        </div>
      )}
      <h3 className="font-display text-display-md text-ink-900">{title}</h3>
      {description && (
        <p className="mt-2 max-w-sm text-sm text-ink-500 text-balance">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
