import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowUpRight,
  Award,
  BookOpen,
  Building2,
  CalendarClock,
  CheckCircle2,
  Clock,
  Flame,
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
import { Skeleton } from '@/components/ui/Skeleton';
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
    .slice(0, 6);
  const next = upcoming[0];
  const pendingHomework = (assignments.data ?? [])
    .filter((a) => !a.due_at || new Date(a.due_at) > new Date())
    .slice(0, 6);

  const firstName = user.full_name.split(' ')[0];
  const myCourses = activeEnrollments.data ?? [];
  const pendingReqs = (myRequests.data ?? []).filter((r) => r.status === 'pending');
  const skills = progress.data ? skillsFromProgress(progress.data) : null;

  return (
    <div className="space-y-6">
      {/* Greeting strip */}
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <div className="text-[11px] uppercase tracking-[0.16em] font-bold text-forest-600 mb-2">
            Личный кабинет
          </div>
          <h1 className="font-display text-display-lg font-extrabold text-ink-900 tracking-tight leading-[1.0]">
            Привет, {firstName}.
          </h1>
          <p className="text-ink-500 mt-2 text-sm">
            {next
              ? `Следующий урок ${relativeTime(next.scheduled_at).toLowerCase()}.`
              : 'Сегодня уроков нет — отличный день, чтобы поработать с домашкой.'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <KPI icon={<Flame size={14} strokeWidth={2} />} value={String(myCourses.length)} label="курса" tone="forest" />
          <KPI
            icon={<CheckCircle2 size={14} strokeWidth={2} />}
            value={progress.data ? String(progress.data.homework_graded) : '—'}
            label="сдано"
            tone="sage"
          />
          <KPI icon={<Award size={14} strokeWidth={2} />} value={progress.data?.avg_score ? progress.data.avg_score.toFixed(1) : '—'} label="балл" tone="gold" />
        </div>
      </div>

      {/* Bento — main grid */}
      <div className="grid grid-cols-12 gap-4">
        {/* Next lesson — big hero */}
        <div className="col-span-12 lg:col-span-8 row-span-2">
          {next ? (
            <Link
              to={`/lessons/${next.id}`}
              className="group block h-full relative overflow-hidden rounded-3xl bg-gradient-to-br from-forest-600 via-forest-700 to-forest-900 text-white p-8 lg:p-10 shadow-pop-lg tappable"
            >
              <div className="blob bg-gold-500 h-[300px] w-[300px] -top-20 -right-20 opacity-30" />
              <div className="blob bg-forest-500 h-[400px] w-[400px] -bottom-32 -left-20 opacity-30" />
              <div className="relative h-full flex flex-col">
                <div className="inline-flex items-center gap-1.5 self-start rounded-full bg-white/15 backdrop-blur px-3 py-1 text-[10px] uppercase tracking-[0.16em] font-bold border border-white/20">
                  <Sparkles size={11} strokeWidth={2.5} />
                  Ближайший урок · {relativeTime(next.scheduled_at)}
                </div>
                <div className="mt-auto pt-8">
                  <h2 className="font-display text-display-xl font-extrabold leading-[1.0] tracking-tight text-balance">
                    {next.title}
                  </h2>
                  <div className="mt-4 flex items-center gap-4 text-white/80 text-sm flex-wrap">
                    <span className="inline-flex items-center gap-1.5 num">
                      <CalendarClock size={14} strokeWidth={2} />
                      {formatDateTime(next.scheduled_at)}
                    </span>
                    <span className="inline-flex items-center gap-1.5 num">
                      <Clock size={14} strokeWidth={2} />
                      {next.duration_min} мин
                    </span>
                  </div>
                  <div className="mt-7 inline-flex items-center gap-2 rounded-xl bg-white text-forest-700 px-5 h-11 text-sm font-bold shadow-pop group-hover:gap-3 transition-all">
                    Открыть урок
                    <ArrowUpRight size={16} strokeWidth={2.5} />
                  </div>
                </div>
              </div>
            </Link>
          ) : (
            <div className="card-elevated h-full flex items-center justify-center text-center py-16">
              <div>
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-paper-200 text-ink-500 mb-4">
                  <CalendarClock size={20} strokeWidth={1.6} />
                </div>
                <h3 className="font-display text-display-md font-extrabold text-ink-900">
                  Уроков впереди нет
                </h3>
                <p className="text-ink-500 mt-2 max-w-sm mx-auto">
                  Запишитесь на новый курс или дождитесь следующего урока вашей группы.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Attendance ring — top right */}
        <div className="col-span-6 lg:col-span-4">
          <div className="card-elevated h-full flex flex-col items-center justify-center text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-sage-50 to-paper-50 opacity-60" aria-hidden />
            <div className="relative">
              <div className="text-[10px] uppercase tracking-[0.16em] font-bold text-sage-700 mb-2">
                Посещаемость
              </div>
              <ProgressRing
                value={progress.data?.attendance_rate ?? 0}
                size={150}
                stroke={12}
                className="text-sage-600"
              />
              <div className="mt-3 text-xs text-ink-500">
                <span className="font-semibold text-ink-900 num">
                  {progress.data?.lessons_attended ?? 0}
                </span>{' '}
                /{' '}
                <span className="font-semibold text-ink-900 num">
                  {progress.data?.lessons_total ?? 0}
                </span>{' '}
                уроков
              </div>
            </div>
          </div>
        </div>

        {/* HW big stat */}
        <div className="col-span-6 lg:col-span-4">
          <div className="card-elevated h-full bg-gradient-to-br from-gold-50 to-paper-50 relative overflow-hidden">
            <div className="absolute -top-8 -right-8 h-32 w-32 rounded-full bg-gold-500 opacity-20 blur-2xl" aria-hidden />
            <div className="relative h-full flex flex-col">
              <div className="text-[10px] uppercase tracking-[0.16em] font-bold text-gold-700 mb-2">
                Домашки
              </div>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="font-display text-display-xl font-extrabold num text-ink-900 leading-none">
                  {progress.data?.homework_submitted ?? 0}
                </span>
                <span className="font-display text-display-md font-bold text-ink-300 num">
                  / {progress.data?.homework_total ?? 0}
                </span>
              </div>
              <div className="mt-1 text-sm text-ink-500">
                {progress.data?.homework_graded ?? 0} оценено
              </div>
              <Link to="/homework" className="mt-auto pt-4 inline-flex items-center gap-1 text-xs font-bold text-gold-700 hover:gap-2 transition-all">
                Все задания <ArrowUpRight size={12} strokeWidth={2.5} />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* My courses + Pending requests */}
      {(myCourses.length > 0 || pendingReqs.length > 0) && (
        <section>
          <SectionTitle title="Мои курсы" icon={<BookOpen size={14} strokeWidth={2} />} />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {myCourses.map((e) => (
              <Link
                key={e.enrollment_id}
                to={`/lessons?group_id=${e.group_id}`}
                className="card group relative overflow-hidden tappable hover:border-forest-500 hover:shadow-pop transition-all flex flex-col"
              >
                <div className="absolute -top-12 -right-12 h-32 w-32 rounded-full bg-forest-100 opacity-50 blur-2xl" aria-hidden />
                <div className="relative flex items-start justify-between gap-3">
                  <LanguageMark language={e.language} size="lg" />
                  <span className="pill-sage font-bold">
                    <ShieldCheck size={10} strokeWidth={2.5} /> Активен
                  </span>
                </div>
                <h3 className="font-display text-base font-extrabold text-ink-900 mt-4 leading-tight text-balance relative">
                  {e.course_title}
                </h3>
                <div className="text-xs text-ink-500 mt-1 relative">
                  Уровень {e.level}
                </div>
                <div className="mt-auto pt-4 inline-flex items-center gap-1.5 text-xs font-bold text-forest-700 group-hover:gap-2.5 transition-all relative">
                  Открыть уроки <ArrowUpRight size={12} strokeWidth={2.5} />
                </div>
              </Link>
            ))}
            {pendingReqs.map((r) => (
              <div
                key={r.id}
                className="card border-dashed border-2 border-paper-400 bg-paper-100/50 flex flex-col"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gold-50 text-gold-700">
                    <Clock size={18} strokeWidth={2} />
                  </div>
                  <span className="pill-gold font-bold">Ожидает</span>
                </div>
                <h3 className="font-display text-base font-extrabold text-ink-900 mt-4 leading-tight">
                  Заявка на рассмотрении
                </h3>
                <div className="text-xs text-ink-500 mt-1 num">
                  {formatDateTime(r.created_at)}
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

      {/* Skills + schedule strip */}
      {skills && (
        <section className="grid grid-cols-12 gap-4">
          <div className="col-span-12 lg:col-span-7 card-elevated">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-forest-50 text-forest-600">
                  <TrendingUp size={14} strokeWidth={2.5} />
                </span>
                <h2 className="font-display text-lg font-extrabold text-ink-900">
                  Прогресс по навыкам
                </h2>
              </div>
              <span className="text-[10px] uppercase tracking-[0.16em] font-bold text-ink-400">
                CEFR breakdown
              </span>
            </div>
            <SkillBars skills={skills} />
            <div className="mt-6 pt-4 border-t border-paper-300 text-xs text-ink-500 leading-relaxed">
              Расчёт по посещаемости, оценкам домашек и активности на уроке. Обновляется
              автоматически после закрытия урока.
            </div>
          </div>

          <div className="col-span-12 lg:col-span-5 card-elevated">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-gold-50 text-gold-700">
                  <CalendarClock size={14} strokeWidth={2.5} />
                </span>
                <h2 className="font-display text-lg font-extrabold text-ink-900">Расписание</h2>
              </div>
              <Link to="/lessons" className="text-[10px] uppercase tracking-[0.16em] font-bold text-ink-500 hover:text-forest-700">
                Все →
              </Link>
            </div>
            {lessons.isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-12" />
                <Skeleton className="h-12" />
                <Skeleton className="h-12" />
              </div>
            ) : upcoming.length === 0 ? (
              <p className="text-sm text-ink-500 py-6 text-center">Нет запланированных уроков</p>
            ) : (
              <ul className="space-y-2">
                {upcoming.slice(0, 5).map((l) => (
                  <li key={l.id}>
                    <Link
                      to={`/lessons/${l.id}`}
                      className="group flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-paper-100 transition-colors"
                    >
                      <div className="text-center w-12 flex-shrink-0">
                        <div className="font-display text-lg font-extrabold text-ink-900 leading-none num">
                          {new Date(l.scheduled_at).getDate()}
                        </div>
                        <div className="text-[9px] uppercase tracking-[0.16em] font-bold text-ink-400 mt-0.5">
                          {new Date(l.scheduled_at).toLocaleDateString('ru-RU', { month: 'short' })}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-ink-900 truncate">{l.title}</div>
                        <div className="text-xs text-ink-500 num">
                          {new Date(l.scheduled_at).toLocaleTimeString('ru-RU', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      </div>
                      <ArrowUpRight
                        size={14}
                        className="text-ink-300 group-hover:text-forest-600 transition-colors flex-shrink-0"
                      />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      )}

      {/* Homework grid */}
      <section>
        <SectionTitle
          title="Домашние задания"
          link={{ to: '/homework', label: 'Все' }}
          icon={<PenLine size={14} strokeWidth={2} />}
        />
        {assignments.isLoading ? (
          <div className="grid gap-3 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-28" />
            ))}
          </div>
        ) : pendingHomework.length === 0 ? (
          <div className="card-flat text-center text-ink-500 py-8">
            Нет активных заданий
          </div>
        ) : (
          <div className="grid gap-3 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {pendingHomework.map((a) => (
              <Link
                key={a.id}
                to="/homework"
                className="card group tappable hover:border-forest-500 hover:shadow-pop transition-all"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-gold-50 text-gold-700">
                    <PenLine size={14} strokeWidth={2} />
                  </div>
                  <ArrowUpRight
                    size={14}
                    className="text-ink-300 group-hover:text-forest-600 transition-colors"
                  />
                </div>
                <h4 className="font-display text-base font-bold text-ink-900 mt-3 line-clamp-2 leading-tight text-balance">
                  {a.title}
                </h4>
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
    <div className="space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <div className="text-[11px] uppercase tracking-[0.16em] font-bold text-forest-600 mb-2">
            Преподаватель
          </div>
          <h1 className="font-display text-display-lg font-extrabold text-ink-900 leading-[1.0]">
            {user.full_name.split(' ')[0]}, добро пожаловать.
          </h1>
          <p className="text-ink-500 mt-2 text-sm">
            {todayLessons.length > 0
              ? `Сегодня у вас ${todayLessons.length} ${todayLessons.length === 1 ? 'урок' : 'уроков'}.`
              : 'Сегодня уроков нет — отличный момент проверить домашки.'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <KPI value={String(groups.data?.length ?? 0)} label="групп" tone="forest" icon={<Users size={14} strokeWidth={2} />} />
          <KPI value={String(todayLessons.length)} label="сегодня" tone="gold" icon={<CalendarClock size={14} strokeWidth={2} />} />
          <KPI value={String(upcoming.length)} label="впереди" tone="sage" icon={<Sparkles size={14} strokeWidth={2} />} />
        </div>
      </div>

      <section>
        <SectionTitle title="Сегодня" icon={<CalendarClock size={14} strokeWidth={2} />} />
        {todayLessons.length === 0 ? (
          <div className="card-flat text-sm text-ink-500 text-center py-8">
            Уроков сегодня нет — насладитесь паузой ☕
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {todayLessons.map((l) => (
              <Link
                key={l.id}
                to={`/lessons/${l.id}`}
                className="card group tappable hover:border-forest-500 hover:shadow-pop transition-all flex items-center gap-4"
              >
                <div className="flex-shrink-0 text-center">
                  <div className="font-display text-2xl font-extrabold text-forest-700 num leading-none">
                    {new Date(l.scheduled_at).toLocaleTimeString('ru-RU', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                  <div className="text-[9px] uppercase tracking-[0.16em] font-bold text-ink-400 mt-1">
                    {l.duration_min} мин
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-display text-base font-bold text-ink-900 truncate">
                    {l.title}
                  </div>
                  <div className="mt-1.5">
                    <LessonStatusPill status={l.status} />
                  </div>
                </div>
                <ArrowUpRight
                  size={14}
                  className="text-ink-300 group-hover:text-forest-600 transition-colors flex-shrink-0"
                />
              </Link>
            ))}
          </div>
        )}
      </section>

      <section>
        <SectionTitle
          title="Мои группы"
          link={{ to: '/groups', label: 'Все' }}
          icon={<Users size={14} strokeWidth={2} />}
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {(groups.data ?? []).map((g) => (
            <Link
              key={g.id}
              to={`/groups/${g.id}`}
              className="card group tappable hover:border-forest-500 hover:shadow-pop transition-all"
            >
              <div className="text-[10px] uppercase tracking-[0.16em] font-bold text-ink-400">
                Группа
              </div>
              <div className="font-display text-base font-bold text-ink-900 mt-1 truncate">
                · {g.id.slice(0, 8)}
              </div>
              <div className="mt-2 text-xs text-ink-500 num">старт {g.start_date}</div>
              <div className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-forest-700 group-hover:gap-2 transition-all">
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
    <div className="space-y-6">
      <div>
        <div className="text-[11px] uppercase tracking-[0.16em] font-bold text-forest-600 mb-2">
          Кабинет родителя
        </div>
        <h1 className="font-display text-display-lg font-extrabold text-ink-900 leading-[1.0]">
          {user.full_name.split(' ')[0]}, рады видеть.
        </h1>
        <p className="text-ink-500 mt-2 text-sm">
          Прогресс ваших детей в YES Center — на одном экране.
        </p>
      </div>

      <div className="card-elevated relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-16 -mr-16 h-44 w-44 rounded-full bg-forest-50 opacity-50" />
        <div className="relative max-w-2xl">
          <div className="text-[10px] uppercase tracking-[0.16em] font-bold text-forest-600 mb-3">
            Скоро здесь
          </div>
          <h3 className="font-display text-display-md font-extrabold text-ink-900 mb-3 text-balance">
            Привязка детей и их прогресс
          </h3>
          <p className="text-sm text-ink-600 leading-relaxed">
            В демо-режиме дети привязаны через сидер. Полный родительский кабинет с прогрессом,
            домашками, оплатой и чатом с преподавателем — в Phase 2.
          </p>
        </div>
      </div>

      <Link
        to="/notifications"
        className="card group tappable flex items-center justify-between hover:border-forest-500 hover:shadow-pop transition-all"
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
    <div className="space-y-6">
      <div>
        <div className="text-[11px] uppercase tracking-[0.16em] font-bold text-forest-600 mb-2">
          Администрирование
        </div>
        <h1 className="font-display text-display-lg font-extrabold text-ink-900 leading-[1.0]">
          Платформа в цифрах
        </h1>
        <p className="text-ink-500 mt-2 text-sm">
          Привет, {user.full_name.split(' ')[0]}. Сводка по сети YES Center.
        </p>
      </div>

      {/* Bento KPI grid */}
      <div className="grid grid-cols-12 gap-4">
        <BigStat
          className="col-span-6 lg:col-span-3"
          label="Филиалов"
          value={branches.data?.length ?? '—'}
          tone="forest"
          icon={<Building2 size={16} strokeWidth={2} />}
        />
        <BigStat
          className="col-span-6 lg:col-span-3"
          label="Пользователей"
          value={users.data?.length ?? '—'}
          tone="ink"
          icon={<Users size={16} strokeWidth={2} />}
        />
        <BigStat
          className="col-span-6 lg:col-span-3"
          label="Групп"
          value={groups.data?.length ?? '—'}
          tone="gold"
          icon={<Layers size={16} strokeWidth={2} />}
        />
        <BigStat
          className="col-span-6 lg:col-span-3"
          label="Уроков"
          value={lessons.data?.length ?? '—'}
          tone="sage"
          icon={<CalendarClock size={16} strokeWidth={2} />}
        />
      </div>

      <section>
        <SectionTitle title="Быстрый доступ" icon={<Sparkles size={14} strokeWidth={2} />} />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <QuickLink to="/admin" icon={<ShieldCheck size={18} strokeWidth={2} />} label="Заявки" />
          <QuickLink to="/branches" icon={<Building2 size={18} strokeWidth={2} />} label="Филиалы" />
          <QuickLink to="/courses" icon={<GraduationCap size={18} strokeWidth={2} />} label="Курсы" />
          <QuickLink to="/groups" icon={<Layers size={18} strokeWidth={2} />} label="Группы" />
          <QuickLink to="/users" icon={<Users size={18} strokeWidth={2} />} label="Пользователи" />
          <QuickLink to="/lessons" icon={<CalendarClock size={18} strokeWidth={2} />} label="Уроки" />
        </div>
      </section>
    </div>
  );
}

/* ─── shared ──────────────────────────────────────────────── */

function KPI({
  icon,
  value,
  label,
  tone,
}: {
  icon?: React.ReactNode;
  value: string;
  label: string;
  tone: 'forest' | 'gold' | 'sage';
}) {
  const cls = {
    forest: 'bg-forest-50 text-forest-700',
    gold: 'bg-gold-50 text-gold-700',
    sage: 'bg-sage-50 text-sage-700',
  }[tone];
  return (
    <div className="inline-flex items-center gap-2 rounded-2xl bg-paper-50 border border-paper-300 px-3 py-2 shadow-soft">
      {icon && (
        <span className={`inline-flex h-7 w-7 items-center justify-center rounded-lg ${cls}`}>
          {icon}
        </span>
      )}
      <div className="leading-none">
        <div className="font-display text-base font-extrabold num text-ink-900">{value}</div>
        <div className="text-[9px] uppercase tracking-[0.16em] font-bold text-ink-400 mt-0.5">
          {label}
        </div>
      </div>
    </div>
  );
}

function BigStat({
  label,
  value,
  tone,
  icon,
  className,
}: {
  label: string;
  value: string | number;
  tone: 'forest' | 'gold' | 'sage' | 'ink';
  icon: React.ReactNode;
  className?: string;
}) {
  const bg = {
    forest: 'from-forest-50 to-paper-50 [&_.dot]:bg-forest-500 [&_.iconbg]:bg-forest-100 [&_.iconbg]:text-forest-700',
    gold: 'from-gold-50 to-paper-50 [&_.dot]:bg-gold-500 [&_.iconbg]:bg-gold-100 [&_.iconbg]:text-gold-700',
    sage: 'from-sage-50 to-paper-50 [&_.dot]:bg-sage-500 [&_.iconbg]:bg-sage-50 [&_.iconbg]:text-sage-700',
    ink: 'from-paper-100 to-paper-50 [&_.dot]:bg-ink-700 [&_.iconbg]:bg-paper-200 [&_.iconbg]:text-ink-700',
  }[tone];
  return (
    <div className={`card-elevated bg-gradient-to-br ${bg} relative overflow-hidden ${className}`}>
      <div className="flex items-start justify-between mb-3">
        <span className="iconbg inline-flex h-9 w-9 items-center justify-center rounded-xl">
          {icon}
        </span>
        <span className="dot h-2 w-2 rounded-full" aria-hidden />
      </div>
      <div className="font-display text-display-lg font-extrabold num text-ink-900 leading-none">
        {value}
      </div>
      <div className="text-[10px] uppercase tracking-[0.16em] font-bold text-ink-500 mt-2">
        {label}
      </div>
    </div>
  );
}

function SectionTitle({
  title,
  link,
  icon,
}: {
  title: string;
  link?: { to: string; label: string };
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        {icon && (
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-forest-50 text-forest-600">
            {icon}
          </span>
        )}
        <h2 className="font-display text-lg font-extrabold text-ink-900 tracking-tight">
          {title}
        </h2>
      </div>
      {link && (
        <Link
          to={link.to}
          className="inline-flex items-center gap-1 text-xs uppercase tracking-[0.14em] font-bold text-ink-500 hover:text-forest-700 transition-colors"
        >
          {link.label}
          <ArrowUpRight size={12} strokeWidth={2.5} />
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
      className="group card tappable flex flex-col items-start gap-3 hover:border-forest-500 hover:shadow-pop transition-all"
    >
      <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-forest-50 text-forest-600 group-hover:bg-forest-600 group-hover:text-white transition-colors">
        {icon}
      </span>
      <span className="font-display font-bold text-sm text-ink-900">{label}</span>
    </Link>
  );
}

function skillsFromProgress(p: {
  attendance_rate: number;
  homework_submitted: number;
  homework_total: number;
  avg_score: number | null;
}) {
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
