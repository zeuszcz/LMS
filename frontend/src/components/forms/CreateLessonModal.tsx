import { FormEvent, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';
import { Modal, FormField } from '@/components/ui/Modal';
import { toast } from '@/components/ui/Toast';
import type { Lesson } from '@/types';

interface Props {
  open: boolean;
  onClose: () => void;
  groupId: string;
  defaultSequence?: number;
}

export function CreateLessonModal({ open, onClose, groupId, defaultSequence = 1 }: Props) {
  const qc = useQueryClient();
  const [sequence, setSequence] = useState(defaultSequence);
  const [title, setTitle] = useState('');
  const tomorrow = (() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(19, 0, 0, 0);
    return d.toISOString().slice(0, 16);
  })();
  const [scheduledAt, setScheduledAt] = useState(tomorrow);
  const [duration, setDuration] = useState(80);
  const [error, setError] = useState<string | null>(null);

  const create = useMutation({
    mutationFn: async () => {
      const payload = {
        group_id: groupId,
        sequence,
        title: title.trim(),
        scheduled_at: new Date(scheduledAt).toISOString(),
        duration_min: duration,
      };
      const { data } = await api.post<Lesson>('/api/lessons/', payload);
      return data;
    },
    onSuccess: () => {
      toast('success', 'Урок создан', 'Студенты увидят его в расписании.');
      qc.invalidateQueries({ queryKey: ['group-lessons'] });
      qc.invalidateQueries({ queryKey: ['lessons'] });
      qc.invalidateQueries({ queryKey: ['lessons-mine'] });
      qc.invalidateQueries({ queryKey: ['lessons-teacher'] });
      onClose();
      setTitle('');
      setSequence(defaultSequence + 1);
    },
    onError: (err: { response?: { data?: { detail?: string } } }) => {
      setError(err?.response?.data?.detail ?? 'Не удалось создать урок');
    },
  });

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!title.trim()) {
      setError('Введите название урока');
      return;
    }
    create.mutate();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Добавить урок"
      description="Урок появится в расписании группы."
      footer={
        <>
          <button type="button" onClick={onClose} className="btn-secondary">
            Отмена
          </button>
          <button type="submit" form="create-lesson-form" disabled={create.isPending} className="btn-primary">
            {create.isPending ? 'Создание…' : 'Создать урок'}
          </button>
        </>
      }
    >
      <form id="create-lesson-form" onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <FormField label="№ в курсе" required>
            <input
              type="number"
              min={1}
              max={500}
              required
              value={sequence}
              onChange={(e) => setSequence(Number(e.target.value))}
              className="input num"
            />
          </FormField>
          <FormField label="Длительность (мин)" required>
            <input
              type="number"
              min={15}
              max={240}
              step={5}
              required
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              className="input num"
            />
          </FormField>
          <FormField label="Когда" required>
            <input
              type="datetime-local"
              required
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              className="input num"
            />
          </FormField>
        </div>

        <FormField label="Название" required hint="Например: «Past Tenses Workshop»">
          <input
            type="text"
            required
            maxLength={200}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="input"
            placeholder="Past Tenses Workshop"
          />
        </FormField>

        {error && (
          <div className="text-sm text-terra-700 bg-terra-50 border border-terra-300 rounded-xl px-4 py-3">
            {error}
          </div>
        )}
      </form>
    </Modal>
  );
}
