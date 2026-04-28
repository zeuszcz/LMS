import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowRight,
  Award,
  Filter,
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
  const [filtersOpen, setFiltersOpen] = useState(false);

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
  const featured = items[0];
  const rest = items.slice(1);

  const activeFilters =
    (lang ? 1 : 0) + (level ? 1 : 0) + (age !== 'all' ? 1 : 0) + (search ? 1 : 0);

  return (
    <div className="space-y-6">
      {/* Compact hero strip */}
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <div className="text-[11px] uppercase tracking-[0.16em] font-bold text-forest-600 mb-2">
            Каталог YES Center
          </div>
          <h1 className="font-display text-display-lg font-extrabold text-ink-900 tracking-tight leading-[1.0] text-balance">
            8 языков. 6 уровней. Один путь — ваш.
          </h1>
          <p className="text-ink-500 mt-2 text-sm">
            Авторская методика FLæʃcom · Cambridge English · группы до 8 человек.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-paper-50 border border-paper-300 px-3 py-2 shadow-soft inline-flex items-center gap-2">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-forest-50 text-forest-700">
              <GraduationCap size={14} strokeWidth={2} />
            </span>
            <div className="leading-none">
              <div className="font-display text-base font-extrabold num text-ink-900">{total}</div>
              <div className="text-[9px] uppercase tracking-[0.16em] font-bold text-ink-400 mt-0.5">
                курсов
              </div>
            </div>
          </div>
          <div className="rounded-2xl bg-paper-50 border border-paper-300 px-3 py-2 shadow-soft inline-flex items-center gap-2">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-gold-50 text-gold-700">
              <Award size={14} strokeWidth={2} />
            </span>
            <div className="leading-none">
              <div className="font-display text-base font-extrabold num text-ink-900">≤ 8</div>
              <div className="text-[9px] uppercase tracking-[0.16em] font-bold text-ink-400 mt-0.5">
                в группе
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky filter bar */}
      <div className="sticky top-16 z-10 -mx-5 lg:-mx-8 px-5 lg:px-8 py-3 bg-paper-100/85 backdrop-blur border-b border-paper-300">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Age tabs */}
          <div className="inline-flex p-1 rounded-2xl bg-paper-50 border border-paper-300">
            {AGE_TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setAge(t.key)}
                className={
                  age === t.key
                    ? 'px-4 h-8 rounded-xl text-xs font-bold bg-forest-600 text-white shadow-pop'
                    : 'px-4 h-8 rounded-xl text-xs font-medium text-ink-500 hover:text-ink-900 transition-colors'
                }
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative flex-1 min-w-[220px] max-w-sm">
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
              className="input pl-10 h-9 text-sm"
            />
          </div>

          {/* Filter toggle */}
          <button
            onClick={() => setFiltersOpen((x) => !x)}
            className={
              filtersOpen || activeFilters > 0
                ? 'inline-flex items-center gap-2 h-9 px-3 rounded-xl bg-forest-600 text-white text-xs font-bold shadow-pop'
                : 'inline-flex items-center gap-2 h-9 px-3 rounded-xl bg-paper-50 border border-paper-300 text-ink-700 text-xs font-medium hover:border-ink-700 transition-colors'
            }
          >
            <Filter size={12} strokeWidth={2.5} />
            Фильтры
            {activeFilters > 0 && (
              <span
                className={
                  filtersOpen
                    ? 'inline-flex h-4 min-w-4 items-center justify-center px-1 rounded-full bg-white text-forest-700 text-[10px] font-extrabold'
                    : 'inline-flex h-4 min-w-4 items-center justify-center px-1 rounded-full bg-forest-600 text-white text-[10px] font-extrabold'
                }
              >
                {activeFilters}
              </span>
            )}
          </button>

          {activeFilters > 0 && (
            <button
              onClick={() => {
                setAge('all');
                setLang(null);
                setLevel(null);
                setSearch('');
              }}
              className="text-xs text-ink-500 hover:text-ink-900 underline underline-offset-2"
            >
              Сбросить
            </button>
          )}
        </div>

        {filtersOpen && (
          <div className="mt-3 grid gap-2 animate-fade-up">
            <div className="flex flex-wrap gap-1.5 items-center">
              <span className="text-[10px] uppercase tracking-[0.16em] font-bold text-ink-400 w-20">Язык</span>
              <FilterChip active={lang === null} onClick={() => setLang(null)}>Все</FilterChip>
              {ALL_LANG.map((l) => (
                <FilterChip key={l} active={lang === l} onClick={() => setLang(lang === l ? null : l)}>
                  {LANGUAGE_LABEL[l]}
                </FilterChip>
              ))}
            </div>
            <div className="flex flex-wrap gap-1.5 items-center">
              <span className="text-[10px] uppercase tracking-[0.16em] font-bold text-ink-400 w-20">Уровень</span>
              <FilterChip active={level === null} onClick={() => setLevel(null)}>Все</FilterChip>
              {ALL_LEVEL.map((l) => (
                <FilterChip key={l} active={level === l} onClick={() => setLevel(level === l ? null : l)}>
                  {l}
                </FilterChip>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Results — bento grid */}
      {courses.isLoading ? (
        <div className="grid grid-cols-12 gap-4">
          <Skeleton className="col-span-12 lg:col-span-8 h-72 rounded-3xl" />
          <Skeleton className="col-span-12 lg:col-span-4 h-72 rounded-2xl" />
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="col-span-12 sm:col-span-6 lg:col-span-4 h-56 rounded-2xl" />
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
        <div className="grid grid-cols-12 gap-4">
          {/* Featured course */}
          {featured && <FeaturedCourseCard course={featured} />}
          {/* Rest as standard tiles */}
          {rest.map((c, i) => (
            <CourseCard key={c.id} course={c} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}

function FeaturedCourseCard({ course }: { course: Course }) {
  return (
    <Link
      to={`/courses/${course.id}`}
      className="group col-span-12 lg:col-span-8 row-span-1 relative overflow-hidden rounded-3xl bg-gradient-to-br from-forest-600 via-forest-700 to-forest-900 text-white p-8 lg:p-10 shadow-pop-lg tappable min-h-[280px] flex flex-col"
    >
      <div className="blob bg-gold-500 h-[300px] w-[300px] -top-24 -right-24 opacity-30" />
      <div className="blob bg-forest-500 h-[400px] w-[400px] -bottom-32 -left-20 opacity-30" />

      <div className="relative flex-1 flex flex-col">
        <div className="flex items-center gap-3 mb-5">
          <LanguageMark language={course.language} size="lg" />
          <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-[10px] uppercase tracking-[0.16em] font-bold border border-white/20">
            <Sparkles size={11} strokeWidth={2.5} />
            Featured · {course.level}
          </div>
        </div>

        <h2 className="font-display text-display-xl font-extrabold tracking-tight leading-[1.0] text-balance max-w-2xl">
          {course.title}
        </h2>
        {course.description && (
          <p className="mt-4 text-white/85 text-base sm:text-lg max-w-2xl text-pretty leading-relaxed line-clamp-3">
            {course.description}
          </p>
        )}

        <div className="mt-auto pt-7 flex items-end justify-between flex-wrap gap-4">
          <div className="flex items-center gap-5 text-white/80 text-xs">
            <div>
              <div className="font-display text-2xl font-extrabold text-white num">
                {course.lessons_count}
              </div>
              <div className="text-[9px] uppercase tracking-[0.16em] font-bold mt-0.5">уроков</div>
            </div>
            <div>
              <div className="font-display text-2xl font-extrabold text-white num">
                {course.duration_weeks}
              </div>
              <div className="text-[9px] uppercase tracking-[0.16em] font-bold mt-0.5">недель</div>
            </div>
            <div>
              <div className="font-display text-2xl font-extrabold text-white">
                {AGE_LABEL[course.age_group]}
              </div>
              <div className="text-[9px] uppercase tracking-[0.16em] font-bold mt-0.5">аудитория</div>
            </div>
          </div>
          <div className="inline-flex items-center gap-2 rounded-xl bg-white text-forest-700 px-5 h-11 text-sm font-bold shadow-pop group-hover:gap-3 transition-all">
            Открыть курс
            <ArrowRight size={14} strokeWidth={2.5} />
          </div>
        </div>
      </div>
    </Link>
  );
}

function CourseCard({ course, index }: { course: Course; index: number }) {
  // First slot (4-col): special compact stat card with bigger language mark
  // Else: standard 4-col cards
  return (
    <Link
      to={`/courses/${course.id}`}
      className="group col-span-12 sm:col-span-6 lg:col-span-4 card tappable hover:border-forest-500 hover:shadow-pop transition-all flex flex-col animate-fade-up"
      style={{ animationDelay: `${index * 30}ms` }}
    >
      <div className="flex items-start justify-between gap-3">
        <LanguageMark language={course.language} size="lg" />
        <div className="flex flex-col items-end gap-1">
          <span className="pill-forest font-bold font-mono">{course.level}</span>
          <span className="text-[10px] uppercase tracking-[0.16em] font-bold text-ink-400">
            {AGE_LABEL[course.age_group]}
          </span>
        </div>
      </div>

      <h3 className="font-display text-base font-extrabold text-ink-900 mt-5 leading-tight text-balance">
        {course.title}
      </h3>

      <p className="text-sm text-ink-600 mt-2 line-clamp-2 flex-1 leading-relaxed">
        {course.description ?? 'Описание не задано'}
      </p>

      <div className="mt-5 pt-4 border-t border-paper-300 flex items-center justify-between">
        <div className="flex items-center gap-3 text-[11px] uppercase tracking-[0.12em] font-bold text-ink-500 num">
          <span>{course.lessons_count} ур.</span>
          <span className="text-ink-300">·</span>
          <span>{course.duration_weeks} нед.</span>
        </div>
        <div className="inline-flex items-center gap-1 text-xs font-bold text-forest-700 group-hover:gap-2 transition-all">
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
          ? 'px-3 h-7 rounded-full text-xs font-bold bg-ink-900 text-white border border-ink-900'
          : 'px-3 h-7 rounded-full text-xs font-medium bg-paper-50 text-ink-700 border border-paper-300 hover:border-ink-700 hover:text-ink-900 transition-colors'
      }
    >
      {children}
    </button>
  );
}
