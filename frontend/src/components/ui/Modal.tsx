import { ReactNode, useEffect } from 'react';
import { X } from 'lucide-react';
import { clsx } from 'clsx';

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  size?: 'md' | 'lg' | 'full';
  children: ReactNode;
  footer?: ReactNode;
}

export function Modal({ open, onClose, title, description, size = 'md', children, footer }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-ink-900/40 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className={clsx(
          'relative w-full bg-paper-50 rounded-3xl shadow-pop-lg border border-paper-300 animate-pop-in flex flex-col max-h-[90vh]',
          size === 'full' ? 'max-w-6xl' : size === 'lg' ? 'max-w-3xl' : 'max-w-xl',
        )}
      >
        <div className="flex items-start justify-between gap-4 p-6 border-b border-paper-300">
          <div className="min-w-0">
            <h2 id="modal-title" className="font-display text-display-md font-extrabold text-ink-900 leading-tight text-balance">
              {title}
            </h2>
            {description && <p className="text-sm text-ink-500 mt-1.5">{description}</p>}
          </div>
          <button
            onClick={onClose}
            className="flex-shrink-0 inline-flex h-9 w-9 items-center justify-center rounded-xl text-ink-500 hover:text-ink-900 hover:bg-paper-200 transition-colors"
            aria-label="Закрыть"
          >
            <X size={18} strokeWidth={2} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">{children}</div>
        {footer && <div className="border-t border-paper-300 p-4 flex items-center justify-end gap-2 flex-wrap">{footer}</div>}
      </div>
    </div>
  );
}

export function FormField({
  label,
  hint,
  error,
  required,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs font-bold uppercase tracking-[0.14em] text-ink-500 mb-1.5">
        {label}
        {required && <span className="text-terra-500 ml-0.5">*</span>}
      </label>
      {children}
      {error ? (
        <div className="text-xs text-terra-700 mt-1">{error}</div>
      ) : hint ? (
        <div className="text-xs text-ink-500 mt-1">{hint}</div>
      ) : null}
    </div>
  );
}
