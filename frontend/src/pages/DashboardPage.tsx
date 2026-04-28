import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowUpRight,
  BookOpen,
  Building2,
  CalendarClock,
  Clock,
  GraduationCap,
  Layers,
  Mail,
  PenLine,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Users,
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { fetchLessons } from '@/api/lessons';
import { fetchAssignments } from '@/api/assignments';
import { fetchProgress } from '@/api/progress';
import { fetchGroups } from '@/api/groups';
import { fetchBranches } from '@/api/branches';
import { fetchUsers } from '@/api/users';
import { fetchMyActiveEnrollments, fetchRequests } from '@/api/enrollment_requests';
import { Stat } from '@/components/ui/Stat';
import { Skeleton, SkeletonCard } from '@/components/ui/Skeleton';
import { LanguageMark } from '@/components/ui/LanguageMark';
import { LessonStatusPill } from '@/components/ui/StatusPill';
import { ProgressRing, SkillBars } from '@/components/ui/ProgressChart';
import { formatDateTime, relativeTime } from '@/lib/format';

export function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  if (!user) return null;
  const roles = user.roles;
  const superuser = user.is_superuser;

  if (superuser || roles.includes('admin')) return <AdminDashboard />;
  if (roles.includes('teacher')) return <TeacherDashboard />;
  if (roles.includes('parent')) return <ParentDashboard />;
  if (roles.includes('student')) return <StudentDashboard />;
  if (roles.includes('methodist') || roles.includes('branch_manager')) return <AdminDashboard />;
  return <div className="text-ink-500">Для вашей роли дашборд ещё не настроен.</div>;
}

/* ─── HERO ────────────────────────────────────────────────── */

function HeroCard({
  eyebrow,
  greeting,
  subline,
  cta,
}: {
  eyebrow: string;
  greeting: string;
  subline: string;
  cta?: { to: string; label: string };
}) {
  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-forest-600 via-forest-700 to-forest-900 px-8 py-10 sm:px-12 sm:py-14 text-white shadow-pop-lg">
      <div className="blob bg-gold-500 h-[300px] w-[300px] -top-20 -right-20 opacity-30" />
      <div className="blob bg-forest-500 h-[400px] w-[400px] -bottom-32 -left-20 opacity-30" />

      <div className="relative z-10 max-w-3xl">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-[10px] uppercase tracking-[0.16em] font-bold text-white mb-5 border border-white/20">
          <Sparkles size={11} strokeWidth={2} />
          {eyebrow}
        </div>
        <h1 className="font-display text-display-xl font-extrabold tracking-tight leading-[1.0] text-balance">
          Здравствуйте, {greeting}
        </h1>
        <p className="mt-4 text-white/80 text-base sm:text-lg max-w-xl text-pretty leading-relaxed">
          {subline}
        </p>
        {cta && (
          <Link
            to={cta.to}
            className="mt-7 inline-flex items-center gap-2 rounded-xl bg-white text-forest-700 hover:bg-paper-100 px-5 h-11 text-sm font-semibold tracking-tight transition-colors shadow-pop"
          >
            {cta.label}
            <ArrowUpRight size={16} strokeWidth={2.5} />
          </Link>
        )}
      </div>
    </div>
  );
}

/* ─── STUDENT ─────────────────────────────────────────────── */

