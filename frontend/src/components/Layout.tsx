import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { clsx } from 'clsx';
import {
  Bell,
  Building2,
  CalendarClock,
  GraduationCap,
  Layers,
  LayoutDashboard,
  LogOut,
  Menu,
  PenLine,
  Settings,
  ShieldCheck,
  Sparkles,
  Users,
  X,
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { fetchNotifications } from '@/api/notifications';
import type { UserRole } from '@/types';

type LucideIcon = typeof LayoutDashboard;
interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  roles: UserRole[] | 'all';
}

const NAV: NavItem[] = [
  { to: '/', label: 'Главная', icon: LayoutDashboard, roles: 'all' },
  { to: '/courses', label: 'Курсы', icon: GraduationCap, roles: 'all' },
  { to: '/groups', label: 'Группы', icon: Layers, roles: 'all' },
  { to: '/lessons', label: 'Уроки', icon: CalendarClock, roles: ['student', 'teacher', 'methodist', 'admin', 'branch_manager'] },
  { to: '/homework', label: 'Домашки', icon: PenLine, roles: ['student', 'teacher', 'methodist', 'admin'] },
];

const ADMIN_NAV: NavItem[] = [
  { to: '/admin', label: 'Заявки', icon: ShieldCheck, roles: ['admin', 'methodist', 'branch_manager'] },
  { to: '/branches', label: 'Филиалы', icon: Building2, roles: ['admin', 'methodist', 'branch_manager'] },
  { to: '/users', label: 'Пользователи', icon: Users, roles: ['admin', 'branch_manager'] },
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

function Wordmark() {
  return (
    <div className="inline-flex items-center gap-2.5">
      <div
        className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-forest-500 via-forest-600 to-forest-800 text-white shadow-pop"
        aria-hidden
      >
        <span className="font-display font-extrabold text-base">Y</span>
      </div>
      <div className="leading-tight">
        <div className="font-display text-base font-extrabold tracking-tight text-ink-900">
          YES <span className="text-gold-500">·</span> LMS
        </div>
        <div className="text-[10px] uppercase tracking-[0.16em] font-bold text-ink-400">
          Linguistic platform
        </div>
      </div>
    </div>
  );
}

interface SidebarProps {
  primary: NavItem[];
  admin: NavItem[];
  unread: number;
  user: ReturnType<typeof useAuthStore.getState>['user'];
  primaryRole: UserRole | null;
  onLogout: () => void;
  onClose?: () => void;
}

function Sidebar({ primary, admin, unread, user, primaryRole, onLogout, onClose }: SidebarProps) {
  const initials = (user?.full_name ?? '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase();

  return (
    <aside className="h-full w-[260px] flex-shrink-0 flex flex-col bg-paper-50 border-r border-paper-300">
      {/* Brand */}
      <div className="flex items-center justify-between px-5 h-16 border-b border-paper-300">
        <NavLink to="/" onClick={onClose}>
          <Wordmark />
        </NavLink>
        {onClose && (
          <button
            onClick={onClose}
            className="lg:hidden inline-flex h-8 w-8 items-center justify-center rounded-lg text-ink-500 hover:text-ink-900 hover:bg-paper-200"
            aria-label="Закрыть меню"
          >
            <X size={16} strokeWidth={2} />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-5 space-y-6">
        <div>
          <div className="px-3 mb-2 text-[10px] uppercase tracking-[0.16em] font-bold text-ink-400">
            Навигация
          </div>
          <div className="space-y-0.5">
            {primary.map((item) => (
              <SideLink key={item.to} item={item} onClose={onClose} />
            ))}
          </div>
        </div>

        {admin.length > 0 && (
          <div>
            <div className="px-3 mb-2 text-[10px] uppercase tracking-[0.16em] font-bold text-ink-400">
              Администрирование
            </div>
            <div className="space-y-0.5">
              {admin.map((item) => (
                <SideLink key={item.to} item={item} onClose={onClose} />
              ))}
            </div>
          </div>
        )}

        <div>
          <div className="px-3 mb-2 text-[10px] uppercase tracking-[0.16em] font-bold text-ink-400">
            Мне
          </div>
          <div className="space-y-0.5">
            <SideLink
              item={{ to: '/notifications', label: 'Уведомления', icon: Bell, roles: 'all' }}
              badge={unread > 0 ? unread : undefined}
              onClose={onClose}
            />
            <SideLink
              item={{ to: '/profile', label: 'Профиль', icon: Settings, roles: 'all' }}
              onClose={onClose}
            />
          </div>
        </div>
      </nav>

      {/* User card */}
      <div className="p-3 border-t border-paper-300">
        <div className="rounded-2xl bg-gradient-to-br from-paper-100 to-paper-200 p-3 flex items-center gap-3">
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-forest-500 to-forest-700 text-white text-xs font-extrabold flex-shrink-0">
            {initials || <Sparkles size={14} />}
          </div>
          <div className="flex-1 min-w-0 leading-tight">
            <div className="text-sm font-semibold text-ink-900 truncate">
              {user?.full_name ?? 'Гость'}
            </div>
            <div className="text-[10px] uppercase tracking-[0.16em] font-bold text-ink-400 truncate">
              {primaryRole ? ROLE_LABEL[primaryRole] : 'Сессия'}
            </div>
          </div>
          <button
            onClick={onLogout}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-ink-500 hover:text-terra-500 hover:bg-paper-50 transition-colors flex-shrink-0"
            aria-label="Выйти"
          >
            <LogOut size={14} strokeWidth={2} />
          </button>
        </div>
      </div>
    </aside>
  );
}

function SideLink({
  item,
  badge,
  onClose,
}: {
  item: NavItem;
  badge?: number;
  onClose?: () => void;
}) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.to}
      end={item.to === '/'}
      onClick={onClose}
      className={({ isActive }) =>
        clsx(
          'group flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium tracking-tight transition-all',
          isActive
            ? 'bg-gradient-to-r from-forest-600 to-forest-700 text-white shadow-pop'
            : 'text-ink-600 hover:bg-paper-200 hover:text-ink-900',
        )
      }
    >
      {({ isActive }) => (
        <>
          <Icon
            size={16}
            strokeWidth={2}
            className={isActive ? 'text-white' : 'text-ink-400 group-hover:text-ink-700'}
          />
          <span className="flex-1">{item.label}</span>
          {badge !== undefined && (
            <span
              className={clsx(
                'inline-flex h-5 min-w-5 items-center justify-center px-1 rounded-full text-[10px] font-bold',
                isActive ? 'bg-white text-forest-700' : 'bg-gold-500 text-white',
              )}
            >
              {badge}
            </span>
          )}
        </>
      )}
    </NavLink>
  );
}

export function Layout() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  const location = useLocation();

  const { data: notif } = useQuery({
    queryKey: ['notifications'],
    queryFn: fetchNotifications,
    refetchInterval: 60_000,
  });

  const [mobileOpen, setMobileOpen] = useState(false);

  const onLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const visiblePrimary = NAV.filter((i) =>
    visibleFor(i, (user?.roles ?? []) as UserRole[], user?.is_superuser ?? false),
  );
  const visibleAdmin = ADMIN_NAV.filter((i) =>
    visibleFor(i, (user?.roles ?? []) as UserRole[], user?.is_superuser ?? false),
  );

  const primaryRole = (user?.roles?.[0] ?? (user?.is_superuser ? 'admin' : null)) as UserRole | null;
  const unread = notif?.unread ?? 0;

  // Build a simple breadcrumb from URL
  const segments = location.pathname.split('/').filter(Boolean);
  const crumbs: string[] = [];
  if (segments.length === 0) crumbs.push('Главная');
  else {
    const first = segments[0];
    const map: Record<string, string> = {
      courses: 'Курсы',
      groups: 'Группы',
      lessons: 'Уроки',
      homework: 'Домашки',
      branches: 'Филиалы',
      users: 'Пользователи',
      admin: 'Администрирование',
      notifications: 'Уведомления',
      profile: 'Профиль',
    };
    crumbs.push(map[first] ?? first);
    if (segments.length > 1) crumbs.push('Детали');
  }

  return (
    <div className="min-h-screen flex bg-paper-100">
      {/* Sidebar — desktop */}
      <div className="hidden lg:block sticky top-0 h-screen">
        <Sidebar
          primary={visiblePrimary}
          admin={visibleAdmin}
          unread={unread}
          user={user}
          primaryRole={primaryRole}
          onLogout={onLogout}
        />
      </div>

      {/* Sidebar — mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 flex lg:hidden">
          <div
            className="absolute inset-0 bg-ink-900/40 backdrop-blur-sm animate-fade-in"
            onClick={() => setMobileOpen(false)}
            aria-hidden
          />
          <div className="relative animate-fade-up">
            <Sidebar
              primary={visiblePrimary}
              admin={visibleAdmin}
              unread={unread}
              user={user}
              primaryRole={primaryRole}
              onLogout={onLogout}
              onClose={() => setMobileOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Main column */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <header className="sticky top-0 z-20 bg-paper-100/85 backdrop-blur border-b border-paper-300">
          <div className="px-5 lg:px-8 h-16 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <button
                onClick={() => setMobileOpen(true)}
                className="lg:hidden inline-flex h-9 w-9 items-center justify-center rounded-xl text-ink-700 hover:bg-paper-200"
                aria-label="Меню"
              >
                <Menu size={18} strokeWidth={2} />
              </button>
              <nav className="flex items-center gap-2 text-sm min-w-0">
                {crumbs.map((c, i) => (
                  <span key={i} className="flex items-center gap-2 min-w-0">
                    {i > 0 && <span className="text-ink-300">›</span>}
                    <span
                      className={
                        i === crumbs.length - 1
                          ? 'font-semibold text-ink-900 truncate'
                          : 'text-ink-500 truncate'
                      }
                    >
                      {c}
                    </span>
                  </span>
                ))}
              </nav>
            </div>

            <div className="flex items-center gap-1">
              <NavLink
                to="/notifications"
                className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl text-ink-600 hover:text-ink-900 hover:bg-paper-200 transition-colors"
                aria-label="Уведомления"
              >
                <Bell size={18} strokeWidth={1.8} />
                {unread > 0 && (
                  <span className="absolute top-1.5 right-1.5 inline-flex h-2 w-2 rounded-full bg-gold-500 ring-2 ring-paper-100" />
                )}
              </NavLink>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 px-5 lg:px-8 py-6 lg:py-10">
          <div className="max-w-[1280px] mx-auto animate-fade-up">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
