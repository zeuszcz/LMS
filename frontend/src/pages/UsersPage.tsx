import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, ShieldCheck, UserCircle2 } from 'lucide-react';
import { fetchUsers } from '@/api/users';
import { PageHeader } from '@/components/ui/PageHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatDate } from '@/lib/format';

export function UsersPage() {
  const [filter, setFilter] = useState('');
  const users = useQuery({ queryKey: ['users-page'], queryFn: () => fetchUsers({ limit: 200 }) });

  const items = (users.data ?? []).filter((u) => {
    if (!filter) return true;
    const q = filter.toLowerCase();
    return (
      u.full_name.toLowerCase().includes(q) ||
      (u.email ?? '').toLowerCase().includes(q) ||
      (u.phone ?? '').includes(q)
    );
  });

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="База пользователей"
        title="Пользователи"
        description="Студенты, преподаватели, методисты, родители — все участники процесса."
        actions={
          <div className="relative">
            <Search
              size={14}
              strokeWidth={1.6}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400 pointer-events-none"
            />
            <input
              type="text"
              placeholder="Поиск по имени, email, телефону"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="input pl-9 text-sm w-72"
            />
          </div>
        }
      />

      {users.isLoading ? (
        <div className="card text-ink-500 text-sm">Загрузка…</div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={<UserCircle2 size={20} strokeWidth={1.6} />}
          title={filter ? 'Не нашлось никого' : 'Пользователей нет'}
          description={filter ? 'Попробуйте другой запрос.' : 'Список пуст.'}
        />
      ) : (
        <div className="card-bare overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-ink-900/10 bg-paper-100">
                <Th>Имя</Th>
                <Th>Email</Th>
                <Th>Телефон</Th>
                <Th>Тип</Th>
                <Th align="right">Создан</Th>
              </tr>
            </thead>
            <tbody>
              {items.map((u) => (
                <tr key={u.id} className="border-b border-ink-900/5 last:border-0 hover:bg-paper-100 transition-colors">
                  <Td>
                    <div className="font-medium text-ink-900">{u.full_name}</div>
                  </Td>
                  <Td>
                    <span className="font-mono text-xs text-ink-600">{u.email ?? '—'}</span>
                  </Td>
                  <Td>
                    <span className="font-mono text-xs text-ink-600">{u.phone ?? '—'}</span>
                  </Td>
                  <Td>
                    {u.is_superuser ? (
                      <span className="inline-flex items-center gap-1 pill bg-ink-900 text-paper-50 border-ink-900">
                        <ShieldCheck size={10} strokeWidth={2} />
                        superuser
                      </span>
                    ) : (
                      <span className="text-ink-400 text-xs">—</span>
                    )}
                  </Td>
                  <Td align="right">
                    <span className="text-xs text-ink-500 num">{formatDate(u.created_at)}</span>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-5 py-3 border-t border-ink-900/10 bg-paper-100 text-[10px] uppercase tracking-[0.2em] text-ink-500 font-semibold">
            {items.length} из {(users.data ?? []).length}
          </div>
        </div>
      )}
    </div>
  );
}

function Th({ children, align = 'left' }: { children: React.ReactNode; align?: 'left' | 'right' }) {
  return (
    <th
      className={
        align === 'right'
          ? 'text-right px-5 py-3 text-[10px] uppercase tracking-[0.2em] text-ink-500 font-semibold'
          : 'text-left px-5 py-3 text-[10px] uppercase tracking-[0.2em] text-ink-500 font-semibold'
      }
    >
      {children}
    </th>
  );
}

function Td({ children, align = 'left' }: { children: React.ReactNode; align?: 'left' | 'right' }) {
  return (
    <td className={align === 'right' ? 'text-right px-5 py-3 text-sm' : 'px-5 py-3 text-sm'}>
      {children}
    </td>
  );
}
