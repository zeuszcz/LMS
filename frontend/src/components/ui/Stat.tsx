import { clsx } from 'clsx';
import { ReactNode } from 'react';

interface StatProps {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  accent?: 'ink' | 'forest' | 'gold' | 'terra' | 'sage';
  size?: 'md' | 'lg';
  className?: string;
}

const ACCENT: Record<NonNullable<StatProps['accent']>, string> = {
  ink: 'text-ink-900',
  forest: 'text-forest-700',
  gold: 'text-gold-700',
  terra: 'text-terra-500',
  sage: 'text-sage-700',
};

export function Stat({
  label,
  value,
  hint,
  accent = 'ink',
  size = 'md',
  className,
}: StatProps) {
  return (
    <div className={clsx('card-flat group relative overflow-hidden', className)}>
      <div className="eyebrow">{label}</div>
      <div
        className={clsx(
          'font-display font-medium tracking-tight num',
          size === 'lg' ? 'text-display-xl' : 'text-display-md',
          ACCENT[accent],
        )}
      >
        {value}
      </div>
      {hint && <div className="mt-1 text-xs text-ink-500">{hint}</div>}
    </div>
  );
}
