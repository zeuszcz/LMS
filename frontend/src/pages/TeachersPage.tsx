import { useQuery } from '@tanstack/react-query';
import { GraduationCap, Layers, Mail, Users } from 'lucide-react';
import { fetchTeachersLoad } from '@/api/teachers';
import { PageHeader } from '@/components/ui/PageHeader';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { useAuthStore } from '@/stores/authStore';

export function TeachersPage() {
  const user = useAuthStore((s) => s.user);
  const isStaff =
    !!user &&
    (user.is_superuser ||
      user.roles.includes('admin') ||
      user.roles.includes('methodist') ||
      user.roles.includes('branch_manager'));

  const teachers = useQuery({
    queryKey: ['teachers-load'],
    queryFn: fetchTeachersLoad,
    enabled: isStaff,
  });

  if (!isStaff) {
    return (
      <EmptyState
        icon={<GraduationCap size={20} strokeWidth={1.6} />}
        title="Только для команды YES"
        description="Преподавательский ростер доступен админам, методистам и управляющим филиалов."
      />
    );
  }

  const items = teachers.data ?? [];
  const totalGroups = items.reduce((s, t) => s + t.active_groups, 0);
  const totalStudents = items.reduce((s, t) => s + t.total_students, 0);
  const totalToday = items.reduce((s, t) => s + t.today_lessons, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Команда"
        title="Преподаватели"
        description="Активная нагрузка по группам, студентам и сегодняшним урокам."
      />

      {/* KPI strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPI label="Преподавателей" value={items.length} icon={<GraduationCap size={16} strokeWidth={2} />} tone="forest" />
        <KPI label="Активных групп" value={totalGroups} icon={<Layers size={16} strokeWidth={2} />} tone="gold" />
        <KPI label="Студентов" value={totalStudents} icon={<Users size={16} strokeWidth={2} />} tone="sage" />
        <KPI label="Уроков сегодня" value={totalToday} icon={<Mail size={16} strokeWidth={2} />} tone="ink" />
      </div>

      {teachers.isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={<GraduationCap size={20} strokeWidth={1.6} />}
          title="Преподавателей нет"
          description="Создайте пользователя с ролью teacher через /api/users."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((t) => (
            <article key={t.id} className="card-elevated flex flex-col">
              <div className="flex items-center gap-3">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-forest-500 to-forest-700 text-white text-sm font-extrabold flex-shrink-0">
                  {initials(t.full_name)}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-display text-base font-extrabold text-ink-900 truncate">
                    {t.full_name}
                  </h3>
                  <div className="text-xs text-ink-500 font-mono truncate">{t.email ?? '—'}</div>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-3 gap-2 text-center">
                <Mini value={t.active_groups} label="групп" tone="forest" />
                <Mini value={t.total_students} label="студ." tone="sage" />
                <Mini value={t.today_lessons} label="сегодня" tone="gold" />
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase();
}

function KPI({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  tone: 'forest' | 'gold' | 'sage' | 'ink';
}) {
  const cls = {
    forest: 'bg-forest-50 text-forest-700',
    gold: 'bg-gold-50 text-gold-700',
    sage: 'bg-sage-50 text-sage-700',
    ink: 'bg-paper-200 text-ink-700',
  }[tone];
  return (
    <div className="card-elevated">
      <div className="flex items-center justify-between">
        <span className={`inline-flex h-9 w-9 items-center justify-center rounded-xl ${cls}`}>
          {icon}
        </span>
      </div>
      <div className="font-display text-display-md font-extrabold num text-ink-900 leading-none mt-3">
        {value}
      </div>
      <div className="text-[10px] uppercase tracking-[0.16em] font-bold text-ink-500 mt-2">
        {label}
      </div>
    </div>
  );
}

function Mini({
  value,
  label,
  tone,
}: {
  value: number;
  label: string;
  tone: 'forest' | 'gold' | 'sage';
}) {
  const cls = {
    forest: 'bg-forest-50 text-forest-700',
    gold: 'bg-gold-50 text-gold-700',
    sage: 'bg-sage-50 text-sage-700',
  }[tone];
  return (
    <div className={`rounded-xl ${cls} py-2`}>
      <div className="font-display text-lg font-extrabold num leading-none">{value}</div>
      <div className="text-[9px] uppercase tracking-[0.14em] font-bold mt-1 opacity-80">
        {label}
      </div>
    </div>
  );
}
