import { Star } from 'lucide-react';
import { clsx } from 'clsx';

interface Props {
  value: number;
  max?: number;
  size?: number;
  className?: string;
}

export function Rating({ value, max = 5, size = 14, className }: Props) {
  return (
    <span className={clsx('inline-flex items-center gap-0.5', className)} aria-label={`Рейтинг ${value} из ${max}`}>
      {Array.from({ length: max }).map((_, i) => {
        const filled = i < Math.round(value);
        return (
          <Star
            key={i}
            size={size}
            strokeWidth={1.6}
            className={filled ? 'fill-gold-500 text-gold-500' : 'text-paper-300'}
          />
        );
      })}
    </span>
  );
}
