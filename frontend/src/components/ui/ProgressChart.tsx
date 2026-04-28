import { clsx } from 'clsx';
import { Headphones, Mic, BookOpen, PenLine } from 'lucide-react';

interface SkillDatum {
  key: 'listening' | 'reading' | 'writing' | 'speaking';
  label: string;
  value: number; // 0..1
}

const ICONS = {
  listening: Headphones,
  reading: BookOpen,
  writing: PenLine,
  speaking: Mic,
};

const TONE = {
  listening: 'bg-forest-500',
  reading: 'bg-sage-500',
  writing: 'bg-gold-500',
  speaking: 'bg-rose-500',
};

interface SkillBarsProps {
  skills: SkillDatum[];
  className?: string;
}

/** 4-skill bar chart with text labels + percent. WCAG AA: each bar has its
 *  own icon + label so meaning never relies on color alone. */
export function SkillBars({ skills, className }: SkillBarsProps) {
  return (
    <div className={clsx('space-y-3', className)}>
      {skills.map((s) => {
        const Icon = ICONS[s.key];
        const pct = Math.round(s.value * 100);
        return (
          <div key={s.key}>
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <Icon size={14} strokeWidth={2} className="text-ink-500" aria-hidden />
                <span className="text-sm font-medium text-ink-700">{s.label}</span>
              </div>
              <span className="font-display text-sm font-bold num text-ink-900" aria-label={`${pct} процентов`}>
                {pct}%
              </span>
            </div>
            <div
              className="h-2 rounded-full bg-paper-200 overflow-hidden"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={pct}
              aria-label={`${s.label}: ${pct}%`}
            >
              <div
                className={clsx('h-full rounded-full transition-all duration-500 ease-out', TONE[s.key])}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** Waffle 10x10 cells — visualises portion completed.
 *  Better than pie for accessibility (each cell labelled, exact count visible). */
interface WaffleProps {
  completed: number;
  total: number;
  label?: string;
  className?: string;
}

export function Waffle({ completed, total, label, className }: WaffleProps) {
  const pct = total > 0 ? completed / total : 0;
  // Map onto 100 cells preserving ratio
  const filled = Math.round(pct * 100);
  return (
    <div className={clsx('inline-flex flex-col gap-2', className)}>
      <div
        className="grid grid-cols-10 gap-0.5"
        role="img"
        aria-label={label ?? `${completed} из ${total} (${Math.round(pct * 100)}%)`}
      >
        {Array.from({ length: 100 }).map((_, i) => {
          const isFilled = i < filled;
          return (
            <span
              key={i}
              className={clsx(
                'h-2.5 w-2.5 rounded-[2px]',
                isFilled ? 'bg-forest-600' : 'bg-paper-200',
              )}
            />
          );
        })}
      </div>
      <div className="flex items-baseline justify-between">
        <span className="font-display text-2xl font-extrabold text-ink-900 num">
          {Math.round(pct * 100)}%
        </span>
        <span className="text-xs text-ink-500 num">
          {completed} / {total}
        </span>
      </div>
    </div>
  );
}

/** Donut-style ring for compact contexts (cards, list rows). */
interface RingProps {
  value: number; // 0..1
  size?: number;
  stroke?: number;
  className?: string;
  children?: React.ReactNode;
}

export function ProgressRing({
  value,
  size = 80,
  stroke = 8,
  className,
  children,
}: RingProps) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const dash = c * value;
  const pct = Math.round(value * 100);
  return (
    <div className={clsx('relative inline-flex items-center justify-center', className)}>
      <svg width={size} height={size} role="img" aria-label={`Прогресс ${pct}%`} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="#E2E8F0" strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="currentColor"
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${c}`}
          className="text-forest-600 transition-[stroke-dasharray] duration-500 ease-out"
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center">
        {children ?? (
          <span className="font-display text-base font-extrabold num text-ink-900">{pct}%</span>
        )}
      </span>
    </div>
  );
}
