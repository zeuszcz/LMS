import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Activity,
  Award,
  Building2,
  GraduationCap,
  Layers,
  PenLine,
  ShieldCheck,
  Users,
  Wallet,
} from 'lucide-react';
import { api } from '@/api/client';
import { PageHeader } from '@/components/ui/PageHeader';
import { Skeleton } from '@/components/ui/Skeleton';
import { ProgressRing } from '@/components/ui/ProgressChart';
import { useAuthStore } from '@/stores/authStore';

interface Overview {
  total_branches: number;
  total_courses: number;
  total_active_groups: number;
  total_students: number;
  total_teachers: number;
  total_lessons: number;
  lessons_finished: number;
  submissions_total: number;
  submissions_graded: number;
  pending_requests: number;
  avg_attendance: number;
  avg_score: number | null;
  revenue_minor: number;
  revenue_currency: string;
}

interface TimelinePoint {
  date: string;
  lessons: number;
  submissions: number;
  payments: number;
  revenue_minor: number;
}

interface CourseStat {
  course_id: string;
  title: string;
  level: string;
  language: string;
  active_groups: number;
  students: number;
}

interface BranchStat {
  branch_id: string;
  name: string;
  city: string;
  active_groups: number;
  students: number;
}

export function AnalyticsPage() {
  const user = useAuthStore((s) => s.user);
  const isStaff =
    !!user && (user.is_superuser || user.roles.includes('admin') || user.roles.includes('methodist'));

  const ov = useQuery({
    queryKey: ['analytics-overview'],
    queryFn: async () => (await api.get<Overview>('/api/analytics/overview')).data,
    enabled: isStaff,
  });
  const tl = useQuery({
    queryKey: ['analytics-timeline'],
    queryFn: async () => (await api.get<TimelinePoint[]>('/api/analytics/timeline?days=30')).data,
    enabled: isStaff,
  });
  const byCourse = useQuery({
    queryKey: ['analytics-by-course'],
    queryFn: async () => (await api.get<CourseStat[]>('/api/analytics/by-course')).data,
    enabled: isStaff,
  });
  const byBranch = useQuery({
    queryKey: ['analytics-by-branch'],
    queryFn: async () => (await api.get<BranchStat[]>('/api/analytics/by-branch')).data,
    enabled: isStaff,
  });

  if (!isStaff) {
    return <div className="text-ink-500">Доступно админам и методистам.</div>;
  }

  const o = ov.data;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Аналитика"
        title="Платформа в цифрах"
        description="Активность учеников, преподавателей, выручка — за последние 30 дней."
      />

      {/* Top KPI grid */}
      <div className="grid grid-cols-12 gap-4">
        <BigStat
          className="col-span-12 sm:col-span-6 lg:col-span-3"
          label="Студентов"
          value={o?.total_students ?? '—'}
          tone="forest"
          icon={<Users size={18} strokeWidth={2} />}
        />
        <BigStat
          className="col-span-12 sm:col-span-6 lg:col-span-3"
          label="Преподавателей"
          value={o?.total_teachers ?? '—'}
          tone="ink"
          icon={<GraduationCap size={18} strokeWidth={2} />}
        />
        <BigStat
          className="col-span-12 sm:col-span-6 lg:col-span-3"
          label="Активных групп"
          value={o?.total_active_groups ?? '—'}
          tone="gold"
          icon={<Layers size={18} strokeWidth={2} />}
        />
        <BigStat
          className="col-span-12 sm:col-span-6 lg:col-span-3"
          label="Выручка / 30 дн"
          value={
            o
              ? new Intl.NumberFormat('ru-RU', {
                  style: 'currency',
                  currency: o.revenue_currency,
                  maximumFractionDigits: 0,
                }).format(o.revenue_minor / 100)
              : '—'
          }
          tone="sage"
          icon={<Wallet size={18} strokeWidth={2} />}
        />
      </div>

      {/* Two-row metrics */}
      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12 lg:col-span-5 card-elevated flex items-center gap-6 flex-wrap">
          <ProgressRing
            value={o?.avg_attendance ?? 0}
            size={140}
            stroke={12}
            className="text-sage-600"
          />
          <div className="flex-1 min-w-0">
            <div className="text-[10px] uppercase tracking-[0.16em] font-bold text-sage-700 mb-1">
              Средняя посещаемость
            </div>
            <div className="font-display text-display-md font-extrabold text-ink-900 num">
              {o ? `${Math.round(o.avg_attendance * 100)}%` : '—'}
            </div>
            <div className="text-xs text-ink-500 mt-2">
              Уроков завершено:{' '}
              <span className="text-ink-900 font-bold num">{o?.lessons_finished ?? 0}</span>
              {' / '}
              <span className="text-ink-900 num">{o?.total_lessons ?? 0}</span>
            </div>
          </div>
        </div>

        <div className="col-span-12 lg:col-span-7 card-elevated">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-forest-50 text-forest-600">
                <Activity size={14} strokeWidth={2.5} />
              </span>
              <h3 className="font-display text-base font-extrabold text-ink-900">
                Активность · 30 дней
              </h3>
            </div>
            {tl.data && (
              <div className="text-xs text-ink-500">
                <span className="text-ink-900 font-bold num">
                  {tl.data.reduce((s, x) => s + x.lessons, 0)}
                </span>{' '}
                уроков ·{' '}
                <span className="text-ink-900 font-bold num">
                  {tl.data.reduce((s, x) => s + x.submissions, 0)}
                </span>{' '}
                сдач
              </div>
            )}
          </div>
          {tl.isLoading ? (
            <Skeleton className="h-40" />
          ) : (
            <Sparkline data={tl.data ?? []} />
          )}
        </div>
      </div>

      {/* Quick stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard
          icon={<Building2 size={14} strokeWidth={2} />}
          label="Филиалов"
          value={o?.total_branches ?? '—'}
        />
        <MetricCard
          icon={<GraduationCap size={14} strokeWidth={2} />}
          label="Курсов"
          value={o?.total_courses ?? '—'}
        />
        <MetricCard
          icon={<PenLine size={14} strokeWidth={2} />}
          label="Домашек оценено"
          value={o ? `${o.submissions_graded} / ${o.submissions_total}` : '—'}
        />
        <Link to="/admin" className="block">
          <MetricCard
            icon={<ShieldCheck size={14} strokeWidth={2} />}
            label="Заявки в работе"
            value={o?.pending_requests ?? '—'}
            highlight
          />
        </Link>
      </div>

      {/* Splits */}
      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12 lg:col-span-6 card-elevated">
          <div className="flex items-center gap-2 mb-4">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-gold-50 text-gold-700">
              <Award size={14} strokeWidth={2.5} />
            </span>
            <h3 className="font-display text-base font-extrabold text-ink-900">
              Топ курсов по студентам
            </h3>
          </div>
          {byCourse.isLoading ? (
            <Skeleton className="h-40" />
          ) : (
            <ul className="space-y-2">
              {(byCourse.data ?? []).slice(0, 8).map((c) => {
                const max = Math.max(1, ...(byCourse.data ?? []).map((x) => x.students));
                const pct = (c.students / max) * 100;
                return (
                  <li key={c.course_id}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-medium text-ink-800 truncate">
                        {c.title} <span className="text-ink-500 font-normal">· {c.level}</span>
                      </span>
                      <span className="num font-bold text-ink-900">
                        {c.students} студ. · {c.active_groups} гр.
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-paper-200 overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-forest-500 to-forest-700 rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="col-span-12 lg:col-span-6 card-elevated">
          <div className="flex items-center gap-2 mb-4">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-forest-50 text-forest-600">
              <Building2 size={14} strokeWidth={2.5} />
            </span>
            <h3 className="font-display text-base font-extrabold text-ink-900">По филиалам</h3>
          </div>
          {byBranch.isLoading ? (
            <Skeleton className="h-40" />
          ) : (
            <ul className="space-y-2">
              {(byBranch.data ?? []).map((b) => {
                const max = Math.max(1, ...(byBranch.data ?? []).map((x) => x.students));
                const pct = (b.students / max) * 100;
                return (
                  <li key={b.branch_id}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-medium text-ink-800">
                        {b.name} <span className="text-ink-500 font-normal">· {b.city}</span>
                      </span>
                      <span className="num font-bold text-ink-900">
                        {b.students} студ. · {b.active_groups} гр.
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-paper-200 overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-gold-300 to-gold-600 rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function Sparkline({ data }: { data: TimelinePoint[] }) {
  if (data.length === 0) return <div className="text-sm text-ink-500">Нет данных</div>;
  const w = 700;
  const h = 160;
  const padding = 24;
  const maxL = Math.max(1, ...data.map((d) => d.lessons));
  const maxS = Math.max(1, ...data.map((d) => d.submissions));
  const stepX = (w - padding * 2) / Math.max(1, data.length - 1);
  const ptsLessons = data
    .map((d, i) => {
      const x = padding + i * stepX;
      const y = h - padding - (d.lessons / maxL) * (h - padding * 2);
      return `${x},${y}`;
    })
    .join(' ');
  const ptsSubs = data
    .map((d, i) => {
      const x = padding + i * stepX;
      const y = h - padding - (d.submissions / maxS) * (h - padding * 2);
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-40">
        {/* baseline */}
        <line x1={padding} x2={w - padding} y1={h - padding} y2={h - padding} stroke="#E2E8F0" strokeWidth={1} />
        {/* lessons line */}
        <polyline points={ptsLessons} fill="none" stroke="#2563EB" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
        {/* submissions line */}
        <polyline points={ptsSubs} fill="none" stroke="#FB7185" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" strokeDasharray="4 3" />
        {/* x labels */}
        {data
          .filter((_, i) => i === 0 || i === data.length - 1 || i === Math.floor(data.length / 2))
          .map((d) => {
            const idx = data.indexOf(d);
            const x = padding + idx * stepX;
            return (
              <text key={d.date} x={x} y={h - 6} textAnchor="middle" fontSize="9" fill="#64748B" fontWeight="700">
                {new Date(d.date).toLocaleDateString('ru-RU', { day: '2-digit', month: 'short' })}
              </text>
            );
          })}
      </svg>
      <div className="flex items-center gap-4 text-xs mt-1">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-0.5 w-4 bg-forest-600 rounded-full" />
          Уроков
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-0.5 w-4 bg-gold-500 rounded-full" style={{ borderTop: '2px dashed #FB7185' }} />
          Сдач домашек
        </span>
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

function MetricCard({
  icon,
  label,
  value,
  highlight,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  highlight?: boolean;
}) {
  return (
    <div
      className={
        highlight
          ? 'card-elevated bg-gold-50 border-gold-300 hover:shadow-pop transition-all'
          : 'card-elevated'
      }
    >
      <div className="flex items-center gap-2 mb-2">
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-paper-200 text-ink-700">
          {icon}
        </span>
        <span className="text-[10px] uppercase tracking-[0.16em] font-bold text-ink-500">{label}</span>
      </div>
      <div className="font-display text-xl font-extrabold num text-ink-900">{value}</div>
    </div>
  );
}
