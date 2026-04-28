import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock,
  Lock,
  PlayCircle,
  Sparkles,
} from 'lucide-react';
import { fetchCourse, fetchModuleLessons } from '@/api/courses';
import { Skeleton } from '@/components/ui/Skeleton';
import { LanguageMark } from '@/components/ui/LanguageMark';
import { ProgressRing } from '@/components/ui/ProgressChart';
import { LANGUAGE_LABEL } from '@/lib/format';

export function ModulePage() {
  const { courseId, order } = useParams<{ courseId: string; order: string }>();
  const moduleOrder = Number(order);

  const course = useQuery({
    queryKey: ['course', courseId],
    queryFn: () => fetchCourse(courseId!),
    enabled: !!courseId,
  });
  const moduleData = useQuery({
    queryKey: ['module', courseId, moduleOrder],
    queryFn: () => fetchModuleLessons(courseId!, moduleOrder),
    enabled: !!courseId && !!moduleOrder,
  });

  if (course.isLoading || moduleData.isLoading) {
    return (
      <div className="space-y-4 max-w-5xl">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-12 w-2/3" />
        <Skeleton className="h-3 w-full" />
      </div>
    );
  }
  if (!course.data || !moduleData.data) {
    return <div className="text-terra-700">Модуль не найден</div>;
  }

  const c = course.data;
  const m = moduleData.data;
  const totalModules = c.modules.length;
  const prev = moduleOrder > 1 ? moduleOrder - 1 : null;
  const next = moduleOrder < totalModules ? moduleOrder + 1 : null;
  const pct = m.total > 0 ? m.completed / m.total : 0;

  // First incomplete lesson — call to action
  const firstIncomplete = m.lessons.find((l) => !l.is_completed);
  const allDone = m.lessons.length > 0 && m.completed === m.total;

  return (
    <div className="space-y-8">
      {/* Breadcrumb back */}
      <Link
        to={`/courses/${courseId}`}
        className="inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.16em] font-bold text-ink-500 hover:text-forest-700 transition-colors"
      >
        <ArrowLeft size={12} strokeWidth={2.5} />
        Назад к курсу
      </Link>

      {/* HERO — split layout */}
      <section className="grid grid-cols-12 gap-5">
        {/* Left: identity + title + summary */}
        <div className="col-span-12 lg:col-span-8 relative overflow-hidden rounded-3xl bg-gradient-to-br from-forest-600 via-forest-700 to-forest-900 text-white p-8 lg:p-10 shadow-pop-lg">
          <div className="blob bg-gold-500 h-[300px] w-[300px] -top-20 -right-20 opacity-30" />
          <div className="blob bg-forest-500 h-[400px] w-[400px] -bottom-32 -left-20 opacity-30" />

          <div className="relative flex flex-col h-full min-h-[320px]">
            <div className="flex items-center gap-3 mb-5 flex-wrap">
              <LanguageMark language={c.language} size="md" />
              <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-[10px] uppercase tracking-[0.16em] font-bold border border-white/20">
                <BookOpen size={11} strokeWidth={2.5} />
                Модуль {moduleOrder} из {totalModules}
              </div>
              {!m.enrolled && (
                <div className="inline-flex items-center gap-1.5 rounded-full bg-gold-500/30 backdrop-blur px-3 py-1 text-[10px] uppercase tracking-[0.16em] font-bold border border-gold-300/40 text-gold-50">
                  <Sparkles size={11} strokeWidth={2.5} />
                  Превью
                </div>
              )}
            </div>

            <div className="text-white/70 text-sm font-semibold mb-2">
              {LANGUAGE_LABEL[c.language]} · {c.level} · {c.title}
            </div>
            <h1 className="font-display text-display-xl font-extrabold tracking-tight leading-[1.0] text-balance">
              {m.module_title}
            </h1>
            {m.module_summary && (
              <p className="mt-4 text-white/85 text-base sm:text-lg max-w-xl text-pretty leading-relaxed">
                {m.module_summary}
              </p>
            )}

            {firstIncomplete && (
              <Link
                to={`/lessons/${firstIncomplete.id}`}
                className="mt-auto pt-7 inline-flex items-center gap-2 rounded-xl bg-white text-forest-700 hover:bg-paper-100 px-5 h-11 text-sm font-bold shadow-pop transition-colors self-start"
              >
                <PlayCircle size={16} strokeWidth={2.5} />
                {m.completed === 0 ? 'Начать модуль' : 'Продолжить'} ·{' '}
                {firstIncomplete.title.replace(/^Lesson \d+:\s*/, '')}
                <ArrowRight size={14} strokeWidth={2.5} />
              </Link>
            )}
            {allDone && (
              <div className="mt-auto pt-7 inline-flex items-center gap-2 rounded-xl bg-sage-500 text-white px-5 h-11 text-sm font-bold shadow-pop self-start">
                <CheckCircle2 size={16} strokeWidth={2.5} />
                Модуль пройден
              </div>
            )}
          </div>
        </div>

        {/* Right: progress card */}
        <div className="col-span-12 lg:col-span-4 card-elevated flex flex-col items-center text-center bg-gradient-to-br from-sage-50 to-paper-50">
          <div className="text-[10px] uppercase tracking-[0.16em] font-bold text-sage-700 mb-3">
            Прогресс модуля
          </div>
          <ProgressRing value={pct} size={160} stroke={14} className="text-sage-600" />
          <div className="mt-5 font-display text-2xl font-extrabold text-ink-900 num">
            {m.completed} <span className="text-ink-300 font-bold">/ {m.total}</span>
          </div>
          <div className="text-xs text-ink-500 mt-1">уроков пройдено</div>
        </div>
      </section>

      {/* Timeline of lessons */}
      <section>
        <div className="flex items-center gap-2 mb-5">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-forest-50 text-forest-600">
            <BookOpen size={14} strokeWidth={2.5} />
          </span>
          <h2 className="font-display text-lg font-extrabold text-ink-900">
            Уроки модуля
          </h2>
        </div>

        {m.lessons.length === 0 ? (
          <div className="card text-center py-12">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-paper-200 text-ink-500 mb-4">
              <BookOpen size={20} strokeWidth={1.6} />
            </div>
            <h3 className="font-display text-display-md font-extrabold text-ink-900">
              Уроков пока нет
            </h3>
            <p className="text-ink-500 mt-2 max-w-md mx-auto text-pretty">
              Уроки модуля появятся, как только администратор создаст их в расписании группы.
            </p>
          </div>
        ) : (
          <div className="relative pl-7 lg:pl-10 space-y-3">
            {/* Vertical connector line */}
            <div
              className="absolute left-[14px] lg:left-[19px] top-3 bottom-3 w-0.5 bg-paper-300"
              aria-hidden
            />
            {m.lessons.map((l, i) => {
              const isLocked = !m.enrolled && !l.content_md;
              const isCurrent =
                !l.is_completed &&
                (i === 0 || m.lessons[i - 1].is_completed);

              return (
                <Link
                  key={l.id}
                  to={`/lessons/${l.id}`}
                  className={
                    isLocked
                      ? 'block opacity-60 pointer-events-none'
                      : 'block group relative'
                  }
                >
                  {/* Timeline dot */}
                  <div className="absolute -left-7 lg:-left-10 top-6 z-10">
                    {l.is_completed ? (
                      <div className="h-7 w-7 rounded-full bg-sage-500 text-white inline-flex items-center justify-center shadow-pop ring-4 ring-paper-100">
                        <CheckCircle2 size={14} strokeWidth={2.5} />
                      </div>
                    ) : isLocked ? (
                      <div className="h-7 w-7 rounded-full bg-paper-300 text-ink-500 inline-flex items-center justify-center ring-4 ring-paper-100">
                        <Lock size={12} strokeWidth={2} />
                      </div>
                    ) : isCurrent ? (
                      <div className="h-7 w-7 rounded-full bg-forest-600 text-white inline-flex items-center justify-center shadow-pop ring-4 ring-paper-100 group-hover:scale-110 transition-transform">
                        <PlayCircle size={14} strokeWidth={2} fill="currentColor" />
                      </div>
                    ) : (
                      <div className="h-7 w-7 rounded-full bg-paper-50 border-2 border-paper-300 text-ink-500 inline-flex items-center justify-center font-display text-xs font-extrabold num ring-4 ring-paper-100">
                        {l.sequence}
                      </div>
                    )}
                  </div>

                  {/* Card */}
                  <div
                    className={
                      l.is_completed
                        ? 'rounded-2xl border border-sage-300 bg-sage-50/50 p-5 transition-all'
                        : isCurrent
                        ? 'rounded-2xl border-2 border-forest-500 bg-paper-50 p-5 shadow-pop tappable'
                        : 'rounded-2xl border border-paper-300 bg-paper-50 p-5 hover:border-forest-500 hover:shadow-soft transition-all tappable'
                    }
                  >
                    <div className="flex items-start gap-4 flex-wrap">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1.5">
                          <span className="text-[10px] uppercase tracking-[0.16em] font-bold text-ink-400 num">
                            Урок {l.sequence}
                          </span>
                          {l.is_completed && (
                            <span className="pill-sage font-bold">
                              <CheckCircle2 size={10} strokeWidth={2.5} />
                              Пройден
                            </span>
                          )}
                          {isCurrent && (
                            <span className="pill-forest font-bold">
                              <PlayCircle size={10} strokeWidth={2.5} fill="currentColor" />
                              Сейчас
                            </span>
                          )}
                        </div>
                        <h3 className="font-display text-base font-extrabold text-ink-900 leading-tight text-balance">
                          {l.title.replace(/^Lesson \d+:\s*/, '')}
                        </h3>
                        {l.summary && (
                          <p className="text-sm text-ink-600 mt-2 line-clamp-2 leading-relaxed">
                            {l.summary}
                          </p>
                        )}
                        <div className="mt-3 flex items-center gap-3 text-xs text-ink-500 flex-wrap">
                          <span className="inline-flex items-center gap-1 num">
                            <Clock size={11} strokeWidth={2} /> {l.duration_min} мин
                          </span>
                          {l.content_md && (
                            <span className="inline-flex items-center gap-1">
                              <BookOpen size={11} strokeWidth={2} /> Материал
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex-shrink-0 self-center">
                        <span
                          className={
                            l.is_completed
                              ? 'inline-flex items-center gap-1 text-xs font-bold text-sage-700'
                              : isLocked
                              ? 'inline-flex items-center gap-1 text-xs font-bold text-ink-400'
                              : 'inline-flex items-center gap-1 text-xs font-bold text-forest-700 group-hover:gap-2 transition-all'
                          }
                        >
                          {l.is_completed
                            ? 'Перечитать'
                            : isLocked
                            ? 'Закрыто'
                            : 'Открыть'}
                          {!isLocked && <ArrowRight size={12} strokeWidth={2.5} />}
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* Module nav */}
      <nav className="flex items-center justify-between gap-3 pt-6 border-t border-paper-300 flex-wrap">
        {prev ? (
          <Link to={`/courses/${courseId}/modules/${prev}`} className="btn-secondary">
            <ArrowLeft size={14} strokeWidth={2.5} /> Модуль {prev}
          </Link>
        ) : (
          <div />
        )}
        {next ? (
          <Link to={`/courses/${courseId}/modules/${next}`} className="btn-primary">
            Модуль {next} <ArrowRight size={14} strokeWidth={2.5} />
          </Link>
        ) : (
          <Link to={`/courses/${courseId}`} className="btn-secondary">
            К курсу <ArrowRight size={14} strokeWidth={2.5} />
          </Link>
        )}
      </nav>
    </div>
  );
}
