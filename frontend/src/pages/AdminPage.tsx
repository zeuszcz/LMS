import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Check,
  ClipboardList,
  Filter,
  ShieldCheck,
  X,
} from 'lucide-react';
import {
  approveRequest,
  fetchRequests,
  rejectRequest,
} from '@/api/enrollment_requests';
import { fetchUsers } from '@/api/users';
import { fetchGroups } from '@/api/groups';
import { fetchCourses } from '@/api/courses';
import { fetchBranches } from '@/api/branches';
import { useAuthStore } from '@/stores/authStore';
import { PageHeader } from '@/components/ui/PageHeader';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { Stat } from '@/components/ui/Stat';
import { LanguageMark } from '@/components/ui/LanguageMark';
import { toast } from '@/components/ui/Toast';
import { formatDateTime } from '@/lib/format';
import type { EnrollmentRequest, EnrollmentRequestStatus } from '@/types';

const STATUS_TONE: Record<EnrollmentRequestStatus, string> = {
  pending: 'pill-gold',
  approved: 'pill-sage',
  rejected: 'pill-terra',
  cancelled: 'pill-ink',
};
const STATUS_LABEL: Record<EnrollmentRequestStatus, string> = {
  pending: 'Ожидает',
  approved: 'Одобрена',
  rejected: 'Отклонена',
  cancelled: 'Отменена',
};

export function AdminPage() {
  const user = useAuthStore((s) => s.user);
  const isStaff =
    !!user &&
    (user.is_superuser ||
      user.roles.includes('admin') ||
      user.roles.includes('methodist') ||
      user.roles.includes('branch_manager'));

  const [filter, setFilter] = useState<EnrollmentRequestStatus | 'all'>('all');

  const requests = useQuery({
    queryKey: ['admin-requests'],
    queryFn: () => fetchRequests(),
    enabled: isStaff,
  });
  const users = useQuery({
    queryKey: ['users-min'],
    queryFn: () => fetchUsers({ limit: 200 }),
    enabled: isStaff,
  });
  const groups = useQuery({
    queryKey: ['groups-all'],
    queryFn: () => fetchGroups(),
    enabled: isStaff,
  });
  const courses = useQuery({
    queryKey: ['courses-all'],
    queryFn: () => fetchCourses({ limit: 200, only_published: false }),
    enabled: isStaff,
  });
  const branches = useQuery({
    queryKey: ['branches-all'],
    queryFn: fetchBranches,
    enabled: isStaff,
  });

  const indices = useMemo(() => {
    return {
      userById: new Map((users.data ?? []).map((u) => [u.id, u])),
      groupById: new Map((groups.data ?? []).map((g) => [g.id, g])),
      courseById: new Map((courses.data?.items ?? []).map((c) => [c.id, c])),
      branchById: new Map((branches.data ?? []).map((b) => [b.id, b])),
    };
  }, [users.data, groups.data, courses.data, branches.data]);

  if (!isStaff) {
    return (
      <EmptyState
        icon={<ShieldCheck size={20} strokeWidth={1.6} />}
        title="Только для команды YES"
        description="Эта страница доступна администраторам, методистам и управляющим филиалов."
      />
    );
  }

  const items = (requests.data ?? []).filter(
    (r) => filter === 'all' || r.status === filter,
  );
  const counts = (requests.data ?? []).reduce<Record<string, number>>(
    (acc, r) => ({ ...acc, [r.status]: (acc[r.status] ?? 0) + 1 }),
    {},
  );

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Команда YES"
        title="Админка"
        description="Заявки на запись в группы. Одобрите — студент получит доступ к курсу."
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="Всего" value={requests.data?.length ?? '—'} accent="ink" />
        <Stat label="Ожидают" value={counts.pending ?? 0} accent="gold" />
        <Stat label="Одобрено" value={counts.approved ?? 0} accent="sage" />
        <Stat label="Отклонено" value={counts.rejected ?? 0} accent="terra" />
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <Filter size={14} strokeWidth={2} className="text-ink-400 mr-1" />
        <span className="text-[10px] uppercase tracking-[0.18em] font-bold text-ink-400 mr-1">
          Статус
        </span>
        {(['all', 'pending', 'approved', 'rejected', 'cancelled'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={
              filter === f
                ? 'px-3 py-1 rounded-full text-xs font-semibold bg-ink-900 text-white border border-ink-900'
                : 'px-3 py-1 rounded-full text-xs font-medium bg-paper-50 text-ink-700 border border-paper-300 hover:border-ink-700 transition-colors'
            }
          >
            {f === 'all' ? 'Все' : STATUS_LABEL[f]}
          </button>
        ))}
      </div>

      {requests.isLoading ? (
        <div className="card space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={<ClipboardList size={20} strokeWidth={1.6} />}
          title={filter === 'all' ? 'Заявок нет' : 'По фильтру ничего нет'}
          description="Когда студент нажмёт «Записаться в группу», заявка появится здесь."
        />
      ) : (
        <div className="space-y-3">
          {items.map((req) => (
            <RequestRow key={req.id} req={req} indices={indices} />
          ))}
        </div>
      )}
    </div>
  );
}

