import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchNotifications, markRead } from '@/api/notifications';
import { formatDateTime } from '@/lib/format';

export function NotificationsPage() {
  const qc = useQueryClient();
  const notif = useQuery({ queryKey: ['notifications'], queryFn: fetchNotifications });

  const read = useMutation({
    mutationFn: (id: string) => markRead(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  if (notif.isLoading) return <div className="text-slate-500">Загрузка…</div>;
  const items = notif.data?.items ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Уведомления</h1>
        <span className="text-sm text-slate-500">
          Непрочитанных: {notif.data?.unread ?? 0}
        </span>
      </div>

      {items.length === 0 ? (
        <div className="card text-center text-slate-500">Уведомлений нет</div>
      ) : (
        <ul className="space-y-2">
          {items.map((n) => (
            <li
              key={n.id}
              className={
                n.read_at
                  ? 'card opacity-70'
                  : 'card border-l-4 border-l-brand-500'
              }
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <div className="font-semibold text-slate-900">{n.subject ?? n.template_code}</div>
                  <div className="text-sm text-slate-600 mt-1 whitespace-pre-wrap">{n.body}</div>
                  <div className="text-xs text-slate-400 mt-2">
                    {formatDateTime(n.created_at)} · {n.channel}
                  </div>
                </div>
                {!n.read_at && (
                  <button
                    onClick={() => read.mutate(n.id)}
                    className="btn-secondary text-xs"
                  >
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
