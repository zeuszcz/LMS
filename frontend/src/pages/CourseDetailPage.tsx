import { Link, useParams, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  ArrowRight,
  Award,
  BadgeCheck,
  BookOpen,
  Calendar,
  ChevronDown,
  Clock,
  GraduationCap,
  Headphones,
  Quote,
  Sparkles,
  Star,
  Users,
} from 'lucide-react';
import { fetchCourse } from '@/api/courses';
import { fetchBranches } from '@/api/branches';
import { fetchUsers } from '@/api/users';
import { createRequest, fetchRequests } from '@/api/enrollment_requests';
import { LanguageMark } from '@/components/ui/LanguageMark';
import { Skeleton } from '@/components/ui/Skeleton';
import { Rating } from '@/components/ui/Rating';
import { toast } from '@/components/ui/Toast';
import { AGE_LABEL, LANGUAGE_LABEL, formatDate } from '@/lib/format';
import type { CourseFeature, CourseModule, CourseReview, GroupForCourse } from '@/types';

type LucideIcon = typeof Sparkles;
const ICON_MAP: Record<string, LucideIcon> = {
  Sparkles,
  Award,
  Users,
  Calendar,
  Headphones,
  BadgeCheck,
};

export function CourseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const course = useQuery({
    queryKey: ['course', id],
    queryFn: () => fetchCourse(id!),
    enabled: !!id,
  });
  const branches = useQuery({ queryKey: ['branches-all'], queryFn: fetchBranches });
  const users = useQuery({ queryKey: ['users-min'], queryFn: () => fetchUsers({ limit: 200 }) });
  const myRequests = useQuery({
    queryKey: ['my-requests'],
    queryFn: () => fetchRequests(),
  });

  const enrollMutation = useMutation({
    mutationFn: ({ groupId, note }: { groupId: string; note?: string }) =>
      createRequest(groupId, note),
    onSuccess: () => {
      toast(
        'success',
        'Заявка отправлена',
        'Методист рассмотрит заявку и свяжется с вами в течение часа.',
      );
      qc.invalidateQueries({ queryKey: ['my-requests'] });
      qc.invalidateQueries({ queryKey: ['active-enrollments'] });
    },
    onError: (err: { response?: { data?: { detail?: string } } }) => {
      const detail = err?.response?.data?.detail ?? 'Не удалось подать заявку';
      toast('error', 'Ошибка', detail);
    },
  });

  if (course.isLoading) {
    return (
      <div className="space-y-6 max-w-5xl">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-12 w-2/3" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-5/6" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-8">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      </div>
    );
  }
  if (!course.data) return <div className="text-terra-700">Курс не найден</div>;

  const c = course.data;
  const branchById = new Map((branches.data ?? []).map((b) => [b.id, b]));
  const userById = new Map((users.data ?? []).map((u) => [u.id, u]));

  const requestStatusByGroup = new Map(
    (myRequests.data ?? []).map((r) => [r.group_id, r.status]),
  );

  const onEnrollClick = (group: GroupForCourse) => {
    const existing = requestStatusByGroup.get(group.id);
    if (existing === 'pending') {
      toast('info', 'Заявка уже подана', 'Ждём решения методиста.');
      return;
    }
    if (existing === 'approved') {
      toast('info', 'Вы уже зачислены', 'Курс активен — откройте «Мои уроки».');
      return;
    }
    enrollMutation.mutate({ groupId: group.id });
  };

  const onTrialLessonClick = () => {
    toast('info', 'Пробный урок забронирован', 'Мы перезвоним в ближайший час.');
  };

  return (
    <div className="space-y-12">
      {/* Breadcrumb */}
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.14em] font-bold text-ink-500 hover:text-forest-700 transition-colors"
      >
        <ArrowLeft size={12} strokeWidth={2.5} />
        Все курсы
      </button>

      {/* HERO */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-forest-600 via-forest-700 to-forest-900 text-white shadow-pop-lg">
        <div className="blob bg-gold-500 h-[360px] w-[360px] -top-32 -right-20 opacity-30" />
        <div className="blob bg-forest-500 h-[480px] w-[480px] -bottom-40 -left-20 opacity-30" />

        <div className="relative grid lg:grid-cols-[1.4fr_1fr] gap-8 px-8 sm:px-12 py-12 sm:py-16">
          <div>
            <div className="flex items-center gap-3 mb-6 flex-wrap">
              <LanguageMark language={c.language} size="lg" />
              <div className="flex items-center gap-1.5">
                <span className="rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-semibold border border-white/20">
                  {c.level}
                </span>
                <span className="rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-semibold border border-white/20">
                  {AGE_LABEL[c.age_group]}
                </span>
                <span className="rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-semibold border border-white/20">
                  {LANGUAGE_LABEL[c.language]}
                </span>
              </div>
            </div>

            <h1 className="font-display text-display-xl font-extrabold tracking-tight leading-[1.0] text-balance">
              {c.title}
            </h1>

            {c.description && (
              <p className="mt-5 text-white/85 text-base sm:text-lg max-w-xl text-pretty leading-relaxed">
                {c.description}
              </p>
            )}

            {(c.avg_rating || c.reviews_count > 0) && (
              <div className="mt-6 inline-flex items-center gap-3 rounded-xl bg-white/10 backdrop-blur border border-white/20 px-4 py-2">
                <Rating value={c.avg_rating ?? 0} size={14} />
                <span className="font-semibold text-sm">
                  {(c.avg_rating ?? 0).toFixed(1)}
                </span>
                <span className="text-white/60 text-sm">·</span>
                <span className="text-white/80 text-sm">{c.reviews_count} отзывов</span>
              </div>
            )}

            <div className="mt-8 flex flex-wrap gap-3">
              <button onClick={onTrialLessonClick} className="rounded-xl bg-gold-500 hover:bg-gold-600 text-white px-5 h-11 text-sm font-semibold inline-flex items-center gap-2 shadow-pop transition-colors">
                <Sparkles size={16} strokeWidth={2.5} />
                Пробный урок
              </button>
              <a
                href="#groups"
                className="rounded-xl bg-white text-forest-700 hover:bg-paper-100 px-5 h-11 text-sm font-semibold inline-flex items-center gap-2 transition-colors"
              >
                Записаться в группу
                <ArrowRight size={16} strokeWidth={2.5} />
              </a>
            </div>
          </div>

          {/* Stats column */}
          <div className="grid grid-cols-2 gap-3 self-start">
            <HeroStat icon={<BookOpen size={16} strokeWidth={2} />} value={c.lessons_count} label="уроков" />
            <HeroStat icon={<Clock size={16} strokeWidth={2} />} value={c.duration_weeks} label="недель" />
            <HeroStat icon={<Calendar size={16} strokeWidth={2} />} value="2×" label="в неделю" />
            <HeroStat icon={<Users size={16} strokeWidth={2} />} value="≤8" label="чел. в группе" />
          </div>
        </div>
      </section>

      {/* FEATURES */}
      {c.features.length > 0 && (
        <section>
          <SectionTitle eyebrow="Что внутри" title="Почему YES" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {c.features.map((f, idx) => (
              <FeatureCard key={f.id} feature={f} index={idx} />
            ))}
          </div>
        </section>
      )}

      {/* CURRICULUM */}
      {c.modules.length > 0 && (
        <section>
          <SectionTitle eyebrow="Программа" title={`${c.modules.length} модулей`} />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="card-tinted lg:col-span-1">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-forest-600 text-white mb-3">
                <GraduationCap size={20} strokeWidth={2} />
              </div>
              <h3 className="font-display text-display-md font-extrabold text-ink-900 mb-2 text-balance">
                Поэтапная программа от A1 до уверенной речи
              </h3>
              <p className="text-sm text-ink-600 leading-relaxed">
                Курс делится на тематические модули. В каждом — 4 урока: новый материал,
                практика, ролевые игры, ревью. Финал — Mock-экзамен.
              </p>
            </div>
            <div className="lg:col-span-2 space-y-2">
              {c.modules.map((m, i) => (
                <ModuleAccordion key={m.id} module={m} index={i} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* GROUPS */}
      <section id="groups">
        <SectionTitle eyebrow="Записаться" title="Доступные группы" />
        {c.available_groups.length === 0 ? (
          <div className="card text-center py-10">
            <p className="text-ink-500">
              Пока нет открытых групп. Оставьте заявку на пробный урок — методист подберёт
              удобную программу и сообщит, когда откроется новый набор.
            </p>
            <button onClick={onTrialLessonClick} className="btn-primary mt-5">
              <Sparkles size={16} strokeWidth={2.5} /> Пробный урок
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {c.available_groups.map((g) => (
              <GroupCard
                key={g.id}
                group={g}
                branchName={g.branch_id ? branchById.get(g.branch_id)?.name : undefined}
                teacherName={g.teacher_id ? userById.get(g.teacher_id)?.full_name : undefined}
                requestStatus={requestStatusByGroup.get(g.id)}
                onEnroll={() => onEnrollClick(g)}
                pending={enrollMutation.isPending}
              />
            ))}
          </div>
        )}
      </section>

      {/* REVIEWS */}
      {c.reviews.length > 0 && (
        <section>
          <SectionTitle
            eyebrow="Отзывы"
            title={`${c.reviews_count} студентов уже прошли путь`}
            right={
              <div className="inline-flex items-baseline gap-2">
                <span className="font-display text-display-md font-extrabold text-ink-900 num">
                  {(c.avg_rating ?? 0).toFixed(1)}
                </span>
                <Rating value={c.avg_rating ?? 0} size={16} />
              </div>
            }
          />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {c.reviews.map((r) => (
              <ReviewCard key={r.id} review={r} />
            ))}
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="rounded-3xl bg-gradient-to-br from-gold-500 to-gold-700 p-8 sm:p-12 text-white text-center relative overflow-hidden">
        <div className="blob bg-white h-[300px] w-[300px] -top-20 -right-20 opacity-15" />
        <div className="relative">
          <div className="text-[10px] uppercase tracking-[0.16em] font-bold text-white/80 mb-3">
            Готовы попробовать?
          </div>
          <h2 className="font-display text-display-lg font-extrabold leading-[1.05] text-balance max-w-2xl mx-auto">
            Первый урок — бесплатный. Преподаватель оценит ваш уровень и подберёт группу.
          </h2>
          <button
            onClick={onTrialLessonClick}
            className="mt-7 rounded-xl bg-white text-gold-700 hover:bg-paper-100 px-6 h-12 text-sm font-bold inline-flex items-center gap-2 shadow-pop transition-colors"
          >
            <Sparkles size={16} strokeWidth={2.5} />
            Записаться на пробный
            <ArrowRight size={16} strokeWidth={2.5} />
          </button>
        </div>
      </section>

      <div className="text-center">
        <Link
          to="/courses"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-500 hover:text-forest-700 transition-colors"
        >
          <ArrowLeft size={14} strokeWidth={2} />
          Все курсы YES Center
        </Link>
      </div>
    </div>
  );
}

/* ─── helpers ─────────────────────────────────────────────── */

function SectionTitle({
  eyebrow,
  title,
  right,
}: {
  eyebrow: string;
  title: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="flex items-end justify-between mb-6 flex-wrap gap-3">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h2 className="font-display text-display-md font-extrabold text-ink-900 tracking-tight text-balance">
          {title}
        </h2>
      </div>
      {right}
    </div>
  );
}

function HeroStat({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: number | string;
  label: string;
}) {
  return (
    <div className="rounded-xl bg-white/10 backdrop-blur border border-white/15 p-4">
      <div className="text-white/70">{icon}</div>
      <div className="font-display text-2xl font-extrabold leading-none mt-2 num">{value}</div>
      <div className="text-[11px] uppercase tracking-[0.14em] font-bold text-white/70 mt-1">
        {label}
      </div>
    </div>
  );
}

function FeatureCard({ feature, index }: { feature: CourseFeature; index: number }) {
  const Icon = ICON_MAP[feature.icon ?? 'Sparkles'] ?? Sparkles;
  return (
    <div
      className="card hover:border-forest-500 hover:shadow-pop transition-all animate-fade-up"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-forest-50 text-forest-600 mb-4">
        <Icon size={20} strokeWidth={2} />
      </div>
      <h3 className="font-display text-base font-bold text-ink-900 mb-1.5 leading-tight text-balance">
        {feature.title}
      </h3>
      {feature.description && (
        <p className="text-sm text-ink-600 leading-relaxed">{feature.description}</p>
      )}
    </div>
  );
}

function ModuleAccordion({ module, index }: { module: CourseModule; index: number }) {
  const [open, setOpen] = useState(index === 0);
  return (
    <div
      className={
        open
          ? 'rounded-2xl border-2 border-forest-500 bg-forest-50/40 transition-all'
          : 'rounded-2xl border border-paper-300 bg-paper-50 hover:border-forest-300 transition-all'
      }
    >
      <button
        type="button"
        onClick={() => setOpen((x) => !x)}
        className="w-full flex items-center gap-4 px-5 py-4 text-left"
      >
        <span className="font-display text-2xl font-extrabold text-forest-600 num w-10 flex-shrink-0">
          {String(module.order_index).padStart(2, '0')}
        </span>
        <span className="flex-1 min-w-0">
          <div className="font-display text-base font-bold text-ink-900 truncate">
            {module.title}
          </div>
          <div className="text-xs text-ink-500 mt-0.5">{module.lessons_count} уроков</div>
        </span>
        <ChevronDown
          size={18}
          strokeWidth={2}
          className={open ? 'text-forest-600 transition-transform rotate-180' : 'text-ink-400 transition-transform'}
        />
      </button>
      {open && module.summary && (
        <div className="px-5 pb-5 pl-[calc(20px+40px+16px)] -mt-1 text-sm text-ink-700 leading-relaxed animate-fade-up">
          {module.summary}
        </div>
      )}
    </div>
  );
}

function GroupCard({
  group,
  branchName,
  teacherName,
  onEnroll,
  requestStatus,
  pending,
}: {
  group: GroupForCourse;
  branchName?: string;
  teacherName?: string;
  onEnroll: () => void;
  requestStatus?: string;
  pending?: boolean;
}) {
  const seatsLeft = group.max_students - group.enrolled_count;
  const fillPct = Math.min(100, Math.round((group.enrolled_count / group.max_students) * 100));
  const tone =
    seatsLeft <= 0
      ? 'bg-terra-500'
      : seatsLeft <= 2
      ? 'bg-gold-500'
      : 'bg-sage-500';

  return (
    <div className="card flex flex-col">
      <div className="flex items-start justify-between gap-2 mb-4">
        <span className="pill-forest font-semibold uppercase">
          {group.mode === 'online' ? 'Онлайн' : group.mode === 'hybrid' ? 'Гибрид' : 'Офлайн'}
        </span>
        <span className="text-xs text-ink-500 num">с {formatDate(group.start_date)}</span>
      </div>
      <div className="font-display text-base font-bold text-ink-900 mb-1">
        {branchName ?? 'Онлайн-формат'}
      </div>
      {teacherName && (
        <div className="text-sm text-ink-600">Преподаватель: {teacherName}</div>
      )}

      <div className="mt-5 flex-1">
        <div className="flex items-baseline justify-between text-xs mb-1.5">
          <span className="text-ink-500 font-semibold">
            {group.enrolled_count} / {group.max_students} мест занято
          </span>
          <span className={
            seatsLeft <= 0
              ? 'text-terra-700 font-bold'
              : seatsLeft <= 2
              ? 'text-gold-700 font-bold'
              : 'text-sage-700 font-bold'
          }>
            {seatsLeft <= 0 ? 'Группа набрана' : `Осталось мест: ${seatsLeft}`}
          </span>
        </div>
        <div className="h-1.5 rounded-full bg-paper-200 overflow-hidden">
          <div className={`h-full rounded-full ${tone} transition-all`} style={{ width: `${fillPct}%` }} />
        </div>
      </div>

      {requestStatus === 'approved' ? (
        <Link to="/" className="btn-primary mt-5 w-full">
          Открыть кабинет <ArrowRight size={14} strokeWidth={2.5} />
        </Link>
      ) : requestStatus === 'pending' ? (
        <button disabled className="btn-secondary mt-5 w-full">
          Заявка на рассмотрении
        </button>
      ) : requestStatus === 'rejected' ? (
        <button onClick={onEnroll} disabled={pending || seatsLeft <= 0} className="btn-secondary mt-5 w-full">
          Подать заявку снова
        </button>
      ) : (
        <button
          onClick={onEnroll}
          disabled={pending || seatsLeft <= 0}
          className={
            seatsLeft <= 0
              ? 'btn-secondary mt-5 w-full disabled:opacity-50'
              : 'btn-primary mt-5 w-full'
          }
        >
          {seatsLeft <= 0 ? 'Группа набрана' : pending ? 'Отправка…' : (
            <>
              Записаться <ArrowRight size={14} strokeWidth={2.5} />
            </>
          )}
        </button>
      )}
    </div>
  );
}

function ReviewCard({ review }: { review: CourseReview }) {
  const initials = review.author_name.split(' ').slice(0, 2).map((p) => p[0]).join('').toUpperCase();
  return (
    <div className="card flex flex-col">
      <Quote size={20} strokeWidth={1.6} className="text-forest-300 mb-3" />
      <p className="text-sm text-ink-700 leading-relaxed flex-1 text-pretty">
        «{review.body}»
      </p>
      <div className="mt-5 pt-4 border-t border-paper-300 flex items-center gap-3">
        <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-forest-500 to-forest-700 text-white text-xs font-bold flex-shrink-0">
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-ink-900 truncate">{review.author_name}</div>
          <Rating value={review.rating} size={12} className="mt-0.5" />
        </div>
        <Star
          size={12}
          strokeWidth={1.6}
          className="fill-gold-500 text-gold-500 flex-shrink-0"
        />
      </div>
    </div>
  );
}
