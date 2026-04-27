import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock,
  Lock,
  Sparkles,
} from 'lucide-react';
import { fetchCourse, fetchModuleLessons } from '@/api/courses';
import { Skeleton } from '@/components/ui/Skeleton';
import { LanguageMark } from '@/components/ui/LanguageMark';
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

  const pct = m.total > 0 ? Math.round((m.completed / m.total) * 100) : 0;

  return (
    <div className="space-y-8">
      <Link
        to={`/courses/${courseId}`}
        className="inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.14em] font-bold text-ink-500 hover:text-forest-700 transition-colors"
      >
        <ArrowLeft size={12} strokeWidth={2.5} /> К курсу
      </Link>

      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-forest-600 via-forest-700 to-forest-900 text-white shadow-pop-lg">
        <div className="blob bg-gold-500 h-[320px] w-[320px] -top-20 -right-20 opacity-30" />
        <div className="blob bg-forest-500 h-[420px] w-[420px] -bottom-32 -left-20 opacity-30" />

        <div className="relative px-8 sm:px-12 py-10 sm:py-12 grid lg:grid-cols-[1.4fr_1fr] gap-8 items-center">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <LanguageMark language={c.language} size="md" />
              <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-[10px] uppercase tracking-[0.14em] font-bold border border-white/20">
                <BookOpen size={10} strokeWidth={2.5} />
                Модуль {moduleOrder} из {totalModules}
              </div>
            </div>
            <div className="text-white/70 text-sm font-semibold mb-1">{LANGUAGE_LABEL[c.language]} · {c.level} · {c.title}</div>
            <h1 className="font-display text-display-xl font-extrabold tracking-tight leading-[1.0] text-balance">
              {m.module_title}
            </h1>
            {m.module_summary && (
              <p className="mt-4 text-white/85 text-base sm:text-lg max-w-xl text-pretty leading-relaxed">
                {m.module_summary}
              </p>
            )}

            {!m.enrolled && (
              <div className="mt-5 inline-flex items-center gap-2 rounded-xl bg-gold-500/30 backdrop-blur border border-gold-300/40 text-gold-50 px-3 py-2 text-xs font-semibold">
                <Sparkles size={12} strokeWidth={2.5} />
                Превью — запишитесь в группу, чтобы отслеживать прогресс
              </div>
            )}
          </div>

          {/* Progress ring */}
          <div className="rounded-2xl bg-white/10 backdrop-blur border border-white/15 p-5">
            <div className="text-[10px] uppercase tracking-[0.16em] font-bold text-white/70 mb-2">
              Прогресс модуля
            </div>
            <div className="flex items-baseline gap-2">
              <span className="font-display text-display-xl font-extrabold num leading-none">{pct}%</span>
              <span className="text-sm text-white/70">пройдено</span>
            </div>
            <div className="text-xs text-white/80 mt-1 num">
              {m.completed} из {m.total} уроков
            </div>
            <div className="h-2 rounded-full bg-white/15 overflow-hidden mt-4">
              <div
                className="h-full rounded-full bg-gradient-to-r from-gold-300 to-gold-500 transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Lessons list */}
      {m.lessons.length === 0 ? (
        <div className="card text-center py-12">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-paper-200 text-ink-500 mb-4">
            <BookOpen size={20} strokeWidth={1.6} />
          </div>
          <h3 className="font-display text-display-md font-extrabold text-ink-900">Уроков пока нет</h3>
          <p className="text-ink-500 mt-2 max-w-md mx-auto text-pretty">
            Уроки модуля появятся, как только администратор создаст их в расписании группы.
          </p>
        </div>
      ) : (
        <section className="space-y-3">
          {m.lessons.map((l, i) => {
            const isLocked = !m.enrolled && !l.content_md;
            const cardClasses = l.is_completed
              ? 'card border-sage-300 bg-sage-50/30'
              : 'card hover:border-forest-500 hover:shadow-pop transition-all';

            return (
              <Link
                key={l.id}
                to={`/lessons/${l.id}`}
                className={cardClasses + ' block group'}
                style={{ animationDelay: `${i * 30}ms` }}
              >
                <div className="flex items-start gap-4 flex-wrap">
                  <div className="flex-shrink-0">
                    {l.is_completed ? (
                      <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-sage-500 text-white shadow-pop">
                        <CheckCircle2 size={20} strokeWidth={2.5} />
                      </div>
                    ) : isLocked ? (
                      <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-paper-200 text-ink-400">
                        <Lock size={18} strokeWidth={2} />
                      </div>
                    ) : (
                      <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-paper-100 border border-paper-300 text-forest-600 group-hover:bg-forest-600 group-hover:text-white transition-colors">
                        <span className="font-display font-extrabold text-base num">
                          {String(l.sequence).padStart(2, '0')}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className="font-display text-base font-extrabold text-ink-900 truncate">
                        {l.title}
                      </h3>
                      {l.is_completed && (
                        <span className="pill-sage font-semibold">
                          <CheckCircle2 size={10} strokeWidth={2.5} /> Пройден
                        </span>
                      )}
                    </div>
                    {l.summary && (
                      <p className="text-sm text-ink-600 line-clamp-2 leading-relaxed">{l.summary}</p>
                    )}
                    <div className="mt-2 flex items-center gap-3 text-xs text-ink-500">
                      <span className="inline-flex items-center gap-1 num">
                        <Clock size={12} strokeWidth={1.6} /> {l.duration_min} мин
                      </span>
                      {l.content_md && (
                        <span className="inline-flex items-center gap-1">
                          <BookOpen size={12} strokeWidth={1.6} /> Есть материал
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex-shrink-0">
                    <div
                      className={
                        l.is_completed
                          ? 'inline-flex items-center gap-1 text-sm font-semibold text-sage-700'
                          : 'inline-flex items-center gap-1 text-sm font-semibold text-forest-700 group-hover:gap-2 transition-all'
                      }
                    >
                      {l.is_completed ? 'Перечитать' : 'Открыть'}
                      <ArrowRight size={14} strokeWidth={2.5} />
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </section>
      )}

      {/* Next/prev module nav */}
      <nav className="flex items-center justify-between gap-3 pt-6 border-t border-paper-300">
        {prev ? (
          <Link
            to={`/courses/${courseId}/modules/${prev}`}
            className="btn-secondary"
          >
            <ArrowLeft size={14} strokeWidth={2.5} /> Модуль {prev}
          </Link>
        ) : (
          <div />
        )}
        {next ? (
          <Link
            to={`/courses/${courseId}/modules/${next}`}
            className="btn-primary"
          >
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
