import { Link } from 'react-router-dom';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowUpRight, CalendarDays } from 'lucide-react';
import { fetchLessons } from '@/api/lessons';
import { PageHeader } from '@/components/ui/PageHeader';
import { LessonStatusPill } from '@/components/ui/StatusPill';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatDateTime } from '@/lib/format';

export function LessonsPage() {
  const [showPast, setShowPast] = useState(false);
  const lessons = useQuery({
    queryKey: ['lessons', { upcoming_only: !showPast }],
    queryFn: () => fetchLessons({ upcoming_only: !showPast }),
  });

  const sorted = (lessons.data ?? [])
    .slice()
    .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime());

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Расписание"
        title="Уроки"
        description="Список запланированных и проведённых уроков."
        actions={
          <label className="inline-flex items-center gap-2 text-xs font-medium text-ink-700 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showPast}
              onChange={(e) => setShowPast(e.target.checked)}
              className="rounded border-paper-300 text-forest-700 focus:ring-forest-700"
            />
            Показать прошедшие
          </label>
        }
      />

      {lessons.isLoading ? (
        <div className="card space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12" />
          ))}
        </div>
      ) : sorted.length === 0 ? (
        <EmptyState
          icon={<CalendarDays size={20} strokeWidth={1.6} />}
          title="Уроков нет"
          description="Когда уроки появятся в расписании, они отобразятся здесь."
        />
      ) : (
        <div className="card-bare divide-y divide-ink-900/5">
          {sorted.map((l) => (
            <Link
              key={l.id}
              to={`/lessons/${l.id}`}
              className="group flex items-center justify-between gap-3 px-5 py-4 hover:bg-paper-100 transition-colors"
            >
              <div className="flex items-center gap-4 min-w-0">
                <span className="font-display text-3xl font-light text-ink-300 num leading-none flex-shrink-0">
                  {String(l.sequence).padStart(2, '0')}
                </span>
                <div className="min-w-0">
                  <div className="font-display text-base font-medium text-ink-900 truncate">
                    {l.title}
                  </div>
                  <div className="text-xs text-ink-500 num">{formatDateTime(l.scheduled_at)}</div>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <LessonStatusPill status={l.status} />
                <ArrowUpRight
                  size={14}
                  className="text-ink-300 group-hover:text-forest-700 transition-colors"
                />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
