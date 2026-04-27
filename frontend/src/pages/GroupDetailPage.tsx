import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchEnrollments, fetchGroup } from '@/api/groups';
import { fetchLessons } from '@/api/lessons';
import { fetchUsers } from '@/api/users';
import {
  formatDateTime,
  GROUP_MODE_LABEL,
  GROUP_STATUS_LABEL,
  LESSON_STATUS_LABEL,
  weekdayShort,
} from '@/lib/format';

export function GroupDetailPage() {
  const { id } = useParams<{ id: string }>();
  const group = useQuery({ queryKey: ['group', id], queryFn: () => fetchGroup(id!), enabled: !!id });
  const enrollments = useQuery({
    queryKey: ['enrollments', id],
    queryFn: () => fetchEnrollments(id!),
    enabled: !!id,
  });
  const lessons = useQuery({
    queryKey: ['group-lessons', id],
    queryFn: () => fetchLessons({ group_id: id!, upcoming_only: false }),
    enabled: !!id,
  });
  const users = useQuery({ queryKey: ['users-min'], queryFn: () => fetchUsers({ limit: 200 }) });

  if (group.isLoading) return <div className="text-slate-500">Загрузка…</div>;
  if (group.isError || !group.data) return <div className="text-red-600">Группа не найдена</div>;

  const userById = new Map((users.data ?? []).map((u) => [u.id, u]));
  const studentList = (enrollments.data ?? []).map((e) => userById.get(e.student_id)).filter(Boolean);
  const sortedLessons = (lessons.data ?? []).slice().sort(
    (a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime(),
  );
  const past = sortedLessons.filter((l) => new Date(l.scheduled_at) < new Date());
  const upcoming = sortedLessons.filter((l) => new Date(l.scheduled_at) >= new Date());

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Link to="/groups" className="hover:text-brand-700">Группы</Link>
        <span>›</span>
        <span>Детали</span>
      </div>

      <div className="card">
        <div className="flex items-start justify-between flex-wrap gap-2">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Группа</h1>
            <div className="text-sm text-slate-500">
              {GROUP_MODE_LABEL[group.data.mode]} · старт {group.data.start_date}
              {group.data.end_date && ` – ${group.data.end_date}`}
            </div>
          </div>
          <span className="text-sm font-medium bg-brand-50 text-brand-700 px-3 py-1 rounded">
            {GROUP_STATUS_LABEL[group.data.status]}
          </span>
        </div>

        {group.data.slots.length > 0 && (
          <div className="mt-3 text-sm text-slate-600">
            <span className="font-medium">Расписание:</span>{' '}
            {group.data.slots
              .map(
                (s) =>
                  `${weekdayShort(s.weekday)} ${s.start_time.slice(0, 5)}–${s.end_time.slice(0, 5)}`,
              )
              .join(' · ')}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="card">
          <h2 className="font-semibold text-slate-900 mb-3">
            Студенты ({studentList.length}/{group.data.max_students})
          </h2>
          {studentList.length === 0 ? (
            <div className="text-slate-400 text-sm">Никто не зачислен</div>
          ) : (
            <ul className="text-sm divide-y divide-slate-100">
              {studentList.map(
                (u) =>
                  u && (
                    <li key={u.id} className="py-1.5">
                      {u.full_name}
                    </li>
                  ),
              )}
            </ul>
          )}
        </div>

        <div className="card lg:col-span-2">
          <h2 className="font-semibold text-slate-900 mb-3">
            Уроки ({sortedLessons.length}: {past.length} прошло, {upcoming.length} впереди)
          </h2>
          <div className="space-y-1 max-h-[28rem] overflow-y-auto">
            {sortedLessons.map((l) => (
              <Link
                key={l.id}
                to={`/lessons/${l.id}`}
                className="flex items-center justify-between text-sm py-1.5 px-2 rounded hover:bg-slate-50"
              >
                <span className="font-medium">#{l.sequence} {l.title}</span>
                <span className="text-slate-500 text-xs">
                  {formatDateTime(l.scheduled_at)} · {LESSON_STATUS_LABEL[l.status]}
                </span>
              </Link>
            ))}
            {sortedLessons.length === 0 && (
              <div className="text-slate-400 text-sm">Уроков пока нет</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
