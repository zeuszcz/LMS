import { useQuery } from '@tanstack/react-query';
import { fetchBranches } from '@/api/branches';

export function BranchesPage() {
  const branches = useQuery({ queryKey: ['branches-page'], queryFn: fetchBranches });

  if (branches.isLoading) return <div className="text-slate-500">Загрузка…</div>;
  if (branches.isError) return <div className="text-red-600">Ошибка загрузки</div>;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-slate-900">Филиалы</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {(branches.data ?? []).map((b) => (
          <div key={b.id} className="card">
            <h3 className="font-semibold text-slate-900">{b.name}</h3>
            <div className="text-sm text-slate-500 mt-1">{b.address}</div>
            <div className="text-sm text-slate-500">{b.city}</div>
            {b.phone && <div className="text-sm text-slate-700 mt-2">{b.phone}</div>}
            <div className="text-xs text-slate-400 mt-2">{b.timezone}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
