import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Building2, MapPin, Pencil, Phone, Plus } from 'lucide-react';
import { fetchBranches } from '@/api/branches';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { EditBranchModal } from '@/components/forms/EditBranchModal';
import { useAuthStore } from '@/stores/authStore';
import type { Branch } from '@/types';

export function BranchesPage() {
  const user = useAuthStore((s) => s.user);
  const isAdmin = !!user && (user.is_superuser || user.roles.includes('admin'));
  const branches = useQuery({ queryKey: ['branches-page'], queryFn: fetchBranches });
  const [editing, setEditing] = useState<Branch | null>(null);
  const [creating, setCreating] = useState(false);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Сеть YES Center"
        title="Филиалы"
        description="Москва, Московская область, Владимирская область — двадцать с лишним школ под одной маркой."
        actions={
          isAdmin ? (
            <button onClick={() => setCreating(true)} className="btn-primary">
              <Plus size={14} strokeWidth={2.5} /> Создать филиал
            </button>
          ) : undefined
        }
      />

      {branches.isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      ) : (branches.data ?? []).length === 0 ? (
        <EmptyState
          icon={<Building2 size={20} strokeWidth={1.6} />}
          title="Филиалов нет"
          description={isAdmin ? 'Создайте первый филиал.' : 'Сеть пока пуста.'}
          action={
            isAdmin ? (
              <button onClick={() => setCreating(true)} className="btn-primary">
                <Plus size={14} strokeWidth={2.5} /> Создать филиал
              </button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(branches.data ?? []).map((b, idx) => (
            <article key={b.id} className="card group hover:border-forest-500 transition-colors relative">
              <div className="flex items-start gap-3">
                <span className="font-display text-2xl font-extrabold text-ink-300 num leading-none flex-shrink-0 mt-1">
                  {String(idx + 1).padStart(2, '0')}
                </span>
                <div className="flex-1 min-w-0">
                  <h3 className="font-display text-lg font-extrabold text-ink-900 leading-tight text-balance">
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
                  <div className="mt-4 pt-3 border-t border-paper-300 flex items-center justify-between">
                    <span className="text-[10px] uppercase tracking-[0.16em] text-ink-400 font-bold">
                      {b.timezone}
                    </span>
                    {isAdmin && (
                      <button
                        onClick={() => setEditing(b)}
                        className="inline-flex items-center gap-1 text-xs font-bold text-forest-700 hover:text-forest-900"
                      >
                        <Pencil size={12} strokeWidth={2.5} /> Редактировать
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {creating && <EditBranchModal open onClose={() => setCreating(false)} branch={null} />}
      {editing && <EditBranchModal open onClose={() => setEditing(null)} branch={editing} />}
    </div>
  );
}
