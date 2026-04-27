import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowUpRight,
  Building2,
  CalendarClock,
  GraduationCap,
  Headphones,
  Layers,
  Mail,
  PenLine,
  Sparkles,
  Users,
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { fetchLessons } from '@/api/lessons';
import { fetchAssignments } from '@/api/assignments';
import { fetchProgress } from '@/api/progress';
import { fetchGroups } from '@/api/groups';
import { fetchBranches } from '@/api/branches';
import { fetchUsers } from '@/api/users';
import { Stat } from '@/components/ui/Stat';
import { Skeleton, SkeletonCard } from '@/components/ui/Skeleton';
import { LessonStatusPill } from '@/components/ui/StatusPill';
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

/* ─── STUDENT ─────────────────────────────────────────────── */

function StudentDashboard() {
  const user = useAuthStore((s) => s.user)!;
  const lessons = useQuery({ queryKey: ['lessons-mine'], queryFn: () => fetchLessons() });
  const assignments = useQuery({
    queryKey: ['hw-mine'],
    queryFn: () => fetchAssignments({ student_only: true }),
  });
  const progress = useQuery({ queryKey: ['progress', user.id], queryFn: () => fetchProgress(user.id) });

  const upcoming = (lessons.data ?? [])
    .filter((l) => new Date(l.scheduled_at) >= new Date())
    .slice(0, 5);
  const next = upcoming[0];
  const pendingHomework = (assignments.data ?? [])
    .filter((a) => !a.due_at || new Date(a.due_at) > new Date())
    .slice(0, 5);

  const firstName = user.full_name.split(' ')[0];

  return (
    <div className="space-y-10">
      <Hero
        eyebrow="Личный кабинет студента"
        greeting={firstName}
        subline="Сегодня — отличный день, чтобы услышать новый язык."
      />

      <section>
        <SectionHeading title="Этот семестр" />
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
              progress.data ? `${progress.data.homework_submitted}/${progress.data.homework_total}` : '—'
            }
            hint={
              progress.data
                ? `${progress.data.homework_graded} оценено`
                : ''
            }
            accent="gold"
            size="lg"
          />
          <Stat
            label="Средний балл"
            value={progress.data?.avg_score ? progress.data.avg_score.toFixed(1) : '—'}
            hint="по проверенным работам"
            size="lg"
          />
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        <div className="lg:col-span-3 card relative overflow-hidden">
          <div className="absolute top-0 right-0 -mt-12 -mr-12 h-40 w-40 rounded-full bg-gold-50 opacity-60" />
          <div className="relative">
            <div className="eyebrow">Ближайший урок</div>
            {next ? (
              <Link to={`/lessons/${next.id}`} className="block group">
                <h3 className="font-display text-display-lg font-medium text-ink-900 mb-2 text-balance">
                  {next.title}
                </h3>
                <div className="text-sm text-ink-500">
                  {formatDateTime(next.scheduled_at)}{' '}
                  <span className="text-gold-700 font-medium">· {relativeTime(next.scheduled_at)}</span>
                </div>
                <div className="mt-6 inline-flex items-center gap-1 text-sm font-medium text-forest-700 group-hover:gap-2 transition-all">
                  Открыть урок
                  <ArrowUpRight size={14} strokeWidth={2} />
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
            <ul className="divide-y divide-ink-900/5">
              {upcoming.map((l) => (
                <li key={l.id}>
                  <Link
                    to={`/lessons/${l.id}`}
                    className="flex items-center justify-between py-2 hover:text-forest-700 transition-colors"
                  >
                    <span className="text-sm text-ink-700 truncate pr-2">{l.title}</span>
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
          icon={<PenLine size={14} strokeWidth={1.6} />}
        />
        {assignments.isLoading ? (
          <div className="grid gap-3 grid-cols-1 md:grid-cols-2">
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
                className="card group hover:border-forest-700 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <h4 className="font-display text-base font-medium text-ink-900 line-clamp-2 text-balance">
                    {a.title}
                  </h4>
                  <ArrowUpRight
                    size={14}
                    className="text-ink-300 group-hover:text-forest-700 transition-colors flex-shrink-0"
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
    <div className="space-y-10">
      <Hero
        eyebrow="Преподаватель"
        greeting={user.full_name.split(' ')[0]}
        subline="Ваш день в YES Center."
      />

      <section className="grid grid-cols-3 gap-4">
        <Stat label="Мои группы" value={groups.data?.length ?? '—'} accent="forest" size="lg" />
        <Stat label="Уроков сегодня" value={todayLessons.length} accent="gold" size="lg" />
        <Stat label="Уроков впереди" value={upcoming.length} size="lg" />
      </section>

      <section>
        <SectionHeading title="Сегодня" icon={<CalendarClock size={14} strokeWidth={1.6} />} />
        {todayLessons.length === 0 ? (
          <div className="card-flat text-sm text-ink-500">Уроков сегодня нет — насладитесь паузой.</div>
        ) : (
          <div className="card-bare divide-y divide-ink-900/5">
            {todayLessons.map((l) => (
              <Link
                key={l.id}
                to={`/lessons/${l.id}`}
                className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-paper-100 transition-colors group"
              >
                <div className="min-w-0">
                  <div className="font-display text-base font-medium text-ink-900 truncate">
                    {l.title}
                  </div>
                  <div className="text-xs text-ink-500 num">{formatDateTime(l.scheduled_at)}</div>
                </div>
                <div className="flex items-center gap-2">
                  <LessonStatusPill status={l.status} />
                  <ArrowUpRight
                    size={14}
                    className="text-ink-300 group-hover:text-forest-700 transition-colors"
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
          icon={<Users size={14} strokeWidth={1.6} />}
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {(groups.data ?? []).map((g) => (
            <Link
              key={g.id}
              to={`/groups/${g.id}`}
              className="card group hover:border-forest-700 transition-colors"
            >
              <div className="font-display text-sm font-medium text-ink-900 truncate">
                Группа · {g.id.slice(0, 8)}
              </div>
              <div className="mt-1 text-xs text-ink-500">старт {g.start_date}</div>
              <div className="mt-3 inline-flex items-center gap-1 text-xs text-forest-700 font-medium group-hover:gap-2 transition-all">
                Перейти
                <ArrowUpRight size={12} strokeWidth={2} />
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
    <div className="space-y-10">
      <Hero
        eyebrow="Кабинет родителя"
        greeting={user.full_name.split(' ')[0]}
        subline="Прогресс ваших детей в YES Center."
      />

      <div className="card relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-16 -mr-16 h-44 w-44 rounded-full bg-forest-50 opacity-50" />
        <div className="relative max-w-xl">
          <div className="eyebrow">Скоро здесь</div>
          <h3 className="font-display text-display-md font-medium text-ink-900 mb-3 text-balance">
            Привязка детей и их прогресс
          </h3>
          <p className="text-sm text-ink-500 leading-relaxed">
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

      <Link to="/notifications" className="card group flex items-center justify-between hover:border-forest-700 transition-colors">
        <div className="flex items-center gap-3">
          <Mail size={18} strokeWidth={1.6} className="text-forest-700" />
          <span className="font-display text-base font-medium text-ink-900">Уведомления</span>
        </div>
        <ArrowUpRight
          size={16}
          className="text-ink-400 group-hover:text-forest-700 transition-colors"
        />
      </Link>
    </div>
  );
}

/* ─── ADMIN / METHODIST / MANAGER ─────────────────────────── */

function AdminDashboard() {
  const user = useAuthStore((s) => s.user)!;
  const branches = useQuery({ queryKey: ['branches'], queryFn: fetchBranches });
  const users = useQuery({ queryKey: ['users'], queryFn: () => fetchUsers({ limit: 200 }) });
  const groups = useQuery({ queryKey: ['groups-all'], queryFn: () => fetchGroups() });
  const lessons = useQuery({ queryKey: ['lessons-all'], queryFn: () => fetchLessons() });

  return (
    <div className="space-y-10">
      <Hero
        eyebrow="Администрирование"
        greeting={user.full_name.split(' ')[0]}
        subline="Платформа в цифрах."
      />

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="Филиалов" value={branches.data?.length ?? '—'} accent="forest" size="lg" />
        <Stat label="Пользователей" value={users.data?.length ?? '—'} size="lg" />
        <Stat label="Групп" value={groups.data?.length ?? '—'} accent="gold" size="lg" />
        <Stat label="Уроков" value={lessons.data?.length ?? '—'} size="lg" />
      </section>

      <section>
        <SectionHeading title="Быстрый доступ" icon={<Sparkles size={14} strokeWidth={1.6} />} />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <QuickLink to="/branches" icon={<Building2 size={16} strokeWidth={1.6} />} label="Филиалы" />
          <QuickLink to="/courses" icon={<GraduationCap size={16} strokeWidth={1.6} />} label="Курсы" />
          <QuickLink to="/groups" icon={<Layers size={16} strokeWidth={1.6} />} label="Группы" />
          <QuickLink to="/users" icon={<Users size={16} strokeWidth={1.6} />} label="Пользователи" />
          <QuickLink to="/lessons" icon={<CalendarClock size={16} strokeWidth={1.6} />} label="Уроки" />
          <QuickLink to="/homework" icon={<Headphones size={16} strokeWidth={1.6} />} label="Домашки" />
        </div>
      </section>
    </div>
  );
}

/* ─── shared ──────────────────────────────────────────────── */

function Hero({
  eyebrow,
  greeting,
  subline,
}: {
  eyebrow: string;
  greeting: string;
  subline: string;
}) {
  return (
    <div className="relative pt-2">
      <div className="eyebrow">{eyebrow}</div>
      <h1 className="font-display text-display-xl font-medium tracking-tight text-ink-900 leading-[1.0] text-balance">
        Здравствуйте,{' '}
        <span className="italic font-light text-forest-700">{greeting}.</span>
      </h1>
      <p className="mt-3 text-ink-500 text-sm max-w-xl">{subline}</p>
    </div>
  );
}

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
        {icon && <span className="text-ink-400">{icon}</span>}
        <h2 className="font-display text-lg font-semibold text-ink-900 tracking-tight">{title}</h2>
      </div>
      {link && (
        <Link
          to={link.to}
          className="text-xs uppercase tracking-[0.18em] font-semibold text-ink-500 hover:text-forest-700 transition-colors"
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
      className="group flex flex-col items-start justify-between gap-3 card hover:border-forest-700 transition-colors"
    >
      <div className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-paper-200 text-ink-700 group-hover:bg-forest-700 group-hover:text-paper-50 transition-colors">
        {icon}
      </div>
      <div className="font-medium text-sm text-ink-900">{label}</div>
    </Link>
  );
}
