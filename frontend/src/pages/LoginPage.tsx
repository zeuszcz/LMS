import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '@/api/auth';
import { useAuthStore } from '@/stores/authStore';

const QUICK_LOGINS = [
  { label: 'Админ', email: 'admin@yescenter.ru', password: 'change_me_immediately' },
  { label: 'Преподаватель Мария', email: 'teacher_maria@demo.yescenter.ru', password: 'password123' },
  { label: 'Методист (Митино)', email: 'methodist1@demo.yescenter.ru', password: 'password123' },
  { label: 'Менеджер (Митино)', email: 'manager1@demo.yescenter.ru', password: 'password123' },
  { label: 'Родитель', email: 'parent1@demo.yescenter.ru', password: 'password123' },
  { label: 'Студент-взрослый', email: 'adult1@demo.yescenter.ru', password: 'password123' },
  { label: 'Студент-подросток', email: 'teen1@demo.yescenter.ru', password: 'password123' },
];

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const setTokens = useAuthStore((s) => s.setTokens);
  const navigate = useNavigate();

  const doLogin = async (em: string, pw: string) => {
    setError(null);
    setLoading(true);
    try {
      const tokens = await login(em, pw);
      setTokens(tokens.access_token, tokens.refresh_token);
      navigate('/', { replace: true });
    } catch {
      setError('Неверный email или пароль');
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    void doLogin(email, password);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4 py-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-3xl font-bold text-brand-700 tracking-tight">YES LMS</div>
          <div className="text-slate-500 text-sm mt-1">Лингвистический центр YES</div>
        </div>

        <form onSubmit={onSubmit} className="card space-y-4" noValidate>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="username"
              required
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1" htmlFor="password">
              Пароль
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2">
              {error}
            </div>
          )}
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? 'Вход…' : 'Войти'}
          </button>
        </form>

        <div className="mt-8 card">
          <div className="text-xs font-medium text-slate-500 mb-2 uppercase tracking-wide">
            Демо-аккаунты (один клик)
          </div>
          <div className="grid grid-cols-1 gap-1.5">
            {QUICK_LOGINS.map((q) => (
              <button
                key={q.email}
                type="button"
                onClick={() => void doLogin(q.email, q.password)}
                disabled={loading}
                className="text-left text-sm px-3 py-2 rounded border border-slate-200 hover:bg-slate-50 hover:border-brand-500 transition-colors"
              >
                <span className="font-medium text-slate-800">{q.label}</span>
                <span className="block text-xs text-slate-400 font-mono">{q.email}</span>
              </button>
            ))}
          </div>
          <div className="text-[10px] text-slate-400 mt-2">
            Пароль для демо-юзеров: <code>password123</code>
          </div>
        </div>
      </div>
    </div>
  );
}
