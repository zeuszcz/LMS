import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchUsers } from '@/api/users';
import { formatDate } from '@/lib/format';

export function UsersPage() {
  const [filter, setFilter] = useState('');
  const users = useQuery({ queryKey: ['users-page'], queryFn: () => fetchUsers({ limit: 200 }) });

  if (users.isLoading) return <div className="text-slate-500">Загрузка…</div>;

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
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold text-slate-900">Пользователи</h1>
        <input
          type="text"
          placeholder="Поиск по имени / email / телефону"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="input text-sm w-64"
        />
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left border-b border-slate-200">
              <th className="py-2">Имя</th>
              <th className="py-2">Email</th>
              <th className="py-2">Телефон</th>
              <th className="py-2">Тип</th>
              <th className="py-2">Создан</th>
            </tr>
          </thead>
          <tbody>
            {items.map((u) => (
              <tr key={u.id} className="border-b border-slate-100">
                <td className="py-2">{u.full_name}</td>
                <td className="py-2 font-mono text-xs">{u.email ?? '—'}</td>
                <td className="py-2 font-mono text-xs">{u.phone ?? '—'}</td>
                <td className="py-2">
                  {u.is_superuser && (
                    <span className="text-xs bg-red-50 text-red-700 px-2 py-0.5 rounded">superuser</span>
                  )}
                </td>
                <td className="py-2 text-slate-500 text-xs">{formatDate(u.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="text-xs text-slate-400 mt-2">{items.length} из {(users.data ?? []).length}</div>
      </div>
    </div>
  );
}
