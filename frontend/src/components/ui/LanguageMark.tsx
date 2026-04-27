import { clsx } from 'clsx';
import type { Language } from '@/types';

const LETTER: Record<Language, string> = {
  en: 'En',
  de: 'De',
  fr: 'Fr',
  it: 'It',
  es: 'Es',
  zh: '中',
  ja: '日',
  ko: '한',
};

// Each language gets a distinct, vibrant tone — feels multicultural without flags.
const TONE: Record<Language, string> = {
  en: 'bg-gradient-to-br from-forest-500 to-forest-700 text-white',
  de: 'bg-gradient-to-br from-ink-700 to-ink-900 text-white',
  fr: 'bg-gradient-to-br from-gold-500 to-gold-700 text-white',
  it: 'bg-gradient-to-br from-sage-500 to-sage-700 text-white',
  es: 'bg-gradient-to-br from-amber-400 to-orange-500 text-white',
  zh: 'bg-gradient-to-br from-rose-500 to-red-600 text-white',
  ja: 'bg-gradient-to-br from-paper-50 to-paper-200 text-ink-900 border border-paper-300',
  ko: 'bg-gradient-to-br from-violet-500 to-purple-600 text-white',
};

interface Props {
  language: Language;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function LanguageMark({ language, size = 'md', className }: Props) {
  const dim =
    size === 'lg'
      ? 'h-14 w-14 text-2xl rounded-2xl'
      : size === 'sm'
      ? 'h-8 w-8 text-xs rounded-lg'
      : 'h-11 w-11 text-base rounded-xl';
  return (
    <span
      className={clsx(
        'inline-flex items-center justify-center font-display font-bold tracking-tight shadow-soft',
        TONE[language],
        dim,
        className,
      )}
    >
      {LETTER[language]}
    </span>
  );
}
