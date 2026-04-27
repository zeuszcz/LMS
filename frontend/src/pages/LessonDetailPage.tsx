import { Link, useParams } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ClipboardCheck, Lock, Play, Save } from 'lucide-react';
import {
  AttendanceInput,
  closeLesson,
  fetchAttendance,
  fetchLesson,
  recordAttendance,
  startLesson,
} from '@/api/lessons';
import { fetchEnrollments, fetchGroup } from '@/api/groups';
import { fetchUsers } from '@/api/users';
import { useAuthStore } from '@/stores/authStore';
import { LessonStatusPill } from '@/components/ui/StatusPill';
import { Skeleton } from '@/components/ui/Skeleton';
import {
  ATTENDANCE_LABEL,
  formatDateTime,
} from '@/lib/format';
import type { AttendanceStatus } from '@/types';

const STATUSES: AttendanceStatus[] = ['present', 'late', 'absent', 'excused'];
const SCORES: number[] = [1, 2, 3, 4, 5];

const STATUS_TONE: Record<AttendanceStatus, string> = {
  present: 'bg-sage-500 text-paper-50 border-sage-700',
  late: 'bg-gold-500 text-ink-900 border-gold-700',
  absent: 'bg-terra-500 text-paper-50 border-terra-700',
  excused: 'bg-ink-700 text-paper-50 border-ink-900',
};

