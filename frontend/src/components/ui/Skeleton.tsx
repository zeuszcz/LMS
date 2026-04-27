import { clsx } from 'clsx';

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={clsx(
        'animate-pulse rounded bg-paper-200/80',
        className,
      )}
    />
  );
}

export function SkeletonCard({ rows = 3 }: { rows?: number }) {
  return (
    <div className="card space-y-3">
      <Skeleton className="h-3 w-20" />
      <Skeleton className="h-9 w-2/3" />
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-3" />
      ))}
    </div>
  );
}
