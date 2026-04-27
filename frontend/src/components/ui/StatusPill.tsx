import { clsx } from 'clsx';
import type { AttendanceStatus, GroupStatus, LessonStatus, SubmissionStatus } from '@/types';

const LESSON: Record<LessonStatus, { label: string; cls: string }> = {
  planned: { label: 'Запланирован', cls: 'pill-ink' },
  in_progress: { label: 'Идёт', cls: 'pill-gold' },
  finished: { label: 'Завершён', cls: 'pill-forest' },
  cancelled: { label: 'Отменён', cls: 'pill-terra' },
};

const GROUP: Record<GroupStatus, { label: string; cls: string }> = {
  planned: { label: 'Запланирована', cls: 'pill-ink' },
  active: { label: 'Идёт', cls: 'pill-sage' },
  finished: { label: 'Завершена', cls: 'pill-ink' },
  cancelled: { label: 'Отменена', cls: 'pill-terra' },
};

const ATTENDANCE: Record<AttendanceStatus, { label: string; cls: string }> = {
  present: { label: 'Был', cls: 'pill-sage' },
  late: { label: 'Опоздал', cls: 'pill-gold' },
  absent: { label: 'Отсутств.', cls: 'pill-terra' },
  excused: { label: 'Уваж.', cls: 'pill-ink' },
};

const SUBMISSION: Record<SubmissionStatus, { label: string; cls: string }> = {
  draft: { label: 'Черновик', cls: 'pill-ink' },
  submitted: { label: 'Сдано', cls: 'pill-gold' },
  graded: { label: 'Оценено', cls: 'pill-forest' },
  returned: { label: 'Возвращено', cls: 'pill-terra' },
};

export function LessonStatusPill({ status, className }: { status: LessonStatus; className?: string }) {
  const c = LESSON[status];
  return <span className={clsx(c.cls, className)}>{c.label}</span>;
}
export function GroupStatusPill({ status, className }: { status: GroupStatus; className?: string }) {
  const c = GROUP[status];
  return <span className={clsx(c.cls, className)}>{c.label}</span>;
}
export function AttendancePill({ status, className }: { status: AttendanceStatus; className?: string }) {
  const c = ATTENDANCE[status];
  return <span className={clsx(c.cls, className)}>{c.label}</span>;
}
export function SubmissionPill({ status, className }: { status: SubmissionStatus; className?: string }) {
  const c = SUBMISSION[status];
  return <span className={clsx(c.cls, className)}>{c.label}</span>;
}
