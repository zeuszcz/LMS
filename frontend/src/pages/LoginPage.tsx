import { FormEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Globe2, GraduationCap, Sparkles } from 'lucide-react';
import { login } from '@/api/auth';
import { useAuthStore } from '@/stores/authStore';

const QUICK_LOGINS = [
  { label: 'Администратор', sub: 'Все права', email: 'admin@yescenter.ru', password: 'change_me_immediately' },
  { label: 'Преподаватель', sub: 'Мария Иванова · Митино', email: 'teacher_maria@demo.yescenter.ru', password: 'password123' },
  { label: 'Методист', sub: 'Митино', email: 'methodist1@demo.yescenter.ru', password: 'password123' },
  { label: 'Управляющий филиалом', sub: 'Митино', email: 'manager1@demo.yescenter.ru', password: 'password123' },
  { label: 'Родитель', sub: 'Привязан к 1–2 детям', email: 'parent1@demo.yescenter.ru', password: 'password123' },
  { label: 'Студент-взрослый', sub: 'English B1', email: 'adult1@demo.yescenter.ru', password: 'password123' },
  { label: 'Студент-подросток', sub: 'English B1 teens', email: 'teen1@demo.yescenter.ru', password: 'password123' },
];

const GREETINGS: Array<{ word: string; lang: string; flag: string }> = [
  { word: 'Здравствуйте', lang: 'Russian', flag: 'РУС' },
  { word: 'Hello', lang: 'English', flag: 'ENG' },
  { word: 'Hallo', lang: 'German', flag: 'DEU' },
  { word: 'Bonjour', lang: 'French', flag: 'FRA' },
  { word: 'Ciao', lang: 'Italian', flag: 'ITA' },
  { word: 'Hola', lang: 'Spanish', flag: 'ESP' },
  { word: '你好', lang: 'Chinese', flag: 'CHN' },
  { word: 'こんにちは', lang: 'Japanese', flag: 'JPN' },
  { word: '안녕하세요', lang: 'Korean', flag: 'KOR' },
];

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [g, setG] = useState(0);
  const setTokens = useAuthStore((s) => s.setTokens);
  const navigate = useNavigate();

  useEffect(() => {
    const id = window.setInterval(() => setG((x) => (x + 1) % GREETINGS.length), 2200);
    return () => window.clearInterval(id);
  }, []);

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

  const greeting = GREETINGS[g];

  return (
    <div className="relative min-h-screen grid lg:grid-cols-[1.1fr_1fr] bg-paper-100 overflow-hidden">
      {/* HERO — left */}
      <aside className="relative hidden lg:flex flex-col justify-between p-10 xl:p-16 bg-paper-50 overflow-hidden">
        {/* Gradient blobs */}
        <div className="blob bg-forest-500 h-[500px] w-[500px] -top-32 -left-32" />
        <div className="blob bg-gold-500 h-[400px] w-[400px] -bottom-32 -right-32 opacity-40" />

        <header className="relative z-10 flex items-center gap-2.5">
          <span className="font-display text-2xl font-extrabold tracking-tight text-ink-900">YES</span>
          <span className="h-2 w-2 rounded-full bg-gold-500" aria-hidden />
          <span className="font-display text-2xl font-medium tracking-tight text-ink-500">LMS</span>
        </header>

        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full bg-paper-50 border border-paper-300 px-3 py-1 text-xs font-semibold text-ink-700 shadow-soft mb-6">
            <Globe2 size={12} strokeWidth={2} className="text-forest-600" />
            8 языков · 20+ филиалов · Cambridge English Centre
          </div>

          <h1 className="font-display text-display-2xl font-extrabold tracking-tight text-ink-900 leading-[1.0] text-balance">
            Откройте мир,{' '}
            <span className="text-gradient-brand">говоря на нём.</span>
          </h1>

          <p className="mt-6 text-lg text-ink-600 max-w-xl text-pretty leading-relaxed">
            Платформа лингвистического центра YES — расписание, журнал,
            домашки и общение в одном пространстве.
          </p>

          <div className="mt-10 inline-flex items-center gap-3 rounded-2xl bg-paper-50 border border-paper-300 shadow-card p-4 min-w-[280px]">
            <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-forest-50 text-forest-600">
              <Sparkles size={18} strokeWidth={2} />
            </div>
            <div className="min-w-0 flex-1">
              <div
                key={greeting.word}
                className="font-display text-2xl font-bold text-ink-900 animate-pop-in leading-tight truncate"
              >
                {greeting.word}
              </div>
              <div className="text-[10px] uppercase tracking-[0.18em] font-bold text-ink-400">
                {greeting.flag} · {greeting.lang}
              </div>
            </div>
          </div>
        </div>

        <footer className="relative z-10 grid grid-cols-3 gap-4 max-w-md">
          <Fact icon={<Globe2 size={16} strokeWidth={2} />} n="8" label="Языков" />
          <Fact icon={<GraduationCap size={16} strokeWidth={2} />} n="20+" label="Филиалов" />
          <Fact icon={<Sparkles size={16} strokeWidth={2} />} n="∞" label="Уроков" />
        </footer>
      </aside>

      {/* FORM — right */}
      <section className="relative flex items-center justify-center p-6 sm:p-12 bg-paper-100 overflow-y-auto">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center justify-center gap-2 mb-10">
            <span className="font-display text-xl font-extrabold text-ink-900">YES</span>
            <span className="h-1.5 w-1.5 rounded-full bg-gold-500" />
            <span className="font-display text-xl font-medium text-ink-500">LMS</span>
          </div>

          <div className="card-elevated">
            <div className="eyebrow">Вход в платформу</div>
            <h2 className="font-display text-display-md font-extrabold text-ink-900 mb-1 text-balance">
              С возвращением
            </h2>
            <p className="text-sm text-ink-500 mb-7">
              Войдите в свой кабинет — продолжим с того места, где остановились.
            </p>

            <form onSubmit={onSubmit} className="space-y-3" noValidate>
              <div>
                <label className="block text-xs font-bold uppercase tracking-[0.14em] text-ink-500 mb-2" htmlFor="email">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="username"
                  required
                  className="input"
                  placeholder="you@yescenter.ru"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-[0.14em] text-ink-500 mb-2" htmlFor="password">
                  Пароль
                </label>
                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  className="input"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              {error && (
                <div className="text-sm text-terra-700 bg-terra-50 border border-terra-300 rounded-xl px-4 py-3">
                  {error}
                </div>
              )}
              <button type="submit" disabled={loading} className="btn-primary w-full group mt-2">
                {loading ? (
                  'Подождите…'
                ) : (
                  <>
                    Войти
                    <ArrowRight size={16} strokeWidth={2.5} className="transition-transform group-hover:translate-x-0.5" />
                  </>
                )}
              </button>
            </form>
          </div>

          <div className="my-6 hairline-label">демо-аккаунты</div>

          <div className="grid gap-2 max-h-[300px] overflow-y-auto pr-1">
            {QUICK_LOGINS.map((q) => (
              <button
                key={q.email}
                type="button"
                onClick={() => void doLogin(q.email, q.password)}
                disabled={loading}
                className="group flex items-center justify-between gap-2 text-left px-4 py-3 rounded-xl border border-paper-300 bg-paper-50 hover:border-forest-500 hover:bg-forest-50 transition-all"
              >
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-ink-900 truncate">{q.label}</div>
                  <div className="text-xs text-ink-500 truncate">{q.sub}</div>
                </div>
                <ArrowRight
                  size={16}
                  strokeWidth={2}
                  className="text-ink-400 group-hover:text-forest-600 transition-all group-hover:translate-x-0.5 flex-shrink-0"
                />
              </button>
            ))}
          </div>
          <div className="mt-3 text-[10px] uppercase tracking-[0.18em] font-bold text-ink-400 text-center">
            Пароль для демо · password123
          </div>
        </div>
      </section>
    </div>
  );
}

function Fact({ icon, n, label }: { icon: React.ReactNode; n: string; label: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-forest-50 text-forest-600">
        {icon}
      </div>
      <div>
        <div className="font-display text-xl font-extrabold num text-ink-900 leading-none">{n}</div>
        <div className="text-[10px] uppercase tracking-[0.18em] font-bold text-ink-500 mt-0.5">{label}</div>
      </div>
    </div>
  );
}
