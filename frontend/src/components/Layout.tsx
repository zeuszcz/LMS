import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/authStore';
import { fetchNotifications } from '@/api/notifications';
import { clsx } from 'clsx';
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

function visibleFor(item: NavItem, roles: UserRole[], superuser: boolean): boolean {
  if (superuser) return true;
  if (item.roles === 'all') return true;
  return roles.some((r) => item.roles.includes(r));
}

export function Layout() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();

  const { data: notifData } = useQuery({
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

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <div className="font-bold text-brand-700 tracking-tight">YES&nbsp;LMS</div>
            <nav className="flex gap-1 overflow-x-auto">
              {items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    clsx(
                      'px-3 py-1.5 rounded-md text-sm font-medium whitespace-nowrap',
                      isActive
                        ? 'bg-brand-50 text-brand-700'
                        : 'text-slate-600 hover:text-slate-900',
                    )
                  }
                  end={item.to === '/'}
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <NavLink
              to="/notifications"
              className="relative px-2 py-1 rounded-md text-slate-600 hover:bg-slate-100"
              title="Уведомления"
            >
              🔔
              {notifData && notifData.unread > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] rounded-full px-1 min-w-[16px] text-center">
                  {notifData.unread}
                </span>
              )}
            </NavLink>
            <span className="text-slate-600 hidden sm:inline">{user?.full_name ?? 'Гость'}</span>
            <span className="text-xs text-slate-400 hidden md:inline">
              {(user?.roles ?? []).join(', ') || (user?.is_superuser ? 'superuser' : '—')}
            </span>
            <button onClick={onLogout} className="btn-secondary text-xs py-1 px-2">
              Выйти
            </button>
          </div>
        </div>
      </header>
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-6">
        <Outlet />
      </main>
      <footer className="border-t border-slate-200 bg-white py-3 text-center text-xs text-slate-500">
        © 2026 YES Center · LMS Platform
      </footer>
    </div>
  );
}
