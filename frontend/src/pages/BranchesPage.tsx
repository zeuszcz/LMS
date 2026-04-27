import { useQuery } from '@tanstack/react-query';
import { Building2, MapPin, Phone } from 'lucide-react';
import { fetchBranches } from '@/api/branches';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';

export function BranchesPage() {
  const branches = useQuery({ queryKey: ['branches-page'], queryFn: fetchBranches });

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Сеть YES Center"
        title="Филиалы"
        description="Москва, Московская область, Владимирская область — двадцать с лишним школ под одной маркой."
      />

      {branches.isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="card space-y-3">
              <Skeleton className="h-5 w-1/2" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-2/3" />
            </div>
          ))}
        </div>
      ) : (branches.data ?? []).length === 0 ? (
        <EmptyState
          icon={<Building2 size={20} strokeWidth={1.6} />}
          title="Филиалов нет"
          description="Создайте первый филиал — это сделает администратор."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(branches.data ?? []).map((b, idx) => (
            <article key={b.id} className="card group hover:border-forest-700 transition-colors">
              <div className="flex items-start gap-3">
                <span className="font-display text-2xl font-light text-ink-300 num leading-none flex-shrink-0 mt-1">
                  {String(idx + 1).padStart(2, '0')}
                </span>
                <div className="flex-1 min-w-0">
                  <h3 className="font-display text-lg font-semibold text-ink-900 leading-tight text-balance">
                    {b.name}
                  </h3>
                  <div className="mt-3 space-y-1.5 text-sm text-ink-600">
                    <div className="flex items-start gap-2">
                      <MapPin size={14} strokeWidth={1.6} className="mt-0.5 text-ink-400 flex-shrink-0" />
                      <span>
                        {b.address}
                        <div className="text-xs text-ink-500">{b.city}</div>
                      </span>
                    </div>
                    {b.phone && (
                      <div className="flex items-center gap-2 num">
                        <Phone size={14} strokeWidth={1.6} className="text-ink-400" />
                        {b.phone}
                      </div>
                    )}
                  </div>
                  <div className="rule mt-4 pt-3 text-[10px] uppercase tracking-[0.2em] text-ink-400 font-semibold">
                    {b.timezone}
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
