import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Filter, Search, Users } from 'lucide-react';
import { fetchMyStudents } from '@/api/teachers';
import { PageHeader } from '@/components/ui/PageHeader';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { Rating } from '@/components/ui/Rating';
import { useAuthStore } from '@/stores/authStore';

export function MyStudentsPage() {
  const user = useAuthStore((s) => s.user);
  const allowed =
    !!user &&
    (user.is_superuser ||
      user.roles.includes('teacher') ||
      user.roles.includes('admin') ||
      user.roles.includes('methodist') ||
      user.roles.includes('branch_manager'));

  const students = useQuery({
    queryKey: ['my-students'],
    queryFn: fetchMyStudents,
    enabled: allowed,
  });

  const [q, setQ] = useState('');
  const [groupFilter, setGroupFilter] = useState<string | 'all'>('all');

  const items = students.data ?? [];

  const groups = useMemo(() => {
    const seen = new Map<string, { id: string; title: string; level: string }>();
    for (const s of items) {
      seen.set(s.group_id, {
        id: s.group_id,
        title: s.course_title,
        level: s.course_level,
      });
    }
    return Array.from(seen.values());
  }, [items]);

  const filtered = items.filter((s) => {
    if (groupFilter !== 'all' && s.group_id !== groupFilter) return false;
    if (!q) return true;
    const needle = q.toLowerCase();
    return (
      s.full_name.toLowerCase().includes(needle) ||
      (s.email ?? '').toLowerCase().includes(needle) ||
      s.course_title.toLowerCase().includes(needle)
    );
  });

  if (!allowed) {
    return (
      <EmptyState
        icon={<Users size={20} strokeWidth={1.6} />}
        title="Только для преподавателей"
        description="Эта страница доступна преподавателям, методистам, управляющим филиалов и администраторам."
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Мои студенты"
        title="Ростер групп"
        description="Все студенты ваших активных групп с показателями посещаемости и оценками."
      />

      {/* KPI */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KPI label="Студентов" value={items.length} />
        <KPI label="Групп" value={groups.length} />
        <KPI
          label="Средний balls"
          value={
            items.filter((s) => s.avg_score !== null).length > 0
              ? (
                  items.reduce((s, x) => s + (x.avg_score ?? 0), 0) /
                  Math.max(1, items.filter((s) => s.avg_score !== null).length)
                ).toFixed(1)
              : '—'
          }
        />
        <KPI
          label="Средняя посещаемость"
          value={
            items.length > 0
              ? `${Math.round(
                  (items.reduce((s, x) => s + x.attendance_rate, 0) / items.length) * 100,
                )}%`
              : '—'
          }
        />
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="inline-flex items-center gap-2">
          <Filter size={14} strokeWidth={2} className="text-ink-400" />
          <span className="text-[10px] uppercase tracking-[0.16em] font-bold text-ink-400">
            Группа
          </span>
        </div>
        <button
          onClick={() => setGroupFilter('all')}
          className={
            groupFilter === 'all'
              ? 'px-3 h-8 rounded-full text-xs font-bold bg-ink-900 text-white'
              : 'px-3 h-8 rounded-full text-xs font-medium bg-paper-50 text-ink-700 border border-paper-300 hover:border-ink-700'
          }
        >
          Все
        </button>
        {groups.map((g) => (
          <button
            key={g.id}
            onClick={() => setGroupFilter(g.id)}
            className={
              groupFilter === g.id
                ? 'px-3 h-8 rounded-full text-xs font-bold bg-ink-900 text-white'
                : 'px-3 h-8 rounded-full text-xs font-medium bg-paper-50 text-ink-700 border border-paper-300 hover:border-ink-700'
            }
          >
            {g.title.slice(0, 30)} · {g.level}
          </button>
        ))}

        <div className="relative ml-auto flex-1 min-w-[200px] max-w-sm">
          <Search size={14} strokeWidth={2} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Поиск студента…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="input pl-10 h-9 text-sm"
          />
        </div>
      </div>

      {students.isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Users size={20} strokeWidth={1.6} />}
          title={items.length === 0 ? 'Студентов пока нет' : 'По фильтру ничего не найдено'}
          description={
            items.length === 0
              ? 'Когда студенты будут зачислены в ваши группы, они появятся здесь.'
              : 'Снимите фильтр или попробуйте другой запрос.'
          }
        />
      ) : (
        <div className="card-bare overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-paper-300 bg-paper-100">
                <Th>Студент</Th>
                <Th>Курс</Th>
                <Th align="center">Посещаемость</Th>
                <Th align="center">Домашки</Th>
                <Th align="center">Средний</Th>
                <Th align="right">Действие</Th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <tr
                  key={`${s.id}-${s.group_id}`}
                  className="border-b border-paper-300 last:border-0 hover:bg-paper-100 transition-colors"
                >
                  <Td>
                    <div className="flex items-center gap-3">
                      <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-forest-500 to-forest-700 text-white text-xs font-extrabold flex-shrink-0">
                        {initials(s.full_name)}
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium text-ink-900 truncate">{s.full_name}</div>
                        <div className="text-xs text-ink-500 font-mono truncate">{s.email}</div>
                      </div>
                    </div>
                  </Td>
                  <Td>
                    <div className="text-sm text-ink-800 truncate max-w-xs">{s.course_title}</div>
                    <div className="text-xs text-ink-500">{s.course_level}</div>
                  </Td>
                  <Td align="center">
                    <span
                      className={
                        s.attendance_rate >= 0.9
                          ? 'pill-sage font-bold'
                          : s.attendance_rate >= 0.7
                          ? 'pill-gold font-bold'
                          : 'pill-terra font-bold'
                      }
                    >
                      {Math.round(s.attendance_rate * 100)}%
                    </span>
                  </Td>
                  <Td align="center">
                    <span className="text-sm font-semibold num text-ink-800">
                      {s.homework_submitted} / {s.homework_total}
                    </span>
                    <div className="text-[10px] text-ink-500 num">{s.homework_graded} оценено</div>
                  </Td>
                  <Td align="center">
                    {s.avg_score !== null ? (
                      <div className="inline-flex flex-col items-center gap-1">
                        <span className="font-display text-base font-extrabold num text-forest-700">
                          {s.avg_score.toFixed(1)}
                        </span>
                        <Rating value={s.avg_score / 2} size={10} />
                      </div>
                    ) : (
                      <span className="text-xs text-ink-400 italic">—</span>
                    )}
                  </Td>
                  <Td align="right">
                    <Link
                      to={`/groups/${s.group_id}`}
                      className="inline-flex items-center gap-1 text-xs font-bold text-forest-700 hover:gap-2 transition-all"
                    >
                      В группу <ArrowUpRight size={12} strokeWidth={2.5} />
                    </Link>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-5 py-3 border-t border-paper-300 bg-paper-100 text-[10px] uppercase tracking-[0.16em] text-ink-500 font-bold">
            {filtered.length} из {items.length}
          </div>
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

function Th({ children, align = 'left' }: { children: React.ReactNode; align?: 'left' | 'center' | 'right' }) {
  const cls =
    align === 'right'
      ? 'text-right'
      : align === 'center'
      ? 'text-center'
      : 'text-left';
  return (
    <th
      className={`${cls} px-5 py-3 text-[10px] uppercase tracking-[0.16em] text-ink-500 font-bold`}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  align = 'left',
}: {
  children: React.ReactNode;
  align?: 'left' | 'center' | 'right';
}) {
  const cls =
    align === 'right'
      ? 'text-right'
      : align === 'center'
      ? 'text-center'
      : 'text-left';
  return <td className={`${cls} px-5 py-3 text-sm`}>{children}</td>;
}

function KPI({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="card-elevated">
      <div className="font-display text-display-md font-extrabold num text-ink-900 leading-none">
        {value}
      </div>
      <div className="text-[10px] uppercase tracking-[0.16em] font-bold text-ink-500 mt-2">
        {label}
      </div>
    </div>
  );
}