export function LessonDetailPage() {
  const { id } = useParams<{ id: string }>();
  const user = useAuthStore((s) => s.user);
  const qc = useQueryClient();

  const lesson = useQuery({
    queryKey: ['lesson', id],
    queryFn: () => fetchLesson(id!),
    enabled: !!id,
  });
  const group = useQuery({
    queryKey: ['group', lesson.data?.group_id],
    queryFn: () => fetchGroup(lesson.data!.group_id),
    enabled: !!lesson.data?.group_id,
  });
  const enrollments = useQuery({
    queryKey: ['enrollments', lesson.data?.group_id],
    queryFn: () => fetchEnrollments(lesson.data!.group_id),
    enabled: !!lesson.data?.group_id,
  });
  const attendance = useQuery({
    queryKey: ['attendance', id],
    queryFn: () => fetchAttendance(id!),
    enabled: !!id,
  });
  const users = useQuery({ queryKey: ['users-min'], queryFn: () => fetchUsers({ limit: 200 }) });

  const isTeacherOfGroup = !!user && group.data && user.id === group.data.teacher_id;
  const canEdit =
    !!user &&
    (user.is_superuser ||
      user.roles.includes('admin') ||
      user.roles.includes('methodist') ||
      !!isTeacherOfGroup);

  const studentRows = useMemo(() => {
    const userById = new Map((users.data ?? []).map((u) => [u.id, u]));
    return (enrollments.data ?? [])
      .map((e) => ({
        id: e.student_id,
        name: userById.get(e.student_id)?.full_name ?? e.student_id.slice(0, 8),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [enrollments.data, users.data]);

  const [drafts, setDrafts] = useState<Record<string, AttendanceInput>>({});
  const [notes, setNotes] = useState('');

  useEffect(() => {
    const next: Record<string, AttendanceInput> = {};
    for (const r of studentRows) {
      const existing = (attendance.data ?? []).find((a) => a.student_id === r.id);
      next[r.id] = existing
        ? {
            student_id: r.id,
            status: existing.status,
            participation_score: existing.participation_score,
            comment: existing.comment,
          }
        : { student_id: r.id, status: 'present', participation_score: null, comment: null };
    }
    setDrafts(next);
  }, [studentRows.length, attendance.data]);

  const saveAttendance = useMutation({
    mutationFn: () => recordAttendance(id!, Object.values(drafts)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['attendance', id] }),
  });
  const start = useMutation({
    mutationFn: () => startLesson(id!),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['lesson', id] }),
  });
  const close = useMutation({
    mutationFn: () => closeLesson(id!, Object.values(drafts), notes || undefined),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['lesson', id] });
      qc.invalidateQueries({ queryKey: ['attendance', id] });
    },
  });

  if (lesson.isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-10 w-2/3" />
      </div>
    );
  }
  if (!lesson.data) return <div className="text-terra-700">Урок не найден</div>;

  const isFinished = lesson.data.status === 'finished';
  const counts = Object.values(drafts).reduce<Record<AttendanceStatus, number>>(
    (acc, d) => ({ ...acc, [d.status]: (acc[d.status] ?? 0) + 1 }),
    { present: 0, late: 0, absent: 0, excused: 0 },
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.18em] text-ink-500 font-semibold">
        <Link to="/lessons" className="hover:text-forest-700 inline-flex items-center gap-1">
          <ArrowLeft size={12} strokeWidth={2} /> Уроки
        </Link>
        <span className="text-ink-300">/</span>
        <Link to={`/groups/${lesson.data.group_id}`} className="hover:text-forest-700">
          Группа
        </Link>
        <span className="text-ink-300">/</span>
        <span className="text-ink-900">#{lesson.data.sequence}</span>
      </div>

      {/* Hero */}
      <div className="border-b border-ink-900/10 pb-6 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div className="flex items-start gap-5">
          <span className="font-display text-display-xl font-light text-ink-300 num leading-none">
            {String(lesson.data.sequence).padStart(2, '0')}
          </span>
          <div>
            <div className="eyebrow">Урок</div>
            <h1 className="font-display text-display-lg font-semibold text-ink-900 leading-[1.05] text-balance">
              {lesson.data.title}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-ink-500">
              <span className="num">{formatDateTime(lesson.data.scheduled_at)}</span>
              <span>·</span>
              <span className="num">{lesson.data.duration_min} мин</span>
              <span>·</span>
              <LessonStatusPill status={lesson.data.status} />
            </div>
          </div>
        </div>

        {canEdit && lesson.data.status === 'planned' && (
          <button
            onClick={() => start.mutate()}
            disabled={start.isPending}
            className="btn-gold"
          >
            <Play size={14} strokeWidth={2} fill="currentColor" /> Начать урок
          </button>
        )}
      </div>

      {/* Attendance summary */}
      {!isFinished && studentRows.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <SummaryTile label="Был" count={counts.present} accent="sage" />
          <SummaryTile label="Опоздал" count={counts.late} accent="gold" />
          <SummaryTile label="Отсутств." count={counts.absent} accent="terra" />
          <SummaryTile label="Уваж." count={counts.excused} accent="ink" />
        </div>
      )}

      {/* Journal */}
      <div className="card-bare overflow-hidden">
        <div className="px-5 py-3 border-b border-ink-900/10 bg-paper-100 flex items-center justify-between">
          <div className="flex items-center gap-2 eyebrow">
            <ClipboardCheck size={12} strokeWidth={1.6} />
            Журнал · {studentRows.length} студ.
          </div>
          {isFinished && (
            <div className="inline-flex items-center gap-1 text-[11px] text-ink-500">
              <Lock size={11} strokeWidth={1.6} /> закрыт
            </div>
          )}
        </div>

        {studentRows.length === 0 ? (
          <div className="text-sm text-ink-500 px-5 py-8 text-center">
            В группе нет студентов
          </div>
        ) : (
          <div className="divide-y divide-ink-900/5">
            {studentRows.map((r, idx) => {
              const d = drafts[r.id];
              if (!d) return null;
              const disabled = !canEdit || isFinished;
              return (
                <div
                  key={r.id}
                  className="grid grid-cols-12 items-center gap-3 px-5 py-3 hover:bg-paper-100/60 transition-colors"
                >
                  <div className="col-span-12 md:col-span-3 flex items-center gap-3 min-w-0">
                    <span className="font-display text-xs text-ink-300 num w-6 flex-shrink-0">
                      {String(idx + 1).padStart(2, '0')}
                    </span>
                    <span className="text-sm text-ink-900 font-medium truncate">{r.name}</span>
                  </div>

                  <div className="col-span-12 md:col-span-5 flex flex-wrap gap-1">
                    {STATUSES.map((st) => {
                      const active = d.status === st;
                      return (
                        <button
                          key={st}
                          type="button"
                          disabled={disabled}
                          onClick={() => setDrafts({ ...drafts, [r.id]: { ...d, status: st } })}
                          className={
                            active
                              ? `inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded border ${STATUS_TONE[st]}`
                              : 'inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded border border-paper-300 bg-paper-50 text-ink-600 hover:border-ink-700 hover:text-ink-900 transition-colors disabled:opacity-50'
                          }
                        >
                          {ATTENDANCE_LABEL[st]}
                        </button>
                      );
                    })}
                  </div>

                  <div className="col-span-4 md:col-span-2 flex gap-0.5">
                    {SCORES.map((s) => {
                      const on = d.participation_score === s;
                      return (
                        <button
                          key={s}
                          type="button"
                          disabled={disabled}
                          onClick={() =>
                            setDrafts({
                              ...drafts,
                              [r.id]: { ...d, participation_score: on ? null : s },
                            })
                          }
                          className={
                            on
                              ? 'h-7 w-7 rounded text-xs font-display font-medium bg-forest-700 text-paper-50 num'
                              : 'h-7 w-7 rounded text-xs font-display text-ink-500 hover:bg-paper-200 hover:text-ink-900 num disabled:opacity-50'
                          }
                          title={`Балл участия ${s}`}
                        >
                          {s}
                        </button>
                      );
                    })}
                  </div>

                  <div className="col-span-8 md:col-span-2">
                    <input
                      type="text"
                      value={d.comment ?? ''}
                      disabled={disabled}
                      onChange={(e) =>
                        setDrafts({ ...drafts, [r.id]: { ...d, comment: e.target.value } })
                      }
                      placeholder="заметка…"
                      className="input py-1 px-2 text-xs"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Actions */}
      {canEdit && !isFinished && (
        <div className="card space-y-3">
          <div>
            <div className="eyebrow">Заметка для методиста</div>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="input w-full text-sm"
              rows={2}
              placeholder="Опционально: что хотелось бы передать методисту?"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => saveAttendance.mutate()}
              disabled={saveAttendance.isPending || studentRows.length === 0}
              className="btn-secondary text-sm"
            >
              <Save size={14} strokeWidth={1.6} />
              {saveAttendance.isPending ? 'Сохранение…' : 'Сохранить посещаемость'}
            </button>
            <button
              type="button"
              onClick={() => close.mutate()}
              disabled={close.isPending || studentRows.length === 0}
              className="btn-primary text-sm"
            >
              <Lock size={14} strokeWidth={1.6} />
              {close.isPending ? 'Закрытие…' : 'Закрыть урок'}
            </button>
            {(saveAttendance.isError || close.isError) && (
              <span className="text-xs text-terra-700 self-center">
                Ошибка: проверьте, что для всех студентов выставлен статус.
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryTile({
  label,
  count,
  accent,
}: {
  label: string;
  count: number;
  accent: 'sage' | 'gold' | 'terra' | 'ink';
}) {
  const tone =
    accent === 'sage'
      ? 'text-sage-700'
      : accent === 'gold'
      ? 'text-gold-700'
      : accent === 'terra'
      ? 'text-terra-500'
      : 'text-ink-700';
  return (
    <div className="card-flat py-3 px-4 flex items-baseline justify-between">
      <span className="text-[11px] uppercase tracking-[0.18em] text-ink-500 font-semibold">{label}</span>
      <span className={`font-display text-2xl font-medium num ${tone}`}>{count}</span>
    </div>
  );
}