function StudentDashboard() {
  const user = useAuthStore((s) => s.user)!;
  const lessons = useQuery({ queryKey: ['lessons-mine'], queryFn: () => fetchLessons() });
  const assignments = useQuery({
    queryKey: ['hw-mine'],
    queryFn: () => fetchAssignments({ student_only: true }),
  });
  const progress = useQuery({ queryKey: ['progress', user.id], queryFn: () => fetchProgress(user.id) });
  const activeEnrollments = useQuery({
    queryKey: ['active-enrollments'],
    queryFn: fetchMyActiveEnrollments,
  });
  const myRequests = useQuery({ queryKey: ['my-requests'], queryFn: () => fetchRequests() });

  const upcoming = (lessons.data ?? [])
    .filter((l) => new Date(l.scheduled_at) >= new Date())
    .slice(0, 5);
  const next = upcoming[0];
  const pendingHomework = (assignments.data ?? [])
    .filter((a) => !a.due_at || new Date(a.due_at) > new Date())
    .slice(0, 5);

  const firstName = user.full_name.split(' ')[0];
  const myCourses = activeEnrollments.data ?? [];
  const pendingReqs = (myRequests.data ?? []).filter((r) => r.status === 'pending');

  return (
    <div className="space-y-8">
      <HeroCard
        eyebrow="Личный кабинет"
        greeting={firstName}
        subline="Сегодня — отличный день, чтобы услышать новый язык."
        cta={next ? { to: `/lessons/${next.id}`, label: 'К следующему уроку' } : undefined}
      />

      {(myCourses.length > 0 || pendingReqs.length > 0) && (
        <section>
          <SectionHeading title="Мои курсы" icon={<BookOpen size={14} strokeWidth={2} />} />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {myCourses.map((e) => (
              <Link
                key={e.enrollment_id}
                to={`/lessons?group_id=${e.group_id}`}
                className="card-elevated group hover:border-forest-500 hover:shadow-pop transition-all flex flex-col"
              >
                <div className="flex items-start justify-between gap-3">
                  <LanguageMark language={e.language} size="lg" />
                  <span className="pill-sage font-semibold">
                    <ShieldCheck size={10} strokeWidth={2.5} /> Активен
                  </span>
                </div>
                <h3 className="font-display text-base font-extrabold text-ink-900 mt-4 leading-tight text-balance">
                  {e.course_title}
                </h3>
                <div className="text-xs text-ink-500 mt-1">
                  Уровень {e.level} · с {new Date(e.started_at).toLocaleDateString('ru-RU')}
                </div>
                <div className="mt-5 inline-flex items-center gap-1.5 text-xs font-semibold text-forest-700 group-hover:gap-2.5 transition-all">
                  Открыть уроки <ArrowUpRight size={12} strokeWidth={2.5} />
                </div>
              </Link>
            ))}
            {pendingReqs.map((r) => (
              <div key={r.id} className="card border-dashed flex flex-col">
                <div className="flex items-start justify-between gap-3">
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gold-50 text-gold-700 flex-shrink-0">
                    <Clock size={18} strokeWidth={2} />
                  </div>
                  <span className="pill-gold font-semibold">Ожидает</span>
                </div>
                <h3 className="font-display text-base font-extrabold text-ink-900 mt-4 leading-tight text-balance">
                  Заявка на рассмотрении
                </h3>
                <div className="text-xs text-ink-500 mt-1">
                  Подана {formatDateTime(r.created_at)}
                </div>
                {r.note && (
                  <p className="mt-3 text-sm text-ink-600 italic line-clamp-3">«{r.note}»</p>
                )}
                <div className="mt-auto pt-4 text-xs text-ink-400">
                  Методист рассмотрит заявку в ближайший час.
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <SectionHeading title="Этот семестр" icon={<TrendingUp size={14} strokeWidth={2} />} />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Stat
            label="Посещаемость"
            value={progress.data ? `${Math.round(progress.data.attendance_rate * 100)}%` : '—'}
            hint="процент посещённых уроков"
            accent="forest"
            size="lg"
          />
          <Stat
            label="Уроков"
            value={progress.data?.lessons_total ?? '—'}
            hint="за всё время в группе"
            size="lg"
          />
          <Stat
            label="Домашек сдано"
            value={
              progress.data
                ? `${progress.data.homework_submitted}/${progress.data.homework_total}`
                : '—'
            }
            hint={progress.data ? `${progress.data.homework_graded} оценено` : ''}
            accent="gold"
            size="lg"
          />
          <Stat
            label="Средний балл"
            value={progress.data?.avg_score ? progress.data.avg_score.toFixed(1) : '—'}
            hint="по проверенным работам"
            accent="sage"
            size="lg"
          />
        </div>
      </section>

      {progress.data && (
        <section>
          <SectionHeading title="Прогресс по навыкам" icon={<TrendingUp size={14} strokeWidth={2} />} />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="card-elevated lg:col-span-2">
              <div className="eyebrow">CEFR skills</div>
              <SkillBars
                skills={skillsFromProgress(progress.data, assignments.data ?? [])}
                className="mt-4"
              />
              <div className="mt-5 pt-4 border-t border-paper-300 text-xs text-ink-500">
                Расчёт по посещаемости, оценкам домашек и активности на уроке. Обновляется
                автоматически после закрытия урока.
              </div>
            </div>
            <div className="card-elevated flex flex-col items-center justify-center text-center">
              <div className="eyebrow self-start">Общая посещаемость</div>
              <ProgressRing value={progress.data.attendance_rate} size={140} stroke={12} />
              <div className="mt-4 text-sm text-ink-600">
                <span className="font-semibold text-ink-900 num">
                  {progress.data.lessons_attended}
                </span>{' '}
                из{' '}
                <span className="font-semibold text-ink-900 num">
                  {progress.data.lessons_total}
                </span>{' '}
                уроков посещено
              </div>
            </div>
          </div>
        </section>
      )}

      <section className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3 card-elevated relative overflow-hidden">
          <div className="blob bg-forest-500 h-48 w-48 -top-8 -right-8 opacity-20" />
          <div className="relative">
            <div className="eyebrow">Ближайший урок</div>
            {next ? (
              <Link to={`/lessons/${next.id}`} className="block group">
                <h3 className="font-display text-display-md font-extrabold text-ink-900 mb-2 text-balance">
                  {next.title}
                </h3>
                <div className="text-sm text-ink-600 num">
                  {formatDateTime(next.scheduled_at)}{' '}
                  <span className="text-gold-700 font-semibold">· {relativeTime(next.scheduled_at)}</span>
                </div>
                <div className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-forest-700 group-hover:gap-2 transition-all">
                  Открыть урок
                  <ArrowUpRight size={14} strokeWidth={2.5} />
                </div>
              </Link>
            ) : (
              <div className="text-ink-500 text-sm py-4">Уроков впереди не запланировано</div>
            )}
          </div>
        </div>

        <div className="lg:col-span-2 card-flat">
          <div className="eyebrow">Расписание</div>
          {lessons.isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-4/6" />
            </div>
          ) : upcoming.length === 0 ? (
            <p className="text-sm text-ink-500">Нет запланированных уроков</p>
          ) : (
            <ul className="divide-y divide-paper-300">
              {upcoming.map((l) => (
                <li key={l.id}>
                  <Link
                    to={`/lessons/${l.id}`}
                    className="flex items-center justify-between gap-2 py-2.5 hover:text-forest-700 transition-colors"
                  >
                    <span className="text-sm text-ink-700 font-medium truncate">{l.title}</span>
                    <span className="text-xs text-ink-400 num whitespace-nowrap">
                      {formatDateTime(l.scheduled_at)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section>
        <SectionHeading
          title="Домашние задания"
          link={{ to: '/homework', label: 'Все →' }}
          icon={<PenLine size={14} strokeWidth={2} />}
        />
        {assignments.isLoading ? (
          <div className="grid gap-3 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            <SkeletonCard rows={2} />
            <SkeletonCard rows={2} />
            <SkeletonCard rows={2} />
          </div>
        ) : pendingHomework.length === 0 ? (
          <div className="card-flat text-sm text-ink-500">Нет активных заданий</div>
        ) : (
          <div className="grid gap-3 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {pendingHomework.map((a) => (
              <Link
                key={a.id}
                to="/homework"
                className="card group hover:border-forest-500 hover:shadow-pop transition-all"
              >
                <div className="flex items-start justify-between gap-2">
                  <h4 className="font-display text-base font-bold text-ink-900 line-clamp-2 text-balance">
                    {a.title}
                  </h4>
                  <ArrowUpRight
                    size={14}
                    className="text-ink-300 group-hover:text-forest-600 transition-colors flex-shrink-0"
                  />
                </div>
                <div className="mt-3 text-xs text-ink-500">
                  {a.due_at ? `до ${formatDateTime(a.due_at)}` : 'без дедлайна'}
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

/* ─── TEACHER ─────────────────────────────────────────────── */

function TeacherDashboard() {
  const user = useAuthStore((s) => s.user)!;
  const groups = useQuery({ queryKey: ['groups-mine'], queryFn: () => fetchGroups() });
  const lessons = useQuery({ queryKey: ['lessons-teacher'], queryFn: () => fetchLessons() });

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const todayLessons = (lessons.data ?? []).filter((l) => {
    const d = new Date(l.scheduled_at);
    return d >= today && d < tomorrow;
  });
  const upcoming = (lessons.data ?? [])
    .filter((l) => new Date(l.scheduled_at) >= tomorrow)
    .slice(0, 8);

  return (
    <div className="space-y-8">
      <HeroCard
        eyebrow="Преподаватель"
        greeting={user.full_name.split(' ')[0]}
        subline="Ваш день в YES Center — расписание, журнал и группы под рукой."
      />

      <section className="grid grid-cols-3 gap-4">
        <Stat label="Мои группы" value={groups.data?.length ?? '—'} accent="forest" size="lg" />
        <Stat label="Уроков сегодня" value={todayLessons.length} accent="gold" size="lg" />
        <Stat label="Уроков впереди" value={upcoming.length} accent="sage" size="lg" />
      </section>

      <section>
        <SectionHeading title="Сегодня" icon={<CalendarClock size={14} strokeWidth={2} />} />
        {todayLessons.length === 0 ? (
          <div className="card-flat text-sm text-ink-500">
            Уроков сегодня нет — насладитесь паузой ☕
          </div>
        ) : (
          <div className="card-bare divide-y divide-paper-300">
            {todayLessons.map((l) => (
              <Link
                key={l.id}
                to={`/lessons/${l.id}`}
                className="flex items-center justify-between gap-3 px-6 py-4 hover:bg-paper-100 transition-colors group"
              >
                <div className="min-w-0">
                  <div className="font-display text-base font-bold text-ink-900 truncate">
                    {l.title}
                  </div>
                  <div className="text-xs text-ink-500 num mt-0.5">
                    {formatDateTime(l.scheduled_at)}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <LessonStatusPill status={l.status} />
                  <ArrowUpRight
                    size={14}
                    className="text-ink-300 group-hover:text-forest-600 transition-colors"
                  />
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section>
        <SectionHeading
          title="Мои группы"
          link={{ to: '/groups', label: 'Все →' }}
          icon={<Users size={14} strokeWidth={2} />}
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {(groups.data ?? []).map((g) => (
            <Link
              key={g.id}
              to={`/groups/${g.id}`}
              className="card group hover:border-forest-500 hover:shadow-pop transition-all"
            >
              <div className="font-display text-sm font-bold text-ink-900 truncate">
                Группа · {g.id.slice(0, 8)}
              </div>
              <div className="mt-1 text-xs text-ink-500 num">старт {g.start_date}</div>
              <div className="mt-3 inline-flex items-center gap-1 text-xs text-forest-700 font-semibold group-hover:gap-2 transition-all">
                Перейти
                <ArrowUpRight size={12} strokeWidth={2.5} />
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

/* ─── PARENT ──────────────────────────────────────────────── */

function ParentDashboard() {
  const user = useAuthStore((s) => s.user)!;
  return (
    <div className="space-y-8">
      <HeroCard
        eyebrow="Кабинет родителя"
        greeting={user.full_name.split(' ')[0]}
        subline="Прогресс ваших детей в YES Center — на одном экране."
      />

      <div className="card-elevated relative overflow-hidden">
        <div className="blob bg-gold-500 h-48 w-48 -top-8 -right-8 opacity-20" />
        <div className="relative max-w-2xl">
          <div className="eyebrow">Скоро здесь</div>
          <h3 className="font-display text-display-md font-extrabold text-ink-900 mb-3 text-balance">
            Привязка детей и их прогресс
          </h3>
          <p className="text-sm text-ink-600 leading-relaxed">
            В демо-режиме дети привязаны через сидер. Полный родительский кабинет с прогрессом,
            домашками, оплатой и чатом с преподавателем — в Phase 2.
          </p>
          <div className="mt-5 hairline-label">эндпоинты</div>
          <div className="mt-3 space-y-1 font-mono text-xs text-ink-600">
            <div>GET /api/billing/payments/{'{student_id}'}</div>
            <div>GET /api/progress/{'{student_id}'}</div>
          </div>
        </div>
      </div>

      <Link
        to="/notifications"
        className="card group flex items-center justify-between hover:border-forest-500 hover:shadow-pop transition-all"
      >
        <div className="flex items-center gap-3">
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-forest-50 text-forest-600">
            <Mail size={18} strokeWidth={2} />
          </div>
          <span className="font-display text-base font-bold text-ink-900">Уведомления</span>
        </div>
        <ArrowUpRight size={16} className="text-ink-400 group-hover:text-forest-600 transition-colors" />
      </Link>
    </div>
  );
}

/* ─── ADMIN ──────────────────────────────────────────────── */

function AdminDashboard() {
  const user = useAuthStore((s) => s.user)!;
  const branches = useQuery({ queryKey: ['branches'], queryFn: fetchBranches });
  const users = useQuery({ queryKey: ['users'], queryFn: () => fetchUsers({ limit: 200 }) });
  const groups = useQuery({ queryKey: ['groups-all'], queryFn: () => fetchGroups() });
  const lessons = useQuery({ queryKey: ['lessons-all'], queryFn: () => fetchLessons() });

  return (
    <div className="space-y-8">
      <HeroCard
        eyebrow="Администрирование"
        greeting={user.full_name.split(' ')[0]}
        subline="Платформа в цифрах — филиалы, пользователи, группы и уроки."
      />

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="Филиалов" value={branches.data?.length ?? '—'} accent="forest" size="lg" />
        <Stat label="Пользователей" value={users.data?.length ?? '—'} size="lg" />
        <Stat label="Групп" value={groups.data?.length ?? '—'} accent="gold" size="lg" />
        <Stat label="Уроков" value={lessons.data?.length ?? '—'} accent="sage" size="lg" />
      </section>

      <section>
        <SectionHeading title="Быстрый доступ" icon={<Sparkles size={14} strokeWidth={2} />} />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <QuickLink to="/branches" icon={<Building2 size={18} strokeWidth={2} />} label="Филиалы" />
          <QuickLink to="/courses" icon={<GraduationCap size={18} strokeWidth={2} />} label="Курсы" />
          <QuickLink to="/groups" icon={<Layers size={18} strokeWidth={2} />} label="Группы" />
          <QuickLink to="/users" icon={<Users size={18} strokeWidth={2} />} label="Пользователи" />
          <QuickLink to="/lessons" icon={<CalendarClock size={18} strokeWidth={2} />} label="Уроки" />
          <QuickLink to="/homework" icon={<PenLine size={18} strokeWidth={2} />} label="Домашки" />
        </div>
      </section>
    </div>
  );
}

/* ─── shared ──────────────────────────────────────────────── */

function SectionHeading({
  title,
  link,
  icon,
}: {
  title: string;
  link?: { to: string; label: string };
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex items-end justify-between mb-4">
      <div className="flex items-center gap-2">
        {icon && <span className="text-forest-600">{icon}</span>}
        <h2 className="font-display text-xl font-extrabold text-ink-900 tracking-tight">{title}</h2>
      </div>
      {link && (
        <Link
          to={link.to}
          className="text-xs uppercase tracking-[0.14em] font-bold text-ink-500 hover:text-forest-700 transition-colors"
        >
          {link.label}
        </Link>
      )}
    </div>
  );
}

function QuickLink({
  to,
  icon,
  label,
}: {
  to: string;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <Link
      to={to}
      className="group flex flex-col items-start justify-between gap-3 card hover:border-forest-500 hover:shadow-pop transition-all"
    >
      <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-forest-50 text-forest-600 group-hover:bg-forest-600 group-hover:text-white transition-colors">
        {icon}
      </div>
      <div className="font-display font-bold text-sm text-ink-900">{label}</div>
    </Link>
  );
}

/* Derive 4 CEFR skill values from the aggregate progress endpoint.
 * Listening proxy: attendance_rate. Reading proxy: HW submission rate.
 * Writing proxy: avg score normalised. Speaking proxy: blend (most subjective). */
function skillsFromProgress(
  p: { attendance_rate: number; homework_submitted: number; homework_total: number; avg_score: number | null },
  _hw: unknown[],
) {
  const attend = clamp01(p.attendance_rate);
  const subRate = p.homework_total > 0 ? p.homework_submitted / p.homework_total : 0;
  const grade = (p.avg_score ?? 0) / 10;
  return [
    { key: 'listening' as const, label: 'Listening', value: attend },
    { key: 'reading' as const, label: 'Reading', value: clamp01(subRate * 0.85 + grade * 0.15) },
    { key: 'writing' as const, label: 'Writing', value: clamp01(grade) },
    { key: 'speaking' as const, label: 'Speaking', value: clamp01((attend + grade) / 2) },
  ];
}

function clamp01(n: number): number {
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(1, n));
}
