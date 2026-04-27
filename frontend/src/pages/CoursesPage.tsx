import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowRight,
  Award,
  GraduationCap,
  Search,
  Sparkles,
} from 'lucide-react';
import { fetchCourses } from '@/api/courses';
import { LanguageMark } from '@/components/ui/LanguageMark';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { AGE_LABEL, LANGUAGE_LABEL } from '@/lib/format';
import type { AgeGroup, CefrLevel, Course, Language } from '@/types';

const ALL_LANG: Language[] = ['en', 'de', 'fr', 'it', 'es', 'zh', 'ja', 'ko'];
const ALL_LEVEL: CefrLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

const AGE_TABS: Array<{ key: AgeGroup | 'all'; label: string }> = [
  { key: 'all', label: 'Все' },
  { key: 'kids', label: 'Дети' },
  { key: 'teens', label: 'Подростки' },
  { key: 'adults', label: 'Взрослые' },
];

export function CoursesPage() {
  const [age, setAge] = useState<AgeGroup | 'all'>('all');
  const [lang, setLang] = useState<Language | null>(null);
  const [level, setLevel] = useState<CefrLevel | null>(null);
  const [search, setSearch] = useState('');

  const courses = useQuery({
    queryKey: ['courses', { age, lang, level, search }],
    queryFn: () =>
      fetchCourses({
        language: lang ?? undefined,
        level: level ?? undefined,
        age_group: age === 'all' ? undefined : age,
        search: search.trim() || undefined,
        only_published: true,
        limit: 100,
      }),
  });

  const total = courses.data?.total ?? 0;
  const items = courses.data?.items ?? [];

  return (
    <div className="space-y-10">
      {/* HERO */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-forest-600 via-forest-700 to-forest-900 text-white px-8 sm:px-12 py-12 sm:py-14 shadow-pop-lg">
        <div className="blob bg-gold-500 h-[300px] w-[300px] -top-20 -right-20 opacity-30" />
        <div className="blob bg-forest-500 h-[420px] w-[420px] -bottom-32 -left-20 opacity-30" />

        <div className="relative max-w-3xl">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-[10px] uppercase tracking-[0.16em] font-bold border border-white/20 mb-5">
            <Sparkles size={11} strokeWidth={2} />
            Каталог YES Center
          </div>
          <h1 className="font-display text-display-xl font-extrabold tracking-tight leading-[1.0] text-balance">
            8 языков, 6 уровней,{' '}
            <span className="text-gold-300">бесконечно много</span> возможностей.
          </h1>
          <p className="mt-5 text-white/85 text-base sm:text-lg max-w-xl text-pretty leading-relaxed">
            От первых слов до уверенной речи. Авторская методика FLæʃcom,
            сертификация Cambridge, маленькие группы.
          </p>

          <div className="mt-7 flex flex-wrap gap-6">
            <HeroFact icon={<GraduationCap size={16} strokeWidth={2} />} value={total} label="курсов" />
            <HeroFact icon={<Award size={16} strokeWidth={2} />} value="A1–C2" label="уровней" />
            <HeroFact icon={<Sparkles size={16} strokeWidth={2} />} value="≤8" label="чел. в группе" />
          </div>
        </div>
      </section>

      {/* FILTERS */}
      <section className="space-y-4">
        <div className="flex items-end gap-4 flex-wrap justify-between">
          <div className="inline-flex p-1 rounded-2xl bg-paper-50 border border-paper-300">
            {AGE_TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setAge(t.key)}
                className={
                  age === t.key
                    ? 'px-4 h-9 rounded-xl text-sm font-semibold bg-forest-600 text-white shadow-pop'
                    : 'px-4 h-9 rounded-xl text-sm font-medium text-ink-500 hover:text-ink-900 transition-colors'
                }
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="relative">
            <Search
              size={14}
              strokeWidth={2}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400 pointer-events-none"
            />
            <input
              type="text"
              placeholder="Найти курс…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-10 w-72"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-[10px] uppercase tracking-[0.18em] font-bold text-ink-400 mr-1">
            Язык
          </span>
          <FilterChip active={lang === null} onClick={() => setLang(null)}>
            Все
          </FilterChip>
          {ALL_LANG.map((l) => (
            <FilterChip key={l} active={lang === l} onClick={() => setLang(lang === l ? null : l)}>
              {LANGUAGE_LABEL[l]}
            </FilterChip>
          ))}
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-[10px] uppercase tracking-[0.18em] font-bold text-ink-400 mr-1">
            Уровень
          </span>
          <FilterChip active={level === null} onClick={() => setLevel(null)}>
            Все
          </FilterChip>
          {ALL_LEVEL.map((l) => (
            <FilterChip key={l} active={level === l} onClick={() => setLevel(level === l ? null : l)}>
              {l}
            </FilterChip>
          ))}
        </div>
      </section>

      {/* RESULTS */}
      {courses.isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card space-y-3">
              <Skeleton className="h-14 w-14 rounded-2xl" />
              <Skeleton className="h-5 w-2/3" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-5/6" />
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={<GraduationCap size={20} strokeWidth={1.6} />}
          title="Ничего не нашлось"
          description="Снимите фильтры или попробуйте другую комбинацию языка и уровня."
          action={
            <button
              className="btn-secondary"
              onClick={() => {
                setAge('all');
                setLang(null);
                setLevel(null);
                setSearch('');
              }}
            >
              Сбросить фильтры
            </button>
          }
        />
      ) : (
        <>
          <div className="text-sm text-ink-500">
            Найдено: <span className="font-semibold text-ink-900 num">{items.length}</span>{' '}
            {items.length !== total && (
              <span className="text-ink-400">из {total}</span>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {items.map((c, i) => (
              <CourseCard key={c.id} course={c} index={i} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function CourseCard({ course, index }: { course: Course; index: number }) {
  return (
    <Link
      to={`/courses/${course.id}`}
      className="card group hover:border-forest-500 hover:shadow-pop transition-all flex flex-col animate-fade-up"
      style={{ animationDelay: `${index * 40}ms` }}
    >
      <div className="flex items-start justify-between gap-3">
        <LanguageMark language={course.language} size="lg" />
        <div className="flex flex-col items-end gap-1">
          <span className="pill-forest font-mono">{course.level}</span>
          <span className="text-[10px] uppercase tracking-[0.16em] font-bold text-ink-400">
            {AGE_LABEL[course.age_group]}
          </span>
        </div>
      </div>

      <h3 className="font-display text-lg font-extrabold text-ink-900 mt-5 leading-tight text-balance">
        {course.title}
      </h3>

      <p className="text-sm text-ink-600 mt-2 line-clamp-3 flex-1 leading-relaxed">
        {course.description ?? 'Описание не задано'}
      </p>

      <div className="rule mt-5 pt-4 flex items-center justify-between">
        <div className="flex items-center gap-3 text-[11px] uppercase tracking-[0.12em] font-bold text-ink-500 num">
          <span>{course.lessons_count} уроков</span>
          <span className="text-ink-300">·</span>
          <span>{course.duration_weeks} нед.</span>
        </div>
        <div className="inline-flex items-center gap-1 text-xs font-semibold text-forest-700 group-hover:gap-2 transition-all">
          Открыть
          <ArrowRight size={12} strokeWidth={2.5} />
        </div>
      </div>
    </Link>
  );
}

function FilterChip({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? 'px-3 py-1 rounded-full text-xs font-semibold bg-ink-900 text-white border border-ink-900'
          : 'px-3 py-1 rounded-full text-xs font-medium bg-paper-50 text-ink-700 border border-paper-300 hover:border-ink-700 hover:text-ink-900 transition-colors'
      }
    >
      {children}
    </button>
  );
}

function HeroFact({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: number | string;
  label: string;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 backdrop-blur border border-white/20">
        {icon}
      </div>
      <div>
        <div className="font-display text-xl font-extrabold leading-none num">{value}</div>
        <div className="text-[10px] uppercase tracking-[0.16em] font-bold text-white/70 mt-0.5">
          {label}
        </div>
      </div>
    </div>
  );
}
