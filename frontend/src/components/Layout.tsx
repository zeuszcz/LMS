import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { clsx } from 'clsx';
import { Bell, LogOut, Sparkles } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { fetchNotifications } from '@/api/notifications';
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

function Wordmark({ size = 'md' }: { size?: 'sm' | 'md' }) {
  const wrap = size === 'sm' ? 'gap-1.5' : 'gap-2';
  const dot = size === 'sm' ? 'h-1.5 w-1.5' : 'h-2 w-2';
  const text = size === 'sm' ? 'text-base' : 'text-lg';
  return (
    <span className={clsx('inline-flex items-center', wrap)}>
      <span className={clsx('font-display font-extrabold tracking-tight text-ink-900', text)}>
        YES
      </span>
      <span className={clsx('rounded-full bg-gold-500', dot)} aria-hidden />
      <span className={clsx('font-display font-medium tracking-tight text-ink-500', text)}>
        LMS
      </span>
    </span>
  );
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

  const initials = (user?.full_name ?? '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase();

  return (
    <div className="min-h-screen flex flex-col bg-paper-100">
      <header className="sticky top-0 z-20 bg-paper-50/85 backdrop-blur border-b border-paper-300">
        <div className="max-w-[1200px] mx-auto px-6 h-16 flex items-center justify-between gap-6">
          <NavLink to="/" className="flex-shrink-0">
            <Wordmark />
          </NavLink>

          <nav className="hidden md:flex items-center gap-1">
            {items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  clsx(
                    'px-3.5 py-1.5 rounded-full text-sm font-medium tracking-tight transition-colors',
                    isActive
                      ? 'bg-forest-50 text-forest-700'
                      : 'text-ink-600 hover:text-ink-900 hover:bg-paper-200',
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-1.5">
            <NavLink
              to="/notifications"
              className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl text-ink-600 hover:text-ink-900 hover:bg-paper-200 transition-colors"
              aria-label="Уведомления"
            >
              <Bell size={18} strokeWidth={1.8} />
              {notif && notif.unread > 0 && (
                <span className="absolute top-1.5 right-1.5 inline-flex h-2 w-2 rounded-full bg-gold-500 ring-2 ring-paper-50" />
              )}
            </NavLink>
            <div className="hidden sm:flex items-center gap-2 pl-2 ml-1 border-l border-paper-300">
              <div className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-forest-500 to-forest-700 text-white text-xs font-bold">
                {initials || <Sparkles size={14} />}
              </div>
              <div className="hidden lg:block leading-tight">
                <div className="text-sm font-semibold text-ink-900">
                  {user?.full_name?.split(' ')[0] ?? 'Гость'}
                </div>
                <div className="text-[10px] uppercase tracking-[0.14em] font-bold text-ink-400">
                  {primaryRole ? ROLE_LABEL[primaryRole] : 'Сессия'}
                </div>
              </div>
            </div>
            <button
              onClick={onLogout}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-ink-500 hover:text-terra-500 hover:bg-paper-200 transition-colors"
              aria-label="Выйти"
            >
              <LogOut size={16} strokeWidth={1.8} />
            </button>
          </div>
        </div>

        {/* Mobile nav */}
        <div className="md:hidden border-t border-paper-300">
          <nav className="max-w-[1200px] mx-auto flex items-center gap-1.5 overflow-x-auto px-4 py-2.5">
            {items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  clsx(
                    'whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-semibold tracking-tight transition-colors',
                    isActive
                      ? 'bg-forest-600 text-white'
                      : 'bg-paper-100 text-ink-700 hover:bg-paper-200',
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

      <footer className="mt-20 border-t border-paper-300 bg-paper-50">
        <div className="max-w-[1200px] mx-auto px-6 py-6 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <Wordmark size="sm" />
          <div className="text-xs text-ink-500">
            © 2026 YES Center · Лингвистический центр · Москва, МО, Владимир
          </div>
        </div>
      </footer>
    </div>
  );
}
