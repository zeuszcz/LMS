import { FormEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Sparkles } from 'lucide-react';
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

const GREETINGS: Array<{ word: string; lang: string }> = [
  { word: 'Здравствуйте', lang: 'Russian' },
  { word: 'Hello', lang: 'English' },
  { word: 'Hallo', lang: 'German' },
  { word: 'Bonjour', lang: 'French' },
  { word: 'Ciao', lang: 'Italian' },
  { word: 'Hola', lang: 'Spanish' },
  { word: '你好', lang: 'Chinese' },
  { word: 'こんにちは', lang: 'Japanese' },
  { word: '안녕하세요', lang: 'Korean' },
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
    const id = window.setInterval(() => setG((x) => (x + 1) % GREETINGS.length), 2400);
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
    <div className="relative min-h-screen grid lg:grid-cols-[1.15fr_1fr] bg-paper-100 overflow-hidden">
      {/* HERO — left */}
      <aside className="relative hidden lg:flex flex-col justify-between p-12 xl:p-16 bg-paper-100">
        <div
          className="absolute inset-0 pointer-events-none opacity-60"
          style={{
            backgroundImage:
              'radial-gradient(800px 400px at 30% 20%, rgba(212, 160, 59, 0.18), transparent 60%), radial-gradient(700px 500px at 80% 90%, rgba(45, 74, 62, 0.12), transparent 60%)',
          }}
        />

        <header className="relative z-10 flex items-baseline gap-2">
          <span className="font-display text-3xl font-semibold tracking-tight text-ink-900">YES</span>
          <span className="font-display text-3xl text-gold-500 leading-none">·</span>
          <span className="font-display text-3xl font-light italic tracking-tight text-ink-700">LMS</span>
        </header>

        <div className="relative z-10 max-w-xl">
          <div className="eyebrow text-ink-500">Лингвистический центр</div>
          <h1 className="font-display text-display-2xl font-medium tracking-tight text-ink-900 leading-[0.95] text-balance">
            <span className="block">Учить язык —</span>
            <span className="block italic font-light text-forest-700">это становиться им.</span>
          </h1>

          <div className="mt-10 inline-flex items-baseline gap-3">
            <Sparkles size={14} strokeWidth={1.5} className="text-gold-500" />
            <span
              key={greeting.word}
              className="font-display italic font-light text-2xl text-ink-700 animate-fade-up"
            >
              {greeting.word}
            </span>
            <span className="text-[10px] uppercase tracking-[0.2em] text-ink-400 font-semibold">
              {greeting.lang}
            </span>
          </div>
        </div>

        <footer className="relative z-10 grid grid-cols-3 gap-6 max-w-md">
          <Fact n="8" label="Языков" />
          <Fact n="20+" label="Филиалов" />
          <Fact n="∞" label="Возможностей" />
        </footer>
      </aside>

      {/* FORM — right */}
      <section className="relative flex items-center justify-center p-6 sm:p-12 bg-paper-50 border-l border-ink-900/10">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-baseline justify-center gap-2 mb-10">
            <span className="font-display text-2xl font-semibold tracking-tight text-ink-900">YES</span>
            <span className="font-display text-2xl text-gold-500">·</span>
            <span className="font-display text-2xl font-light italic text-ink-700">LMS</span>
          </div>

          <div className="eyebrow">Вход в платформу</div>
          <h2 className="font-display text-display-md font-medium text-ink-900 mb-8 text-balance">
            Добро пожаловать
          </h2>

          <form onSubmit={onSubmit} className="space-y-4" noValidate>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-[0.18em] text-ink-500 mb-2" htmlFor="email">
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
              <label className="block text-xs font-semibold uppercase tracking-[0.18em] text-ink-500 mb-2" htmlFor="password">
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
              <div className="text-sm text-terra-700 bg-terra-50 border border-terra-50 rounded p-3">
                {error}
              </div>
            )}
            <button type="submit" disabled={loading} className="btn-primary w-full group">
              {loading ? (
                'Подождите…'
              ) : (
                <>
                  Войти
                  <ArrowRight size={14} strokeWidth={2} className="transition-transform group-hover:translate-x-0.5" />
                </>
              )}
            </button>
          </form>

          <div className="my-8 hairline-label">демо-аккаунты</div>

          <div className="grid gap-1.5 max-h-[280px] overflow-y-auto pr-1">
            {QUICK_LOGINS.map((q) => (
              <button
                key={q.email}
                type="button"
                onClick={() => void doLogin(q.email, q.password)}
                disabled={loading}
                className="group flex items-center justify-between gap-2 text-left px-3 py-2 rounded border border-paper-200 bg-paper-50 hover:border-forest-700 hover:bg-paper-100 transition-colors"
              >
                <div className="min-w-0">
                  <div className="text-sm font-medium text-ink-900 truncate">{q.label}</div>
                  <div className="text-[11px] text-ink-500 truncate">{q.sub}</div>
                </div>
                <ArrowRight
                  size={14}
                  strokeWidth={1.6}
                  className="text-ink-400 group-hover:text-forest-700 transition-all group-hover:translate-x-0.5"
                />
              </button>
            ))}
          </div>
          <div className="mt-3 text-[10px] uppercase tracking-[0.2em] text-ink-400 font-semibold text-center">
            Пароль для демо · password123
          </div>
        </div>
      </section>
    </div>
  );
}

function Fact({ n, label }: { n: string; label: string }) {
  return (
    <div>
      <div className="font-display text-display-md font-medium num text-ink-900">{n}</div>
      <div className="text-[10px] uppercase tracking-[0.2em] text-ink-500 font-semibold mt-1">{label}</div>
    </div>
  );
}
