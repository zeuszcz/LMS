import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchGroups } from '@/api/groups';
import { fetchCourses } from '@/api/courses';
import { fetchBranches } from '@/api/branches';
import {
  formatDate,
  GROUP_MODE_LABEL,
  GROUP_STATUS_LABEL,
  LANGUAGE_LABEL,
} from '@/lib/format';

export function GroupsPage() {
  const groups = useQuery({ queryKey: ['groups'], queryFn: () => fetchGroups() });
  const courses = useQuery({ queryKey: ['courses-all'], queryFn: () => fetchCourses({ limit: 100, only_published: false }) });
  const branches = useQuery({ queryKey: ['branches-all'], queryFn: fetchBranches });

  if (groups.isLoading) return <div className="text-slate-500">Загрузка…</div>;
  if (groups.isError) return <div className="text-red-600">Ошибка загрузки</div>;

  const courseById = new Map((courses.data?.items ?? []).map((c) => [c.id, c]));
  const branchById = new Map((branches.data ?? []).map((b) => [b.id, b]));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Группы</h1>
        <span className="text-sm text-slate-500">Всего: {groups.data?.length ?? 0}</span>
      </div>

      {(groups.data ?? []).length === 0 ? (
        <div className="card text-center text-slate-500">У вас нет доступных групп.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(groups.data ?? []).map((g) => {
            const course = courseById.get(g.course_id);
            const branch = g.branch_id ? branchById.get(g.branch_id) : undefined;
            return (
              <Link
                key={g.id}
                to={`/groups/${g.id}`}
                className="card hover:shadow-md hover:border-brand-500 transition"
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-slate-900">
                    {course?.title ?? 'Курс'}
                  </h3>
                  <span className="text-xs font-mono bg-brand-50 text-brand-700 px-2 py-0.5 rounded">
                    {course?.level ?? '—'}
                  </span>
                </div>
                <div className="text-sm text-slate-500 mt-1">
                  {course && LANGUAGE_LABEL[course.language]} · {GROUP_MODE_LABEL[g.mode]}
                </div>
                <div className="mt-3 flex items-center justify-between text-xs">
                  <span className="text-slate-600">{branch?.name ?? 'Онлайн'}</span>
                  <span
                    className={
                      g.status === 'active'
                        ? 'text-green-700 bg-green-50 px-2 py-0.5 rounded'
                        : 'text-slate-500 bg-slate-100 px-2 py-0.5 rounded'
                    }
                  >
                    {GROUP_STATUS_LABEL[g.status]}
                  </span>
                </div>
                <div className="mt-2 text-xs text-slate-400">
                  с {formatDate(g.start_date)}
                  {g.end_date && ` до ${formatDate(g.end_date)}`}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
