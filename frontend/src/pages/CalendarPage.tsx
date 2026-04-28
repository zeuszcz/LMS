import { useMemo, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, GripVertical, RotateCcw } from 'lucide-react';
import { fetchLessons, patchLesson } from '@/api/lessons';
import { PageHeader } from '@/components/ui/PageHeader';
import { LessonStatusPill } from '@/components/ui/StatusPill';
import { Skeleton } from '@/components/ui/Skeleton';
import { toast } from '@/components/ui/Toast';
import { formatTime } from '@/lib/format';
import type { Lesson } from '@/types';

const HOURS = Array.from({ length: 15 }, (_, i) => i + 8); // 08:00 → 22:00
const HOUR_PX = 56;
const SLOT_MIN = 15;
const SLOT_PX = (HOUR_PX / 60) * SLOT_MIN;

function startOfWeek(d: Date): Date {
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  const dayIdx = (out.getDay() + 6) % 7; // Mon=0
  out.setDate(out.getDate() - dayIdx);
  return out;
}

function addDays(d: Date, n: number): Date {
  const out = new Date(d);
  out.setDate(out.getDate() + n);
  return out;
}

function fmtDayLabel(d: Date): string {
  return d.toLocaleDateString('ru-RU', { weekday: 'short', day: '2-digit', month: 'short' });
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function snapMinutes(min: number): number {
  return Math.round(min / SLOT_MIN) * SLOT_MIN;
}

interface DragState {
  lessonId: string;
  durationMin: number;
  origIso: string;
}

export function CalendarPage() {
  const qc = useQueryClient();
  const [anchor, setAnchor] = useState<Date>(() => startOfWeek(new Date()));
  const dragRef = useRef<DragState | null>(null);

  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(anchor, i)),
    [anchor],
  );
  const weekStart = days[0];
  const weekEnd = addDays(days[6], 1);

  const lessons = useQuery({
    queryKey: ['lessons', 'all'],
    queryFn: () => fetchLessons({ upcoming_only: false }),
    staleTime: 30_000,
  });

  const visible = useMemo(() => {
    if (!lessons.data) return [];
    return lessons.data.filter((l) => {
      const t = new Date(l.scheduled_at);
      return t >= weekStart && t < weekEnd;
    });
  }, [lessons.data, weekStart, weekEnd]);

  const move = useMutation({
    mutationFn: ({ id, scheduled_at }: { id: string; scheduled_at: string }) =>
      patchLesson(id, { scheduled_at }),
    onMutate: async ({ id, scheduled_at }) => {
      await qc.cancelQueries({ queryKey: ['lessons'] });
      const prev = qc.getQueryData<Lesson[]>(['lessons', 'all']);
      qc.setQueryData<Lesson[]>(['lessons', 'all'], (old) =>
        old?.map((l) => (l.id === id ? { ...l, scheduled_at } : l)),
      );
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(['lessons', 'all'], ctx.prev);
      toast('error', 'Не удалось перенести урок');
    },
    onSuccess: () => {
      toast('success', 'Урок перенесён');
      qc.invalidateQueries({ queryKey: ['lessons'] });
    },
  });

  const onDragStart = (e: React.DragEvent, lesson: Lesson) => {
    dragRef.current = {
      lessonId: lesson.id,
      durationMin: lesson.duration_min,
      origIso: lesson.scheduled_at,
    };
    e.dataTransfer.effectAllowed = 'move';
    try {
      e.dataTransfer.setData('text/plain', lesson.id);
    } catch {
      // some browsers throw on dataTransfer in unusual contexts
    }
  };

  const onDayDrop = (e: React.DragEvent, day: Date) => {
    e.preventDefault();
    const drag = dragRef.current;
    dragRef.current = null;
    if (!drag) return;

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const offsetY = e.clientY - rect.top;
    const minutesFromStart = Math.max(
      0,
      Math.min(snapMinutes((offsetY / HOUR_PX) * 60), (HOURS.length - 1) * 60),
    );
    const newStart = new Date(day);
    newStart.setHours(HOURS[0], 0, 0, 0);
    newStart.setMinutes(newStart.getMinutes() + minutesFromStart);

    if (newStart.toISOString() === drag.origIso) return;
    move.mutate({ id: drag.lessonId, scheduled_at: newStart.toISOString() });
  };

  const today = new Date();

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Расписание"
        title="Календарь"
        description="Перетащите урок, чтобы перенести его на новое время. Шаг — 15 минут."
        actions={
          <div className="inline-flex items-center gap-1 rounded-2xl border border-paper-300 bg-paper-50 p-1">
            <button
              type="button"
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-ink-700 hover:bg-paper-200"
              onClick={() => setAnchor((d) => addDays(d, -7))}
              aria-label="Предыдущая неделя"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              type="button"
              className="inline-flex h-9 items-center gap-1.5 rounded-xl px-3 text-xs font-semibold uppercase tracking-[0.14em] text-ink-700 hover:bg-paper-200"
              onClick={() => setAnchor(startOfWeek(new Date()))}
            >
              <RotateCcw size={13} />
              Эта неделя
            </button>
            <button
              type="button"
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-ink-700 hover:bg-paper-200"
              onClick={() => setAnchor((d) => addDays(d, 7))}
              aria-label="Следующая неделя"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        }
      />

      {lessons.isLoading ? (
        <Skeleton className="h-[60vh]" />
      ) : (
        <div className="card-bare overflow-hidden">
          <div className="grid grid-cols-[64px_repeat(7,minmax(0,1fr))] border-b border-paper-300 bg-paper-50/60">
            <div />
            {days.map((d) => {
              const today_ = isSameDay(d, today);
              return (
                <div
                  key={d.toISOString()}
                  className={
                    'px-3 py-3 text-center text-xs font-semibold uppercase tracking-[0.14em] ' +
                    (today_ ? 'text-forest-700' : 'text-ink-500')
                  }
                >
                  {fmtDayLabel(d)}
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-[64px_repeat(7,minmax(0,1fr))] relative">
            <div className="border-r border-paper-300">
              {HOURS.map((h) => (
                <div
                  key={h}
                  style={{ height: HOUR_PX }}
                  className="px-2 pt-1 text-[11px] num font-medium text-ink-400 border-b border-paper-200"
                >
                  {String(h).padStart(2, '0')}:00
                </div>
              ))}
            </div>

            {days.map((day) => {
              const dayLessons = visible.filter((l) =>
                isSameDay(new Date(l.scheduled_at), day),
              );
              return (
                <div
                  key={day.toISOString()}
                  className="relative border-r border-paper-200 last:border-r-0"
                  style={{ height: HOUR_PX * HOURS.length }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                  }}
                  onDrop={(e) => onDayDrop(e, day)}
                >
                  {HOURS.map((h, i) => (
                    <div
                      key={h}
                      style={{ top: i * HOUR_PX, height: HOUR_PX }}
                      className="absolute inset-x-0 border-b border-paper-200"
                    />
                  ))}

                  {dayLessons.map((l) => {
                    const t = new Date(l.scheduled_at);
                    const minutes =
                      (t.getHours() - HOURS[0]) * 60 + t.getMinutes();
                    const top = Math.max(0, (minutes / 60) * HOUR_PX);
                    const height = Math.max(
                      SLOT_PX,
                      (l.duration_min / 60) * HOUR_PX - 2,
                    );
                    const draggable = l.status !== 'finished' && l.status !== 'cancelled';
                    return (
                      <Link
                        key={l.id}
                        to={`/lessons/${l.id}`}
                        draggable={draggable}
                        onDragStart={(e) => draggable && onDragStart(e, l)}
                        style={{ top, height }}
                        className={
                          'group absolute left-1 right-1 overflow-hidden rounded-xl border bg-paper-50 px-2.5 py-1.5 shadow-sm transition ' +
                          (draggable
                            ? 'cursor-grab active:cursor-grabbing border-forest-700/30 hover:shadow-pop hover:border-forest-700/60'
                            : 'cursor-default border-paper-300 opacity-70')
                        }
                      >
                        <div className="flex items-start gap-1">
                          {draggable && (
                            <GripVertical
                              size={11}
                              className="mt-0.5 flex-shrink-0 text-ink-300 group-hover:text-ink-500"
                            />
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="text-[11px] num font-semibold text-ink-700">
                              {formatTime(l.scheduled_at)} · {l.duration_min}м
                            </div>
                            <div className="truncate text-xs font-medium text-ink-900">
                              {l.title}
                            </div>
                            <div className="mt-0.5">
                              <LessonStatusPill status={l.status} />
                            </div>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
