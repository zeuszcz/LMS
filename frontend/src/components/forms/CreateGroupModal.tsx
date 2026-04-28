import { FormEvent, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2 } from 'lucide-react';
import { Modal, FormField } from '@/components/ui/Modal';
import { toast } from '@/components/ui/Toast';
import { fetchCourses } from '@/api/courses';
import { fetchBranches } from '@/api/branches';
import { fetchUsers } from '@/api/users';
import { createGroup, type ScheduleSlotIn } from '@/api/groups';

const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

interface Props {
  open: boolean;
  onClose: () => void;
}

export function CreateGroupModal({ open, onClose }: Props) {
  const qc = useQueryClient();
  const courses = useQuery({
    queryKey: ['courses-all'],
    queryFn: () => fetchCourses({ limit: 200, only_published: false }),
    enabled: open,
  });
  const branches = useQuery({ queryKey: ['branches-all'], queryFn: fetchBranches, enabled: open });
  const users = useQuery({
    queryKey: ['users-min'],
    queryFn: () => fetchUsers({ limit: 200 }),
    enabled: open,
  });

  const [courseId, setCourseId] = useState('');
  const [branchId, setBranchId] = useState('');
  const [teacherId, setTeacherId] = useState('');
  const [mode, setMode] = useState<'offline' | 'online' | 'hybrid'>('offline');
  const today = new Date().toISOString().slice(0, 10);
  const [startDate, setStartDate] = useState(today);
  const [maxStudents, setMaxStudents] = useState(8);
  const [slots, setSlots] = useState<ScheduleSlotIn[]>([
    { weekday: 1, start_time: '19:00:00', end_time: '20:30:00', valid_from: today },
  ]);
  const [error, setError] = useState<string | null>(null);

  const create = useMutation({
    mutationFn: () =>
      createGroup({
        course_id: courseId,
        branch_id: branchId || null,
        teacher_id: teacherId || null,
        mode,
        start_date: startDate,
        max_students: maxStudents,
        slots: slots.map((s) => ({ ...s, valid_from: startDate })),
      }),
    onSuccess: () => {
      toast('success', 'Группа создана', 'Расписание сохранено, можно начинать набор.');
      qc.invalidateQueries({ queryKey: ['groups'] });
      qc.invalidateQueries({ queryKey: ['groups-all'] });
      qc.invalidateQueries({ queryKey: ['groups-mine'] });
      reset();
      onClose();
    },
    onError: (err: { response?: { data?: { detail?: string } } }) => {
      setError(err?.response?.data?.detail ?? 'Не удалось создать группу');
    },
  });

  const reset = () => {
    setCourseId('');
    setBranchId('');
    setTeacherId('');
    setMode('offline');
    setStartDate(today);
    setMaxStudents(8);
    setSlots([{ weekday: 1, start_time: '19:00:00', end_time: '20:30:00', valid_from: today }]);
    setError(null);
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!courseId) {
      setError('Выберите курс');
      return;
    }
    create.mutate();
  };

  const teachers = (users.data ?? []); // backend filtering by role-server-side TODO; for now any user

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Создать группу"
      description="Курс, расписание и преподаватель — потом можно зачислить студентов."
      size="lg"
      footer={
        <>
          <button type="button" onClick={onClose} className="btn-secondary">
            Отмена
          </button>
          <button
            type="submit"
            form="create-group-form"
            disabled={create.isPending}
            className="btn-primary"
          >
            {create.isPending ? 'Создание…' : 'Создать группу'}
          </button>
        </>
      }
    >
      <form id="create-group-form" onSubmit={onSubmit} className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Курс" required hint="Опубликованный или черновой">
            <select
              required
              value={courseId}
              onChange={(e) => setCourseId(e.target.value)}
              className="input"
            >
              <option value="">— выбрать —</option>
              {(courses.data?.items ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title} · {c.level}
                </option>
              ))}
            </select>
          </FormField>

          <FormField label="Филиал" hint="Оставьте пустым для онлайн-формата">
            <select
              value={branchId}
              onChange={(e) => setBranchId(e.target.value)}
              className="input"
            >
              <option value="">— онлайн —</option>
              {(branches.data ?? []).map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </FormField>

          <FormField label="Преподаватель" hint="Можно назначить позже">
            <select
              value={teacherId}
              onChange={(e) => setTeacherId(e.target.value)}
              className="input"
            >
              <option value="">— не назначен —</option>
              {teachers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.full_name}
                </option>
              ))}
            </select>
          </FormField>

          <FormField label="Формат" required>
            <div className="inline-flex p-1 rounded-xl bg-paper-100 border border-paper-300 w-full">
              {(['offline', 'online', 'hybrid'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className={
                    mode === m
                      ? 'flex-1 h-9 rounded-lg text-xs font-bold bg-forest-600 text-white shadow-pop'
                      : 'flex-1 h-9 rounded-lg text-xs font-medium text-ink-500 hover:text-ink-900 transition-colors'
                  }
                >
                  {m === 'offline' ? 'Офлайн' : m === 'online' ? 'Онлайн' : 'Гибрид'}
                </button>
              ))}
            </div>
          </FormField>

          <FormField label="Старт занятий" required>
            <input
              type="date"
              required
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="input"
            />
          </FormField>

          <FormField label="Макс. студентов" required>
            <input
              type="number"
              min={1}
              max={30}
              required
              value={maxStudents}
              onChange={(e) => setMaxStudents(Number(e.target.value))}
              className="input num"
            />
          </FormField>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-bold uppercase tracking-[0.14em] text-ink-500">
              Расписание · {slots.length} слот{slots.length === 1 ? '' : 'а'}
            </label>
            <button
              type="button"
              onClick={() =>
                setSlots([
                  ...slots,
                  { weekday: 3, start_time: '19:00:00', end_time: '20:30:00', valid_from: startDate },
                ])
              }
              className="inline-flex items-center gap-1 text-xs font-bold text-forest-700 hover:text-forest-900"
            >
              <Plus size={12} strokeWidth={2.5} /> Добавить слот
            </button>
          </div>
          <div className="space-y-2">
            {slots.map((s, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 items-end p-3 rounded-xl bg-paper-100 border border-paper-300">
                <div className="col-span-12 sm:col-span-4">
                  <label className="text-[10px] uppercase tracking-[0.14em] font-bold text-ink-500 block mb-1">День</label>
                  <select
                    value={s.weekday}
                    onChange={(e) => {
                      const next = [...slots];
                      next[i] = { ...s, weekday: Number(e.target.value) };
                      setSlots(next);
                    }}
                    className="input h-9 text-sm"
                  >
                    {WEEKDAYS.map((label, idx) => (
                      <option key={idx} value={idx}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-span-6 sm:col-span-3">
                  <label className="text-[10px] uppercase tracking-[0.14em] font-bold text-ink-500 block mb-1">С</label>
                  <input
                    type="time"
                    value={s.start_time.slice(0, 5)}
                    onChange={(e) => {
                      const next = [...slots];
                      next[i] = { ...s, start_time: e.target.value + ':00' };
                      setSlots(next);
                    }}
                    className="input h-9 text-sm num"
                  />
                </div>
                <div className="col-span-6 sm:col-span-3">
                  <label className="text-[10px] uppercase tracking-[0.14em] font-bold text-ink-500 block mb-1">По</label>
                  <input
                    type="time"
                    value={s.end_time.slice(0, 5)}
                    onChange={(e) => {
                      const next = [...slots];
                      next[i] = { ...s, end_time: e.target.value + ':00' };
                      setSlots(next);
                    }}
                    className="input h-9 text-sm num"
                  />
                </div>
                <div className="col-span-12 sm:col-span-2 flex justify-end">
                  {slots.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setSlots(slots.filter((_, j) => j !== i))}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-terra-500 hover:bg-terra-50 transition-colors"
                      aria-label="Удалить слот"
                    >
                      <Trash2 size={14} strokeWidth={2} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {error && (
          <div className="text-sm text-terra-700 bg-terra-50 border border-terra-300 rounded-xl px-4 py-3">
            {error}
          </div>
        )}
      </form>
    </Modal>
  );
}
