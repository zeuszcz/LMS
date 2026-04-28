import { FormEvent, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';
import { Modal, FormField } from '@/components/ui/Modal';
import { toast } from '@/components/ui/Toast';
import type { Course, Language, CefrLevel, AgeGroup } from '@/types';

interface Props {
  open: boolean;
  onClose: () => void;
  course: Course;
}

const LANGS: Array<{ key: Language; label: string }> = [
  { key: 'en', label: 'Английский' },
  { key: 'de', label: 'Немецкий' },
  { key: 'fr', label: 'Французский' },
  { key: 'it', label: 'Итальянский' },
  { key: 'es', label: 'Испанский' },
  { key: 'zh', label: 'Китайский' },
  { key: 'ja', label: 'Японский' },
  { key: 'ko', label: 'Корейский' },
];
const LEVELS: CefrLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
const AGES: Array<{ key: AgeGroup; label: string }> = [
  { key: 'kids', label: 'Дети' },
  { key: 'teens', label: 'Подростки' },
  { key: 'adults', label: 'Взрослые' },
];

export function EditCourseModal({ open, onClose, course }: Props) {
  const qc = useQueryClient();
  const [title, setTitle] = useState(course.title);
  const [language, setLanguage] = useState(course.language);
  const [level, setLevel] = useState(course.level);
  const [age, setAge] = useState(course.age_group);
  const [duration, setDuration] = useState(course.duration_weeks);
  const [lessonsCount, setLessonsCount] = useState(course.lessons_count);
  const [description, setDescription] = useState(course.description ?? '');
  const [methodology, setMethodology] = useState(course.methodology ?? '');
  const [error, setError] = useState<string | null>(null);

  const save = useMutation({
    mutationFn: async () => {
      const { data } = await api.patch<Course>(`/api/courses/${course.id}`, {
        title: title.trim(),
        language,
        level,
        age_group: age,
        duration_weeks: duration,
        lessons_count: lessonsCount,
        description: description.trim() || null,
        methodology: methodology.trim() || null,
      });
      return data;
    },
    onSuccess: () => {
      toast('success', 'Курс обновлён');
      qc.invalidateQueries({ queryKey: ['courses'] });
      qc.invalidateQueries({ queryKey: ['courses-all'] });
      qc.invalidateQueries({ queryKey: ['course', course.id] });
      onClose();
    },
    onError: (err: { response?: { data?: { detail?: string } } }) => {
      setError(err?.response?.data?.detail ?? 'Не удалось сохранить');
    },
  });

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!title.trim()) return setError('Введите название курса');
    save.mutate();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Редактировать курс"
      description="Изменения отразятся в каталоге и на странице курса."
      size="lg"
      footer={
        <>
          <button onClick={onClose} className="btn-secondary">Отмена</button>
          <button form="edit-course-form" type="submit" className="btn-primary" disabled={save.isPending}>
            {save.isPending ? 'Сохранение…' : 'Сохранить'}
          </button>
        </>
      }
    >
      <form id="edit-course-form" onSubmit={onSubmit} className="space-y-4">
        <FormField label="Название" required>
          <input className="input" required value={title} onChange={(e) => setTitle(e.target.value)} />
        </FormField>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <FormField label="Язык" required>
            <select className="input" value={language} onChange={(e) => setLanguage(e.target.value as Language)}>
              {LANGS.map((l) => <option key={l.key} value={l.key}>{l.label}</option>)}
            </select>
          </FormField>
          <FormField label="Уровень" required>
            <select className="input" value={level} onChange={(e) => setLevel(e.target.value as CefrLevel)}>
              {LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
          </FormField>
          <FormField label="Возраст" required>
            <select className="input" value={age} onChange={(e) => setAge(e.target.value as AgeGroup)}>
              {AGES.map((a) => <option key={a.key} value={a.key}>{a.label}</option>)}
            </select>
          </FormField>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FormField label="Длительность (нед.)" required>
            <input className="input num" type="number" min={1} max={104} required value={duration} onChange={(e) => setDuration(Number(e.target.value))} />
          </FormField>
          <FormField label="Уроков всего" required>
            <input className="input num" type="number" min={1} max={500} required value={lessonsCount} onChange={(e) => setLessonsCount(Number(e.target.value))} />
          </FormField>
        </div>

        <FormField label="Описание">
          <textarea rows={4} className="input" value={description} onChange={(e) => setDescription(e.target.value)} />
        </FormField>

        <FormField label="Методика">
          <input className="input" maxLength={50} value={methodology} onChange={(e) => setMethodology(e.target.value)} placeholder="FLæʃcom" />
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
