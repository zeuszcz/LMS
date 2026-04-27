import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowUpRight, Layers } from 'lucide-react';
import { fetchGroups } from '@/api/groups';
import { fetchCourses } from '@/api/courses';
import { fetchBranches } from '@/api/branches';
import { PageHeader } from '@/components/ui/PageHeader';
import { LanguageMark } from '@/components/ui/LanguageMark';
import { GroupStatusPill } from '@/components/ui/StatusPill';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { GROUP_MODE_LABEL, formatDate } from '@/lib/format';

export function GroupsPage() {
  const groups = useQuery({ queryKey: ['groups'], queryFn: () => fetchGroups() });
  const courses = useQuery({
    queryKey: ['courses-all'],
    queryFn: () => fetchCourses({ limit: 100, only_published: false }),
  });
  const branches = useQuery({ queryKey: ['branches-all'], queryFn: fetchBranches });

  const courseById = new Map((courses.data?.items ?? []).map((c) => [c.id, c]));
  const branchById = new Map((branches.data ?? []).map((b) => [b.id, b]));

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Учебные группы"
        title="Группы"
        description={`Активных учебных групп: ${groups.data?.length ?? '—'}.`}
      />

      {groups.isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card space-y-3">
              <Skeleton className="h-9 w-9 rounded" />
              <Skeleton className="h-5 w-2/3" />
              <Skeleton className="h-3 w-full" />
            </div>
          ))}
        </div>
      ) : (groups.data ?? []).length === 0 ? (
        <EmptyState
          icon={<Layers size={20} strokeWidth={1.6} />}
          title="Групп пока нет"
          description="У вас нет доступа к группам или группы ещё не созданы методистом."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(groups.data ?? []).map((g) => {
            const course = courseById.get(g.course_id);
            const branch = g.branch_id ? branchById.get(g.branch_id) : undefined;
            return (
              <Link
                key={g.id}
                to={`/groups/${g.id}`}
                className="card group hover:border-forest-700 transition-colors flex flex-col"
              >
                <div className="flex items-start justify-between gap-3">
                  {course && <LanguageMark language={course.language} size="lg" />}
                  <span className="pill-forest font-mono">{course?.level ?? '—'}</span>
                </div>
                <h3 className="font-display text-base font-semibold text-ink-900 mt-4 leading-tight text-balance">
                  {course?.title ?? 'Курс не определён'}
                </h3>
                <div className="text-xs text-ink-500 mt-1">
                  {branch?.name ?? 'Онлайн-формат'} · {GROUP_MODE_LABEL[g.mode]}
                </div>

                <div className="rule mt-5 pt-3 flex items-center justify-between text-[11px] tracking-tight">
                  <span className="text-ink-500 num">с {formatDate(g.start_date)}</span>
                  <GroupStatusPill status={g.status} />
                </div>
                <div className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-forest-700 group-hover:gap-2 transition-all">
                  Открыть журнал
                  <ArrowUpRight size={12} strokeWidth={2} />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
