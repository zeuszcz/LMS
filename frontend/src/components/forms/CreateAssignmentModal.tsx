import { FormEvent, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';
import { Modal, FormField } from '@/components/ui/Modal';
import { toast } from '@/components/ui/Toast';
import type { Assignment, AssignmentKind } from '@/types';

interface Props {
  open: boolean;
  onClose: () => void;
  lessonId: string;
}

const KINDS: Array<{ key: AssignmentKind; label: string; hint: string }> = [
  { key: 'quiz', label: 'Тест', hint: 'Авто-проверка по ответам' },
  { key: 'writing', label: 'Эссе', hint: 'Текстовый ответ, ручная проверка' },
  { key: 'speaking', label: 'Speaking', hint: 'Загрузка аудио + проверка' },
  { key: 'reading', label: 'Чтение', hint: 'Текст + ответы на вопросы' },
];

export function CreateAssignmentModal({ open, onClose, lessonId }: Props) {
  const qc = useQueryClient();
  const [title, setTitle] = useState('');
  const [kind, setKind] = useState<AssignmentKind>('writing');
  const [instructions, setInstructions] = useState('');
  const tomorrow = (() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    d.setHours(23, 59, 0, 0);
    return d.toISOString().slice(0, 16);
  })();
  const [dueAt, setDueAt] = useState(tomorrow);
  const [maxScore, setMaxScore] = useState(10);
  const [error, setError] = useState<string | null>(null);

  const create = useMutation({
    mutationFn: async () => {
      const payload = {
        lesson_instance_id: lessonId,
        title: title.trim(),
        kind,
        instructions: instructions.trim() || null,
        due_at: dueAt ? new Date(dueAt).toISOString() : null,
        max_score: maxScore,
        auto_check: kind === 'quiz',
      };
      const { data } = await api.post<Assignment>('/api/assignments/', payload);
      return data;
    },
    onSuccess: () => {
      toast('success', 'Задание создано', 'Студенты увидят его на странице урока.');
      qc.invalidateQueries({ queryKey: ['hw'] });
      qc.invalidateQueries({ queryKey: ['hw-mine'] });
      qc.invalidateQueries({ queryKey: ['assignments-of-lesson', lessonId] });
      onClose();
      setTitle('');
      setInstructions('');
    },
    onError: (err: { response?: { data?: { detail?: string } } }) => {
      setError(err?.response?.data?.detail ?? 'Не удалось создать задание');
    },
  });

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!title.trim()) {
      setError('Введите название задания');
      return;
    }
    create.mutate();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Создать домашнее задание"
      description="Будет привязано к текущему уроку."
      footer={
        <>
          <button type="button" onClick={onClose} className="btn-secondary">
            Отмена
          </button>
          <button type="submit" form="create-hw-form" disabled={create.isPending} className="btn-primary">
            {create.isPending ? 'Создание…' : 'Создать задание'}
          </button>
        </>
      }
    >
      <form id="create-hw-form" onSubmit={onSubmit} className="space-y-4">
        <FormField label="Тип задания" required>
          <div className="grid grid-cols-2 gap-2">
            {KINDS.map((k) => (
              <button
                key={k.key}
                type="button"
                onClick={() => setKind(k.key)}
                className={
                  kind === k.key
                    ? 'rounded-xl border-2 border-forest-500 bg-forest-50 p-3 text-left'
                    : 'rounded-xl border border-paper-300 bg-paper-50 p-3 text-left hover:border-ink-700 transition-colors'
                }
              >
                <div className="font-display font-bold text-sm text-ink-900">{k.label}</div>
                <div className="text-xs text-ink-500 mt-0.5">{k.hint}</div>
              </button>
            ))}
          </div>
        </FormField>

        <FormField label="Название" required>
          <input
            type="text"
            required
            maxLength={200}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="input"
            placeholder="Эссе: My weekend plans"
          />
        </FormField>

        <FormField label="Инструкции для студентов">
          <textarea
            rows={4}
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            className="input"
            placeholder="Опишите, что нужно сделать. Markdown поддерживается."
          />
        </FormField>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FormField label="Срок сдачи" hint="Опционально">
            <input
              type="datetime-local"
              value={dueAt}
              onChange={(e) => setDueAt(e.target.value)}
              className="input num"
            />
          </FormField>
          <FormField label="Макс. балл" required>
            <input
              type="number"
              min={1}
              max={100}
              required
              value={maxScore}
              onChange={(e) => setMaxScore(Number(e.target.value))}
              className="input num"
            />
          </FormField>
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
