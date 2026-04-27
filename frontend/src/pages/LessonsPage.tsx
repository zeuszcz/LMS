import { Link } from 'react-router-dom';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchLessons } from '@/api/lessons';
import { formatDateTime, LESSON_STATUS_LABEL } from '@/lib/format';

export function LessonsPage() {
  const [showPast, setShowPast] = useState(false);
  const lessons = useQuery({
    queryKey: ['lessons', { upcoming_only: !showPast }],
    queryFn: () => fetchLessons({ upcoming_only: !showPast }),
  });

  if (lessons.isLoading) return <div className="text-slate-500">Загрузка…</div>;
  if (lessons.isError) return <div className="text-red-600">Ошибка загрузки</div>;

  const sorted = (lessons.data ?? []).slice().sort(
    (a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime(),
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Уроки</h1>
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input type="checkbox" checked={showPast} onChange={(e) => setShowPast(e.target.checked)} />
          Показать прошедшие
        </label>
      </div>

      <div className="card divide-y divide-slate-100">
        {sorted.length === 0 && <div className="text-slate-500 text-center py-4">Уроков нет</div>}
        {sorted.map((l) => (
          <Link
            key={l.id}
            to={`/lessons/${l.id}`}
            className="flex items-center justify-between py-3 px-1 hover:bg-slate-50"
          >
            <div>
              <div className="font-medium text-slate-900">#{l.sequence} {l.title}</div>
              <div className="text-xs text-slate-500">{formatDateTime(l.scheduled_at)}</div>
            </div>
            <span
              className={
                l.status === 'finished'
                  ? 'text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded'
                  : l.status === 'in_progress'
                  ? 'text-xs bg-brand-100 text-brand-700 px-2 py-0.5 rounded'
                  : 'text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded'
              }
            >
              {LESSON_STATUS_LABEL[l.status]}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
