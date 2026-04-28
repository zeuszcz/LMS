import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowRightLeft, GraduationCap, Trash2, UserPlus } from 'lucide-react';
import { api } from '@/api/client';
import { Modal } from '@/components/ui/Modal';
import { toast } from '@/components/ui/Toast';
import { fetchUsers } from '@/api/users';
import { fetchEnrollments, fetchGroups } from '@/api/groups';
import { fetchCourses } from '@/api/courses';
import type { Group, GroupDetail, UserOut } from '@/types';

interface Props {
  open: boolean;
  onClose: () => void;
  group: GroupDetail;
  mode: 'teacher' | 'students';
}

export function ManageGroupModal({ open, onClose, group, mode }: Props) {
  const qc = useQueryClient();
  const users = useQuery({
    queryKey: ['users-min'],
    queryFn: () => fetchUsers({ limit: 500 }),
    enabled: open,
  });
  const enrollments = useQuery({
    queryKey: ['enrollments', group.id],
    queryFn: () => fetchEnrollments(group.id),
    enabled: open,
  });

  const [teacherId, setTeacherId] = useState(group.teacher_id ?? '');
  const [search, setSearch] = useState('');

  const assignTeacher = useMutation({
    mutationFn: async () => {
      const { data } = await api.patch<GroupDetail>(`/api/groups/${group.id}`, {
        teacher_id: teacherId || null,
      });
      return data;
    },
    onSuccess: () => {
      toast('success', 'Преподаватель обновлён');
      qc.invalidateQueries({ queryKey: ['group', group.id] });
      qc.invalidateQueries({ queryKey: ['groups'] });
      qc.invalidateQueries({ queryKey: ['groups-mine'] });
      onClose();
    },
    onError: (err: { response?: { data?: { detail?: string } } }) => {
      toast('error', 'Не удалось', err?.response?.data?.detail ?? 'Ошибка');
    },
  });

  const enroll = useMutation({
    mutationFn: async (studentId: string) => {
      const { data } = await api.post(`/api/groups/${group.id}/enrollments`, {
        student_id: studentId,
      });
      return data;
    },
    onSuccess: () => {
      toast('success', 'Студент зачислен');
      qc.invalidateQueries({ queryKey: ['enrollments', group.id] });
    },
    onError: (err: { response?: { data?: { detail?: string } } }) => {
      toast('error', 'Не удалось зачислить', err?.response?.data?.detail ?? 'Ошибка');
    },
  });

  const unenroll = useMutation({
    mutationFn: async (studentId: string) => {
      await api.delete(`/api/groups/${group.id}/enrollments/${studentId}`);
    },
    onSuccess: () => {
      toast('info', 'Студент отчислен из группы');
      qc.invalidateQueries({ queryKey: ['enrollments', group.id] });
    },
    onError: (err: { response?: { data?: { detail?: string } } }) => {
      toast('error', 'Не удалось отчислить', err?.response?.data?.detail ?? 'Ошибка');
    },
  });

  const allGroups = useQuery({
    queryKey: ['groups-all-for-transfer'],
    queryFn: () => fetchGroups(),
    enabled: open && mode === 'students',
  });
  const allCourses = useQuery({
    queryKey: ['courses-all'],
    queryFn: () => fetchCourses({ limit: 200, only_published: false }),
    enabled: open && mode === 'students',
  });

  const transfer = useMutation({
    mutationFn: async ({ studentId, targetGroupId }: { studentId: string; targetGroupId: string }) => {
      await api.post(`/api/groups/${group.id}/enrollments/${studentId}/transfer`, {
        target_group_id: targetGroupId,
      });
    },
    onSuccess: () => {
      toast('success', 'Студент переведён');
      qc.invalidateQueries({ queryKey: ['enrollments', group.id] });
      qc.invalidateQueries({ queryKey: ['groups'] });
    },
    onError: (err: { response?: { data?: { detail?: string } } }) => {
      toast('error', 'Не удалось перевести', err?.response?.data?.detail ?? 'Ошибка');
    },
  });

  const [transferOpen, setTransferOpen] = useState<string | null>(null);  // studentId being transferred

  const userById = new Map((users.data ?? []).map((u) => [u.id, u]));
  const enrolledIds = new Set((enrollments.data ?? []).map((e) => e.student_id));
  const enrolledStudents: UserOut[] = (enrollments.data ?? [])
    .map((e) => userById.get(e.student_id))
    .filter((u): u is UserOut => !!u);

  // Available students = all users minus already enrolled, minus those without email (heuristic for "is real student")
  const candidates = (users.data ?? [])
    .filter((u) => !enrolledIds.has(u.id))
    .filter((u) => {
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        u.full_name.toLowerCase().includes(q) ||
        (u.email ?? '').toLowerCase().includes(q)
      );
    })
    .slice(0, 30);

  if (mode === 'teacher') {
    return (
      <Modal
        open={open}
        onClose={onClose}
        title="Преподаватель группы"
        description="Назначьте или замените преподавателя."
        footer={
          <>
            <button onClick={onClose} className="btn-secondary">
              Отмена
            </button>
            <button onClick={() => assignTeacher.mutate()} className="btn-primary" disabled={assignTeacher.isPending}>
              {assignTeacher.isPending ? 'Сохранение…' : 'Сохранить'}
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <label className="text-xs font-bold uppercase tracking-[0.14em] text-ink-500 block">
            Преподаватель
          </label>
          <select
            value={teacherId}
            onChange={(e) => setTeacherId(e.target.value)}
            className="input"
          >
            <option value="">— не назначен —</option>
            {(users.data ?? []).map((u) => (
              <option key={u.id} value={u.id}>
                {u.full_name} {u.email ? `· ${u.email}` : ''}
              </option>
            ))}
          </select>
          <div className="text-xs text-ink-500">
            Студенты получат уведомление при смене преподавателя (Phase 2).
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Студенты группы"
      description={`${enrolledStudents.length} / ${group.max_students} мест`}
      size="lg"
      footer={
        <button onClick={onClose} className="btn-primary">
          Готово
        </button>
      }
    >
      <div className="space-y-5">
        {/* Currently enrolled */}
        <div>
          <h3 className="eyebrow">Зачислены · {enrolledStudents.length}</h3>
          {enrolledStudents.length === 0 ? (
            <p className="text-sm text-ink-500 italic py-2">Пока никто не зачислен.</p>
          ) : (
            <ul className="divide-y divide-paper-300">
              {enrolledStudents.map((u, i) => (
                <li key={u.id} className="flex items-center gap-3 py-2.5">
                  <span className="font-display text-xs text-ink-300 num w-6">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-ink-900 truncate">
                      {u.full_name}
                    </div>
                    <div className="text-xs text-ink-500 font-mono truncate">{u.email ?? ''}</div>
                  </div>
                  <button
                    onClick={() =>
                      setTransferOpen(transferOpen === u.id ? null : u.id)
                    }
                    className={
                      transferOpen === u.id
                        ? 'inline-flex h-8 w-8 items-center justify-center rounded-lg bg-forest-100 text-forest-700 transition-colors flex-shrink-0'
                        : 'inline-flex h-8 w-8 items-center justify-center rounded-lg text-ink-500 hover:bg-paper-200 hover:text-ink-900 transition-colors flex-shrink-0'
                    }
                    aria-label="Перевести"
                    title="Перевести в другую группу"
                  >
                    <ArrowRightLeft size={14} strokeWidth={2} />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Отчислить ${u.full_name} из группы?`)) {
                        unenroll.mutate(u.id);
                      }
                    }}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-terra-500 hover:bg-terra-50 transition-colors flex-shrink-0"
                    aria-label="Отчислить"
                  >
                    <Trash2 size={14} strokeWidth={2} />
                  </button>
                </li>
              ))}
            </ul>
          )}
          {transferOpen && (() => {
            const courseById = new Map((allCourses.data?.items ?? []).map((c) => [c.id, c]));
            const otherGroups = (allGroups.data ?? []).filter(
              (g: Group) => g.id !== group.id,
            );
            return (
              <div className="mt-3 rounded-2xl bg-forest-50 border border-forest-100 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <ArrowRightLeft size={14} strokeWidth={2.5} className="text-forest-700" />
                  <h4 className="font-display font-bold text-sm text-ink-900">
                    Перевести {userById.get(transferOpen)?.full_name} в группу:
                  </h4>
                </div>
                <div className="max-h-60 overflow-y-auto space-y-1">
                  {otherGroups.length === 0 ? (
                    <p className="text-xs text-ink-500 italic">
                      Нет других групп для перевода.
                    </p>
                  ) : (
                    otherGroups.map((g: Group) => {
                      const c = courseById.get(g.course_id);
                      return (
                        <button
                          key={g.id}
                          type="button"
                          onClick={() => {
                            transfer.mutate({
                              studentId: transferOpen,
                              targetGroupId: g.id,
                            });
                            setTransferOpen(null);
                          }}
                          disabled={transfer.isPending}
                          className="w-full text-left px-3 py-2 rounded-lg bg-paper-50 border border-paper-300 hover:border-forest-500 transition-colors text-sm"
                        >
                          <div className="font-medium text-ink-900 truncate">
                            {c?.title ?? 'Группа'}{' '}
                            <span className="text-ink-500 font-normal">· {c?.level ?? '—'}</span>
                          </div>
                          <div className="text-xs text-ink-500">
                            старт {g.start_date} · {g.mode}
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setTransferOpen(null)}
                  className="text-xs font-bold text-ink-500 hover:text-ink-900"
                >
                  Отмена
                </button>
              </div>
            );
          })()}
        </div>

        {/* Add student */}
        <div className="border-t border-paper-300 pt-5">
          <h3 className="eyebrow flex items-center gap-2">
            <UserPlus size={12} strokeWidth={2.5} /> Добавить студента
          </h3>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск по имени или email…"
            className="input mb-3"
          />
          <div className="space-y-1 max-h-[300px] overflow-y-auto">
            {candidates.length === 0 ? (
              <p className="text-sm text-ink-500 italic">
                {search ? 'Никого не найдено' : 'Все пользователи уже в группе'}
              </p>
            ) : (
              candidates.map((u) => (
                <div
                  key={u.id}
                  className="flex items-center gap-3 py-2 px-3 rounded-xl hover:bg-paper-100 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-ink-900 truncate">
                      {u.full_name}
                    </div>
                    <div className="text-xs text-ink-500 font-mono truncate">{u.email ?? ''}</div>
                  </div>
                  <button
                    onClick={() => enroll.mutate(u.id)}
                    disabled={enroll.isPending || enrolledStudents.length >= group.max_students}
                    className="btn-primary btn-sm"
                  >
                    <UserPlus size={12} strokeWidth={2.5} /> Зачислить
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}

export function GroupManagementButtons({
  group,
  canManage,
  onManageTeacher,
  onManageStudents,
}: {
  group: GroupDetail;
  canManage: boolean;
  onManageTeacher: () => void;
  onManageStudents: () => void;
}) {
  if (!canManage) return null;
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <button onClick={onManageTeacher} className="btn-secondary btn-sm">
        <GraduationCap size={12} strokeWidth={2} />
        {group.teacher_id ? 'Сменить' : 'Назначить'} преподавателя
      </button>
      <button onClick={onManageStudents} className="btn-secondary btn-sm">
        <UserPlus size={12} strokeWidth={2} /> Студенты
      </button>
    </div>
  );
}
