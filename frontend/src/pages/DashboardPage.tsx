import { useAuthStore } from '@/stores/authStore';

export function DashboardPage() {
  const user = useAuthStore((s) => s.user);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Здравствуйте, {user?.full_name}!</h1>
        <p className="text-slate-500 mt-1">
          Роли: {user?.roles.join(', ') || '—'}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="card">
          <div className="text-sm text-slate-500">Сегодня уроков</div>
          <div className="text-3xl font-bold text-slate-900 mt-1">0</div>
          <div className="text-xs text-slate-400 mt-1">Будет реализовано в Phase 1</div>
        </div>
        <div className="card">
          <div className="text-sm text-slate-500">Домашних заданий</div>
          <div className="text-3xl font-bold text-slate-900 mt-1">0</div>
          <div className="text-xs text-slate-400 mt-1">Будет реализовано в Phase 1</div>
        </div>
        <div className="card">
          <div className="text-sm text-slate-500">Кредитов уроков</div>
          <div className="text-3xl font-bold text-slate-900 mt-1">—</div>
          <div className="text-xs text-slate-400 mt-1">Биллинг — Phase 2</div>
        </div>
      </div>

      <div className="card">
        <h2 className="font-semibold text-slate-900 mb-2">Roadmap</h2>
        <ul className="text-sm text-slate-600 space-y-1 list-disc list-inside">
          <li>MVP (16 нед) — auth, курсы, группы, журнал, ДЗ, родители</li>
          <li>Phase 2 (12 нед) — оплаты, 1С, видеоуроки, PWA</li>
          <li>Phase 3 (10 нед) — экзамены, AI-фидбек</li>
          <li>Phase 4 (10 нед) — B2B-портал, маркетплейс</li>
        </ul>
        <p className="text-xs text-slate-400 mt-3">
          Полный план: <code>docs/roadmap.md</code> · SRS: <code>docs/srs.md</code>
        </p>
      </div>
    </div>
  );
}
