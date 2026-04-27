import { Link } from 'react-router-dom';
import { ArrowLeft, Compass } from 'lucide-react';

export function NotFoundPage() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center max-w-md">
        <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-forest-50 text-forest-600 mb-6">
          <Compass size={28} strokeWidth={1.8} />
        </div>
        <div className="font-display text-display-2xl font-extrabold text-ink-900 leading-none num">
          404
        </div>
        <h1 className="font-display text-display-md font-extrabold text-ink-900 mt-4 text-balance">
          Страница не найдена
        </h1>
        <p className="text-ink-500 mt-3 text-pretty">
          Возможно, ссылка устарела. Вернёмся в кабинет — там всё на своих местах.
        </p>
        <Link to="/" className="btn-primary mt-6 inline-flex">
          <ArrowLeft size={14} strokeWidth={2.5} /> На главную
        </Link>
      </div>
    </div>
  );
}
