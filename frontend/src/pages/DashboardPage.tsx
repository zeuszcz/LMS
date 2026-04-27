import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/authStore';
import { fetchLessons } from '@/api/lessons';
import { fetchAssignments } from '@/api/assignments';
import { fetchProgress } from '@/api/progress';
import { fetchGroups } from '@/api/groups';
import { fetchBranches } from '@/api/branches';
import { fetchUsers } from '@/api/users';
import { formatDateTime, relativeTime, LESSON_STATUS_LABEL } from '@/lib/format';

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
  return <div className="text-slate-500">Для вашей роли дашборд ещё не настроен.</div>;
}

function StudentDashboard() {
  const user = useAuthStore((s) => s.user)!;
  const lessons = useQuery({ queryKey: ['lessons-mine'], queryFn: () => fetchLessons() });
  const assignments = useQuery({ queryKey: ['hw-mine'], queryFn: () => fetchAssignments({ student_only: true }) });
  const progress = useQuery({ queryKey: ['progress', user.id], queryFn: () => fetchProgress(user.id) });

  const upcoming = (lessons.data ?? []).filter((l) => new Date(l.scheduled_at) >= new Date()).slice(0, 5);
  const next = upcoming[0];
  const pendingHomework = (assignments.data ?? []).filter((a) => !a.due_at || new Date(a.due_at) > new Date()).slice(0, 5);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Здравствуйте, {user.full_name}!</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="Посещаемость" value={progress.data ? `${Math.round(progress.data.attendance_rate * 100)}%` : '—'} />
        <Stat label="Уроков всего" value={progress.data?.lessons_total ?? '—'} />
        <Stat label="Домашек сдано" value={progress.data ? `${progress.data.homework_submitted}/${progress.data.homework_total}` : '—'} />
        <Stat label="Средний балл" value={progress.data?.avg_score?.toFixed(1) ?? '—'} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card">
          <h2 className="font-semibold text-slate-900 mb-3">Ближайший урок</h2>
          {next ? (
            <Link to={`/lessons/${next.id}`} className="block">
              <div className="text-lg font-medium">{next.title}</div>
              <div className="text-sm text-slate-500">
                {formatDateTime(next.scheduled_at)} · {relativeTime(next.scheduled_at)}
              </div>
            </Link>
          ) : (
            <div className="text-slate-500 text-sm">Уроков впереди нет</div>
          )}
        </div>

        <div className="card">
          <h2 className="font-semibold text-slate-900 mb-3">Расписание</h2>
          <ul className="text-sm space-y-1">
            {upcoming.length === 0 && <li className="text-slate-400">Нет данных</li>}
            {upcoming.map((l) => (
              <li key={l.id} className="flex justify-between">
                <span>{l.title}</span>
                <span className="text-slate-500">{formatDateTime(l.scheduled_at)}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-slate-900">Домашние задания</h2>
          <Link to="/homework" className="text-xs text-brand-600 hover:underline">Все →</Link>
        </div>
        {pendingHomework.length === 0 ? (
          <div className="text-slate-500 text-sm">Нет активных заданий</div>
        ) : (
          <ul className="divide-y divide-slate-100 text-sm">
            {pendingHomework.map((a) => (
              <li key={a.id} className="py-2 flex justify-between">
                <span>{a.title}</span>
                <span className="text-slate-500">
                  {a.due_at ? `до ${formatDateTime(a.due_at)}` : 'без дедлайна'}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

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
  const upcoming = (lessons.data ?? []).filter((l) => new Date(l.scheduled_at) >= tomorrow).slice(0, 8);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Преподаватель: {user.full_name}</h1>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Stat label="Мои группы" value={groups.data?.length ?? '—'} />
        <Stat label="Уроков сегодня" value={todayLessons.length} />
        <Stat label="Уроков впереди" value={upcoming.length} />
      </div>

      <div className="card">
        <h2 className="font-semibold text-slate-900 mb-3">Сегодня</h2>
        {todayLessons.length === 0 ? (
          <div className="text-slate-500 text-sm">Уроков сегодня нет</div>
        ) : (
          <ul className="divide-y divide-slate-100 text-sm">
            {todayLessons.map((l) => (
              <li key={l.id} className="py-2 flex items-center justify-between">
                <Link to={`/lessons/${l.id}`} className="hover:text-brand-700 font-medium">
                  {l.title}
                </Link>
                <span className="text-slate-500">{formatDateTime(l.scheduled_at)} · {LESSON_STATUS_LABEL[l.status]}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="card">
        <h2 className="font-semibold text-slate-900 mb-3">Мои группы</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {(groups.data ?? []).map((g) => (
            <Link key={g.id} to={`/groups/${g.id}`} className="border border-slate-200 rounded p-3 hover:bg-slate-50">
              <div className="text-sm font-medium">Группа {g.id.slice(0, 8)}…</div>
              <div className="text-xs text-slate-500">старт {g.start_date}</div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

function ParentDashboard() {
  const user = useAuthStore((s) => s.user)!;
  const notif = useQuery({ queryKey: ['notif-parent'] });
  void notif;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Кабинет родителя: {user.full_name}</h1>
      <div className="card">
        <p className="text-sm text-slate-600">
          В демо-режиме привязка детей выполняется через сидер. В личном кабинете родителя
          (когда дети будут привязаны) вы увидите их прогресс, домашки и уроки.
        </p>
        <p className="text-xs text-slate-400 mt-2">
          API: <code>GET /api/billing/payments/{'{student_id}'}</code>,{' '}
          <code>GET /api/progress/{'{student_id}'}</code>.
        </p>
      </div>
      <div className="card">
        <h2 className="font-semibold text-slate-900 mb-2">Уведомления</h2>
        <Link to="/notifications" className="text-sm text-brand-600 hover:underline">
          Открыть →
        </Link>
      </div>
    </div>
  );
}

function AdminDashboard() {
  const user = useAuthStore((s) => s.user)!;
  const branches = useQuery({ queryKey: ['branches'], queryFn: fetchBranches });
  const users = useQuery({ queryKey: ['users'], queryFn: () => fetchUsers({ limit: 200 }) });
  const groups = useQuery({ queryKey: ['groups-all'], queryFn: () => fetchGroups() });
  const lessons = useQuery({ queryKey: ['lessons-all'], queryFn: () => fetchLessons() });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Дашборд: {user.full_name}</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="Филиалов" value={branches.data?.length ?? '—'} />
        <Stat label="Пользователей" value={users.data?.length ?? '—'} />
        <Stat label="Групп" value={groups.data?.length ?? '—'} />
        <Stat label="Уроков (загружено)" value={lessons.data?.length ?? '—'} />
      </div>

      <div className="card">
        <h2 className="font-semibold text-slate-900 mb-3">Быстрые ссылки</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm">
          <Link to="/branches" className="btn-secondary">Филиалы</Link>
          <Link to="/courses" className="btn-secondary">Курсы</Link>
          <Link to="/groups" className="btn-secondary">Группы</Link>
          <Link to="/users" className="btn-secondary">Пользователи</Link>
          <Link to="/lessons" className="btn-secondary">Уроки</Link>
          <Link to="/homework" className="btn-secondary">Домашки</Link>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="card">
      <div className="text-sm text-slate-500">{label}</div>
      <div className="text-3xl font-bold text-slate-900 mt-1">{value}</div>
    </div>
  );
}
