import { useAuthStore } from '@/stores/authStore';
import { PageHeader } from '@/components/ui/PageHeader';
import { Globe, KeyRound, LogOut, Mail, Shield, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/components/ui/Toast';

const ROLE_LABEL: Record<string, string> = {
  student: 'Студент',
  teacher: 'Преподаватель',
  parent: 'Родитель',
  methodist: 'Методист',
  branch_manager: 'Управляющий',
  admin: 'Администратор',
  b2b_coordinator: 'Куратор B2B',
};

export function ProfilePage() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();

  if (!user) return null;

  const onChangePassword = () => {
    toast('info', 'Скоро будет', 'Смена пароля появится в Phase 2.');
  };

  const onLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const initials = user.full_name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase();

  return (
    <div className="space-y-8 max-w-3xl">
      <PageHeader eyebrow="Профиль" title="Мой аккаунт" description="Контактные данные, безопасность, выход." />

      <div className="card-elevated relative overflow-hidden">
        <div className="blob bg-forest-500 h-48 w-48 -top-8 -right-8 opacity-20" />
        <div className="relative flex items-start gap-5">
          <div className="inline-flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-forest-500 to-forest-700 text-white text-2xl font-extrabold flex-shrink-0">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-display-md font-extrabold text-ink-900 leading-tight text-balance">
              {user.full_name}
            </h2>
            <div className="mt-1.5 flex items-center gap-2 flex-wrap">
              {user.is_superuser && (
                <span className="pill-terra font-semibold">
                  <Shield size={10} strokeWidth={2} /> Superuser
                </span>
              )}
              {user.roles.map((r) => (
                <span key={r} className="pill-forest">
                  {ROLE_LABEL[r] ?? r}
                </span>
              ))}
            </div>
            <div className="mt-4 grid sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
              <Info icon={<Mail size={14} strokeWidth={1.8} />} label="Email" value={user.email ?? '—'} />
              <Info icon={<Globe size={14} strokeWidth={1.8} />} label="Локаль" value={user.locale.toUpperCase()} />
              <Info icon={<User size={14} strokeWidth={1.8} />} label="Часовой пояс" value={user.timezone} />
            </div>
          </div>
        </div>
      </div>

      <section>
        <h3 className="eyebrow">Безопасность</h3>
        <div className="card flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-forest-50 text-forest-600">
              <KeyRound size={18} strokeWidth={2} />
            </div>
            <div>
              <div className="font-display font-bold text-ink-900">Сменить пароль</div>
              <div className="text-xs text-ink-500">
                Рекомендуем менять пароль каждые 90 дней.
              </div>
            </div>
          </div>
          <button onClick={onChangePassword} className="btn-secondary btn-sm">
            Изменить
          </button>
        </div>
      </section>

      <section>
        <h3 className="eyebrow">Сессия</h3>
        <div className="card flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-terra-50 text-terra-700">
              <LogOut size={18} strokeWidth={2} />
            </div>
            <div>
              <div className="font-display font-bold text-ink-900">Выйти из аккаунта</div>
              <div className="text-xs text-ink-500">
                Сессия завершится на этом устройстве.
              </div>
            </div>
          </div>
          <button onClick={onLogout} className="btn-danger btn-sm">
            Выйти
          </button>
        </div>
      </section>
    </div>
  );
}

function Info({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.16em] font-bold text-ink-400">
        {icon}
        {label}
      </div>
      <div className="text-ink-900 font-medium mt-0.5 break-words">{value}</div>
    </div>
  );
}
