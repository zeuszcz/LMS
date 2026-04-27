import type {
  AgeGroup,
  AssignmentKind,
  AttendanceStatus,
  GroupMode,
  GroupStatus,
  Language,
  LessonStatus,
} from '@/types';

export const LANGUAGE_LABEL: Record<Language, string> = {
  en: 'Английский',
  de: 'Немецкий',
  fr: 'Французский',
  it: 'Итальянский',
  es: 'Испанский',
  zh: 'Китайский',
  ja: 'Японский',
  ko: 'Корейский',
};

export const AGE_LABEL: Record<AgeGroup, string> = {
  kids: 'Дети',
  teens: 'Подростки',
  adults: 'Взрослые',
};

export const GROUP_MODE_LABEL: Record<GroupMode, string> = {
  offline: 'Офлайн',
  online: 'Онлайн',
  hybrid: 'Гибрид',
};

export const GROUP_STATUS_LABEL: Record<GroupStatus, string> = {
  planned: 'Запланирована',
  active: 'Идёт',
  finished: 'Завершена',
  cancelled: 'Отменена',
};

export const LESSON_STATUS_LABEL: Record<LessonStatus, string> = {
  planned: 'Запланирован',
  in_progress: 'Идёт',
  finished: 'Завершён',
  cancelled: 'Отменён',
};

export const ATTENDANCE_LABEL: Record<AttendanceStatus, string> = {
  present: 'Присутствовал',
  late: 'Опоздал',
  absent: 'Отсутствовал',
  excused: 'Уважительная',
};

export const ASSIGNMENT_KIND_LABEL: Record<AssignmentKind, string> = {
  quiz: 'Тест',
  writing: 'Эссе',
  speaking: 'Speaking',
  reading: 'Чтение',
};

const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
export const weekdayShort = (n: number) => WEEKDAYS[n] ?? '?';

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
}

export function formatMoney(minor: number, currency = 'RUB'): string {
  const major = minor / 100;
  return major.toLocaleString('ru-RU', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  });
}

export function relativeTime(iso: string): string {
  const target = new Date(iso).getTime();
  const now = Date.now();
  const diffMs = target - now;
  const future = diffMs > 0;
  const abs = Math.abs(diffMs);
  const minute = 60_000,
    hour = 60 * minute,
    day = 24 * hour;
  if (abs < hour) return future ? `через ${Math.round(abs / minute)} мин` : `${Math.round(abs / minute)} мин назад`;
  if (abs < day) return future ? `через ${Math.round(abs / hour)} ч` : `${Math.round(abs / hour)} ч назад`;
  return future
    ? `через ${Math.round(abs / day)} дн`
    : `${Math.round(abs / day)} дн назад`;
}
