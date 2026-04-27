import { Link, useParams } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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
import {
  ATTENDANCE_LABEL,
  formatDateTime,
  LESSON_STATUS_LABEL,
} from '@/lib/format';
import type { AttendanceStatus } from '@/types';

const STATUSES: AttendanceStatus[] = ['present', 'late', 'absent', 'excused'];

export function LessonDetailPage() {
  const { id } = useParams<{ id: string }>();
  const user = useAuthStore((s) => s.user)!;
  const qc = useQueryClient();

  const lesson = useQuery({ queryKey: ['lesson', id], queryFn: () => fetchLesson(id!), enabled: !!id });
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

  const isTeacherOfGroup = group.data && user.id === group.data.teacher_id;
  const canEdit =
    user.is_superuser || user.roles.includes('admin') || user.roles.includes('methodist') || isTeacherOfGroup;

  const studentRows = useMemo(() => {
    const userById = new Map((users.data ?? []).map((u) => [u.id, u]));
    return (enrollments.data ?? [])
      .map((e) => ({ id: e.student_id, name: userById.get(e.student_id)?.full_name ?? e.student_id.slice(0, 8) }))
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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['attendance', id] });
    },
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

  if (lesson.isLoading) return <div className="text-slate-500">Загрузка…</div>;
  if (!lesson.data) return <div className="text-red-600">Урок не найден</div>;

  return (
    <div className="space-y-6">
      <div className="text-sm text-slate-500">
        <Link to="/lessons" className="hover:text-brand-700">Уроки</Link> ›{' '}
        <Link to={`/groups/${lesson.data.group_id}`} className="hover:text-brand-700">Группа</Link> › #{lesson.data.sequence}
      </div>

      <div className="card">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              #{lesson.data.sequence} · {lesson.data.title}
            </h1>
            <div className="text-sm text-slate-500 mt-1">
              {formatDateTime(lesson.data.scheduled_at)} · {lesson.data.duration_min} мин ·{' '}
              <span className="font-medium">{LESSON_STATUS_LABEL[lesson.data.status]}</span>
            </div>
          </div>
          {canEdit && lesson.data.status === 'planned' && (
            <button
              onClick={() => start.mutate()}
              disabled={start.isPending}
              className="btn-primary text-sm"
            >
              Начать урок
            </button>
          )}
        </div>
      </div>

      <div className="card">
        <h2 className="font-semibold text-slate-900 mb-3">Журнал посещаемости</h2>
        {studentRows.length === 0 ? (
          <div className="text-slate-500 text-sm">В группе нет студентов</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b border-slate-200">
                <th className="py-2">Студент</th>
                <th className="py-2 w-64">Статус</th>
                <th className="py-2 w-20">Балл</th>
                <th className="py-2">Комментарий</th>
              </tr>
            </thead>
            <tbody>
              {studentRows.map((r) => {
                const d = drafts[r.id];
                if (!d) return null;
                return (
                  <tr key={r.id} className="border-b border-slate-100">
                    <td className="py-2">{r.name}</td>
                    <td className="py-2">
                      <div className="flex gap-1">
                        {STATUSES.map((st) => (
                          <button
                            key={st}
                            type="button"
                            disabled={!canEdit || lesson.data.status === 'finished'}
                            onClick={() => setDrafts({ ...drafts, [r.id]: { ...d, status: st } })}
                            className={
                              d.status === st
                                ? 'px-2 py-0.5 rounded text-xs font-medium bg-brand-600 text-white'
                                : 'px-2 py-0.5 rounded text-xs bg-slate-100 text-slate-700 hover:bg-slate-200'
                            }
                          >
                            {ATTENDANCE_LABEL[st]}
                          </button>
                        ))}
                      </div>
                    </td>
                    <td className="py-2">
                      <input
                        type="number"
                        min={1}
                        max={5}
                        value={d.participation_score ?? ''}
                        disabled={!canEdit || lesson.data.status === 'finished'}
                        onChange={(e) =>
                          setDrafts({
                            ...drafts,
                            [r.id]: {
                              ...d,
                              participation_score: e.target.value ? Number(e.target.value) : null,
                            },
                          })
                        }
                        className="w-14 input py-1 px-2 text-sm"
                      />
                    </td>
                    <td className="py-2">
                      <input
                        type="text"
                        value={d.comment ?? ''}
                        disabled={!canEdit || lesson.data.status === 'finished'}
                        onChange={(e) =>
                          setDrafts({ ...drafts, [r.id]: { ...d, comment: e.target.value } })
                        }
                        className="w-full input py-1 px-2 text-sm"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {canEdit && lesson.data.status !== 'finished' && (
        <div className="card space-y-3">
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1 block">
              Заметка для методиста (опционально)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="input w-full text-sm"
              rows={2}
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => saveAttendance.mutate()}
              disabled={saveAttendance.isPending || studentRows.length === 0}
              className="btn-secondary text-sm"
            >
              {saveAttendance.isPending ? 'Сохранение…' : 'Сохранить посещаемость'}
            </button>
            <button
              type="button"
              onClick={() => close.mutate()}
              disabled={close.isPending || studentRows.length === 0}
              className="btn-primary text-sm"
            >
              {close.isPending ? 'Закрытие…' : 'Закрыть урок'}
            </button>
            {(saveAttendance.isError || close.isError) && (
              <span className="text-xs text-red-600 self-center">
                Ошибка: проверьте, что для всех студентов выставлен статус.
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
