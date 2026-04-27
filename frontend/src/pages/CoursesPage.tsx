import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchCourses } from '@/api/courses';
import { PageHeader } from '@/components/ui/PageHeader';
import { LanguageMark } from '@/components/ui/LanguageMark';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { AGE_LABEL, LANGUAGE_LABEL } from '@/lib/format';
import { GraduationCap } from 'lucide-react';
import type { AgeGroup, CefrLevel, Course, Language } from '@/types';

const ALL_LANG: Language[] = ['en', 'de', 'fr', 'it', 'es', 'zh', 'ja', 'ko'];
const ALL_LEVEL: CefrLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
const ALL_AGE: AgeGroup[] = ['kids', 'teens', 'adults'];

export function CoursesPage() {
  const [lang, setLang] = useState<Language | null>(null);
  const [level, setLevel] = useState<CefrLevel | null>(null);
  const [age, setAge] = useState<AgeGroup | null>(null);

  const courses = useQuery({
    queryKey: ['courses', { lang, level, age }],
    queryFn: () =>
      fetchCourses({
        language: lang ?? undefined,
        level: level ?? undefined,
        age_group: age ?? undefined,
        only_published: true,
        limit: 100,
      }),
  });

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Каталог"
        title="Курсы"
        description="Восемь языков, шесть уровней CEFR, три возрастные группы. Авторская методика FLæʃcom."
      />

      <div className="card-flat space-y-3">
        <FilterRow label="Язык" all={ALL_LANG} value={lang} render={(l) => LANGUAGE_LABEL[l]} onChange={setLang} />
        <FilterRow label="Уровень" all={ALL_LEVEL} value={level} render={(l) => l} onChange={setLevel} />
        <FilterRow label="Возраст" all={ALL_AGE} value={age} render={(l) => AGE_LABEL[l]} onChange={setAge} />
      </div>

      {courses.isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card space-y-3">
              <Skeleton className="h-9 w-9 rounded" />
              <Skeleton className="h-5 w-2/3" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-5/6" />
            </div>
          ))}
        </div>
      ) : (courses.data?.items ?? []).length === 0 ? (
        <EmptyState
          icon={<GraduationCap size={20} strokeWidth={1.6} />}
          title="Ничего не нашлось"
          description="Снимите фильтры или попробуйте другую комбинацию языка и уровня."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(courses.data?.items ?? []).map((c) => (
            <CourseCard key={c.id} course={c} />
          ))}
        </div>
      )}
    </div>
  );
}

function CourseCard({ course }: { course: Course }) {
  return (
    <article className="card group hover:border-forest-700 transition-colors flex flex-col">
      <div className="flex items-start justify-between gap-3">
        <LanguageMark language={course.language} size="lg" />
        <span className="pill-forest font-mono">{course.level}</span>
      </div>

      <h3 className="font-display text-lg font-semibold text-ink-900 mt-4 leading-tight text-balance">
        {course.title}
      </h3>

      <div className="text-xs text-ink-500 mt-1">
        {LANGUAGE_LABEL[course.language]} · {AGE_LABEL[course.age_group]}
      </div>

      <p className="text-sm text-ink-600 mt-3 line-clamp-3 flex-1 leading-relaxed">
        {course.description ?? 'Описание не задано'}
      </p>

      <div className="rule mt-5 pt-3 flex items-center justify-between text-[11px] uppercase tracking-[0.18em] text-ink-400 font-semibold num">
        <span>{course.lessons_count} уроков</span>
        <span>{course.duration_weeks} нед.</span>
      </div>
    </article>
  );
}

function FilterRow<T extends string>({
  label,
  all,
  value,
  render,
  onChange,
}: {
  label: string;
  all: readonly T[];
  value: T | null;
  render: (v: T) => string;
  onChange: (v: T | null) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-[10px] uppercase tracking-[0.2em] text-ink-400 font-semibold w-20 flex-shrink-0">
        {label}
      </span>
      <button
        type="button"
        onClick={() => onChange(null)}
        className={
          value === null
            ? 'px-2.5 py-0.5 rounded-full text-xs font-medium bg-ink-900 text-paper-50 border border-ink-900'
            : 'px-2.5 py-0.5 rounded-full text-xs bg-paper-50 text-ink-600 border border-paper-300 hover:border-ink-700'
        }
      >
        Все
      </button>
      {all.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(value === opt ? null : opt)}
          className={
            value === opt
              ? 'px-2.5 py-0.5 rounded-full text-xs font-medium bg-ink-900 text-paper-50 border border-ink-900'
              : 'px-2.5 py-0.5 rounded-full text-xs bg-paper-50 text-ink-600 border border-paper-300 hover:border-ink-700'
          }
        >
          {render(opt)}
        </button>
      ))}
    </div>
  );
}
