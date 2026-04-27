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

const TONE: Record<Language, string> = {
  en: 'bg-forest-50 text-forest-700 border-forest-100',
  de: 'bg-ink-800 text-paper-50 border-ink-900',
  fr: 'bg-terra-50 text-terra-700 border-terra-50',
  it: 'bg-gold-50 text-gold-700 border-gold-100',
  es: 'bg-paper-200 text-ink-800 border-paper-300',
  zh: 'bg-ink-900 text-gold-300 border-ink-800',
  ja: 'bg-paper-50 text-ink-900 border-ink-900',
  ko: 'bg-sage-50 text-sage-700 border-sage-50',
};

interface Props {
  language: Language;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function LanguageMark({ language, size = 'md', className }: Props) {
  const dim = size === 'lg' ? 'h-12 w-12 text-xl' : size === 'sm' ? 'h-7 w-7 text-[11px]' : 'h-9 w-9 text-sm';
  return (
    <span
      className={clsx(
        'inline-flex items-center justify-center rounded font-display font-semibold border tracking-tight',
        TONE[language],
        dim,
        className,
      )}
    >
      {LETTER[language]}
    </span>
  );
}
