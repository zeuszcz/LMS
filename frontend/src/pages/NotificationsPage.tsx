import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BellOff, Check } from 'lucide-react';
import { fetchNotifications, markRead } from '@/api/notifications';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatDateTime, relativeTime } from '@/lib/format';

export function NotificationsPage() {
  const qc = useQueryClient();
  const notif = useQuery({ queryKey: ['notifications'], queryFn: fetchNotifications });

  const read = useMutation({
    mutationFn: (id: string) => markRead(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const items = notif.data?.items ?? [];

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Входящие"
        title="Уведомления"
        description={
          notif.data
            ? `Непрочитанных: ${notif.data.unread} из ${items.length}.`
            : 'Загрузка…'
        }
      />

      {notif.isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="card space-y-2">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-3/4" />
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={<BellOff size={20} strokeWidth={1.6} />}
          title="Тишина"
          description="Уведомлений нет — но это ненадолго."
        />
      ) : (
        <ul className="space-y-3">
          {items.map((n) => (
            <li
              key={n.id}
              className={
                n.read_at
                  ? 'card opacity-70'
                  : 'card border-l-2 border-l-gold-500 relative overflow-hidden'
              }
            >
              {!n.read_at && (
                <div className="absolute top-0 right-0 -mt-12 -mr-12 h-32 w-32 rounded-full bg-gold-50 opacity-50 pointer-events-none" />
              )}
              <div className="relative flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="pill-ink font-mono text-[10px]">{n.channel}</span>
                    {!n.read_at && (
                      <span className="pill-gold uppercase tracking-[0.18em] text-[9px]">Новое</span>
                    )}
                  </div>
                  <h3 className="font-display text-base font-semibold text-ink-900 leading-tight text-balance">
                    {n.subject ?? n.template_code}
                  </h3>
                  <p className="text-sm text-ink-600 mt-2 leading-relaxed whitespace-pre-wrap">{n.body}</p>
                  <div className="text-[11px] text-ink-400 mt-3 num">
                    {formatDateTime(n.created_at)} · {relativeTime(n.created_at)}
                  </div>
                </div>
                {!n.read_at && (
                  <button
                    onClick={() => read.mutate(n.id)}
                    className="btn-ghost text-xs py-1 px-2 flex-shrink-0"
                    aria-label="Прочитано"
                  >
                    <Check size={14} strokeWidth={2} />
                    Прочитано
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
