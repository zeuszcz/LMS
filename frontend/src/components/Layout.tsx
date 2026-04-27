import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/authStore';
import { fetchNotifications } from '@/api/notifications';
import { clsx } from 'clsx';
import { Bell, LogOut } from 'lucide-react';
import type { UserRole } from '@/types';

interface NavItem {
  to: string;
  label: string;
  roles: UserRole[] | 'all';
}

const NAV: NavItem[] = [
  { to: '/', label: 'Главная', roles: 'all' },
  { to: '/courses', label: 'Курсы', roles: 'all' },
  { to: '/groups', label: 'Группы', roles: 'all' },
  { to: '/lessons', label: 'Уроки', roles: ['student', 'teacher', 'methodist', 'admin', 'branch_manager'] },
  { to: '/homework', label: 'Домашки', roles: ['student', 'teacher', 'methodist', 'admin'] },
  { to: '/branches', label: 'Филиалы', roles: ['admin', 'methodist', 'branch_manager'] },
  { to: '/users', label: 'Пользователи', roles: ['admin', 'branch_manager'] },
];

const ROLE_LABEL: Record<UserRole, string> = {
  student: 'Студент',
  teacher: 'Преподаватель',
  parent: 'Родитель',
  methodist: 'Методист',
  branch_manager: 'Управляющий',
  admin: 'Администратор',
  b2b_coordinator: 'Куратор B2B',
};

function visibleFor(item: NavItem, roles: UserRole[], superuser: boolean): boolean {
  if (superuser) return true;
  if (item.roles === 'all') return true;
  return roles.some((r) => item.roles.includes(r));
}

export function Layout() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();

  const { data: notif } = useQuery({
    queryKey: ['notifications'],
    queryFn: fetchNotifications,
    refetchInterval: 60_000,
  });

  const onLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const items = NAV.filter((i) =>
    visibleFor(i, (user?.roles ?? []) as UserRole[], user?.is_superuser ?? false),
  );
  const primaryRole = (user?.roles?.[0] ?? (user?.is_superuser ? 'admin' : null)) as UserRole | null;

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-20 bg-paper-100/85 backdrop-blur border-b border-ink-900/10">
        <div className="max-w-[1200px] mx-auto px-6">
          {/* Tiny utility bar */}
          <div className="flex items-center justify-between py-1.5 text-[10px] uppercase tracking-[0.2em] text-ink-400 font-semibold">
            <span>YES Center · Linguistic platform</span>
            <span className="hidden sm:inline">Москва · МО · Владимир</span>
          </div>

          {/* Main bar */}
          <div className="flex items-center justify-between gap-6 py-3 border-t border-ink-900/10">
            <NavLink to="/" className="group flex items-baseline gap-2">
              <span className="font-display text-2xl font-semibold tracking-tight text-ink-900">
                YES
              </span>
              <span className="font-display text-2xl text-gold-500 leading-none" aria-hidden>
                ·
              </span>
              <span className="font-display text-2xl font-light italic tracking-tight text-ink-700 group-hover:text-forest-700 transition-colors">
                LMS
              </span>
            </NavLink>

            <nav className="hidden md:flex items-center gap-1">
              {items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  className={({ isActive }) =>
                    clsx(
                      'relative px-3 py-1.5 text-sm tracking-tight transition-colors',
                      isActive ? 'text-ink-900 font-medium' : 'text-ink-500 hover:text-ink-900',
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      {item.label}
                      {isActive && (
                        <span className="absolute -bottom-1 left-3 right-3 h-px bg-gold-500" aria-hidden />
                      )}
                    </>
                  )}
                </NavLink>
              ))}
            </nav>

            <div className="flex items-center gap-1.5">
              <NavLink
                to="/notifications"
                className="relative inline-flex h-9 w-9 items-center justify-center rounded-md text-ink-600 hover:text-ink-900 hover:bg-paper-200 transition-colors"
                aria-label="Уведомления"
              >
                <Bell size={16} strokeWidth={1.6} />
                {notif && notif.unread > 0 && (
                  <span className="absolute top-1.5 right-1.5 inline-flex h-1.5 w-1.5 rounded-full bg-terra-500 ring-2 ring-paper-100" />
                )}
              </NavLink>
              <div className="hidden lg:flex items-center pl-3 border-l border-ink-900/10 ml-1">
                <div className="text-right">
                  <div className="text-sm text-ink-900 font-medium leading-tight">
                    {user?.full_name?.split(' ')[0] ?? 'Гость'}
                  </div>
                  <div className="text-[10px] uppercase tracking-[0.18em] text-ink-400">
                    {primaryRole ? ROLE_LABEL[primaryRole] : 'Сессия'}
                  </div>
                </div>
              </div>
              <button
                onClick={onLogout}
                className="inline-flex h-9 w-9 items-center justify-center rounded-md text-ink-500 hover:text-terra-500 hover:bg-paper-200 transition-colors"
                aria-label="Выйти"
              >
                <LogOut size={16} strokeWidth={1.6} />
              </button>
            </div>
          </div>

          {/* Mobile nav row */}
          <nav className="md:hidden flex items-center gap-1 overflow-x-auto pb-2 -mx-1 px-1">
            {items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  clsx(
                    'whitespace-nowrap px-3 py-1 rounded-full text-xs tracking-tight border transition-colors',
                    isActive
                      ? 'bg-ink-900 text-paper-50 border-ink-900'
                      : 'bg-paper-50 text-ink-700 border-paper-300 hover:border-ink-700',
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      <main className="flex-1 max-w-[1200px] mx-auto w-full px-6 py-10">
        <div className="animate-fade-up">
          <Outlet />
        </div>
      </main>

      <footer className="border-t border-ink-900/10 bg-paper-100">
        <div className="max-w-[1200px] mx-auto px-6 py-6 flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
          <div className="font-display text-sm text-ink-500">
            <span className="italic">«Вы становитесь языком, на котором говорите.»</span>
          </div>
          <div className="text-[11px] uppercase tracking-[0.2em] text-ink-400 font-semibold">
            © 2026 · YES Center
          </div>
        </div>
      </footer>
    </div>
  );
}