function RequestRow({
  req,
  indices,
}: {
  req: EnrollmentRequest;
  indices: {
    userById: Map<string, { full_name: string; email: string | null }>;
    groupById: Map<string, { course_id: string; branch_id: string | null; teacher_id: string | null }>;
    courseById: Map<string, { title: string; language: 'en' | 'de' | 'fr' | 'it' | 'es' | 'zh' | 'ja' | 'ko'; level: string }>;
    branchById: Map<string, { name: string }>;
  };
}) {
  const qc = useQueryClient();
  const student = indices.userById.get(req.student_id);
  const group = indices.groupById.get(req.group_id);
  const course = group ? indices.courseById.get(group.course_id) : undefined;
  const branch = group?.branch_id ? indices.branchById.get(group.branch_id) : undefined;

  const [reason, setReason] = useState('');

  const approve = useMutation({
    mutationFn: () => approveRequest(req.id, reason || undefined),
    onSuccess: () => {
      toast('success', 'Заявка одобрена', `${student?.full_name ?? 'Студент'} зачислен в группу`);
      qc.invalidateQueries({ queryKey: ['admin-requests'] });
    },
    onError: () => toast('error', 'Не удалось одобрить', 'Возможно, группа набрана'),
  });
  const reject = useMutation({
    mutationFn: () => rejectRequest(req.id, reason || undefined),
    onSuccess: () => {
      toast('info', 'Заявка отклонена', `${student?.full_name ?? 'Студент'} получит уведомление`);
      qc.invalidateQueries({ queryKey: ['admin-requests'] });
    },
    onError: () => toast('error', 'Ошибка', 'Не удалось отклонить'),
  });

  const initials = student?.full_name
    ?.split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase() ?? '??';

  return (
    <div className="card hover:shadow-card transition-shadow">
      <div className="flex items-start gap-4 flex-wrap">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-forest-500 to-forest-700 text-white text-sm font-extrabold flex-shrink-0">
          {initials}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h3 className="font-display text-base font-bold text-ink-900 truncate">
              {student?.full_name ?? 'Удалённый студент'}
            </h3>
            <span className={STATUS_TONE[req.status]}>{STATUS_LABEL[req.status]}</span>
          </div>
          {student?.email && (
            <div className="text-xs text-ink-500 font-mono">{student.email}</div>
          )}

          <div className="mt-3 flex items-center gap-3 flex-wrap">
            {course && <LanguageMark language={course.language} size="sm" />}
            <div>
              <div className="text-sm font-semibold text-ink-900">
                {course?.title ?? 'Удалённый курс'}{' '}
                {course && <span className="text-ink-500 font-mono text-xs">· {course.level}</span>}
              </div>
              <div className="text-xs text-ink-500">
                {branch?.name ?? 'Онлайн-формат'} · подана{' '}
                <span className="num">{formatDateTime(req.created_at)}</span>
              </div>
            </div>
          </div>

          {req.note && (
            <blockquote className="mt-3 text-sm text-ink-700 italic border-l-2 border-forest-300 pl-3">
              «{req.note}»
            </blockquote>
          )}
          {req.decision_reason && req.status !== 'pending' && (
            <div className="mt-3 text-xs text-ink-500">
              <span className="font-semibold">Решение:</span> {req.decision_reason}
            </div>
          )}
        </div>
      </div>

      {req.status === 'pending' && (
        <div className="mt-4 pt-4 border-t border-paper-300 space-y-3">
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Комментарий к решению (опционально)…"
            className="input text-sm"
          />
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => approve.mutate()}
              disabled={approve.isPending}
              className="btn-primary btn-sm"
            >
              <Check size={14} strokeWidth={2.5} />
              {approve.isPending ? 'Одобрение…' : 'Одобрить и зачислить'}
            </button>
            <button
              onClick={() => reject.mutate()}
              disabled={reject.isPending}
              className="btn-secondary btn-sm"
            >
              <X size={14} strokeWidth={2.5} />
              Отклонить
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
