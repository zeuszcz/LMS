import { FormEvent, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';
import { Modal, FormField } from '@/components/ui/Modal';
import { toast } from '@/components/ui/Toast';
import type { Lesson } from '@/types';

interface Props {
  open: boolean;
  onClose: () => void;
  lesson: Lesson;
}

export function EditLessonModal({ open, onClose, lesson }: Props) {
  const qc = useQueryClient();
  const [title, setTitle] = useState(lesson.title);
  const [scheduled, setScheduled] = useState(() => {
    const d = new Date(lesson.scheduled_at);
    return d.toISOString().slice(0, 16);
  });
  const [duration, setDuration] = useState(lesson.duration_min);
  const [summary, setSummary] = useState(lesson.summary ?? '');
  const [contentMd, setContentMd] = useState(lesson.content_md ?? '');
  const [error, setError] = useState<string | null>(null);

  const save = useMutation({
    mutationFn: async () => {
      const { data } = await api.patch<Lesson>(`/api/lessons/${lesson.id}`, {
        title: title.trim(),
        scheduled_at: new Date(scheduled).toISOString(),
        duration_min: duration,
        summary: summary.trim() || null,
        content_md: contentMd || null,
      });
      return data;
    },
    onSuccess: () => {
      toast('success', 'Урок обновлён');
      qc.invalidateQueries({ queryKey: ['lesson', lesson.id] });
      qc.invalidateQueries({ queryKey: ['group-lessons'] });
      qc.invalidateQueries({ queryKey: ['lessons'] });
      onClose();
    },
    onError: (err: { response?: { data?: { detail?: string } } }) => {
      setError(err?.response?.data?.detail ?? 'Не удалось сохранить');
    },
  });

  const cancel = useMutation({
    mutationFn: async () => {
      const { data } = await api.post<Lesson>(`/api/lessons/${lesson.id}/cancel`);
      return data;
    },
    onSuccess: () => {
      toast('info', 'Урок отменён');
      qc.invalidateQueries({ queryKey: ['lesson', lesson.id] });
      qc.invalidateQueries({ queryKey: ['group-lessons'] });
      onClose();
    },
    onError: (err: { response?: { data?: { detail?: string } } }) => {
      toast('error', 'Не удалось отменить', err?.response?.data?.detail ?? 'Ошибка');
    },
  });

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!title.trim()) return setError('Введите название');
    save.mutate();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Редактировать урок"
      description="Перенесите дату, обновите материал или отмените урок."
      size="lg"
      footer={
        <>
          <button
            type="button"
            onClick={() => {
              if (confirm('Отменить урок? Студенты получат уведомление.')) cancel.mutate();
            }}
            disabled={cancel.isPending}
            className="btn-danger"
          >
            Отменить урок
          </button>
          <div className="flex-1" />
          <button onClick={onClose} className="btn-secondary">Закрыть</button>
          <button form="edit-lesson-form" type="submit" className="btn-primary" disabled={save.isPending}>
            {save.isPending ? 'Сохранение…' : 'Сохранить'}
          </button>
        </>
      }
    >
      <form id="edit-lesson-form" onSubmit={onSubmit} className="space-y-4">
        <FormField label="Название" required>
          <input className="input" required value={title} onChange={(e) => setTitle(e.target.value)} />
        </FormField>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FormField label="Когда" required>
            <input type="datetime-local" required className="input num" value={scheduled} onChange={(e) => setScheduled(e.target.value)} />
          </FormField>
          <FormField label="Длительность (мин)" required>
            <input type="number" min={15} max={240} step={5} required className="input num" value={duration} onChange={(e) => setDuration(Number(e.target.value))} />
          </FormField>
        </div>

        <FormField label="Краткое описание (1–2 строки)">
          <input className="input" maxLength={500} value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="Past Simple vs Past Continuous — повторение" />
        </FormField>

        <FormField label="Материал урока (Markdown)" hint="Заголовки ## ###, списки, таблицы, **жирный**, *курсив*">
          <textarea rows={10} className="input font-mono text-xs" value={contentMd} onChange={(e) => setContentMd(e.target.value)} placeholder="## Цели урока&#10;- ...&#10;## Ход урока&#10;..." />
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
