import { create } from 'zustand';
import { useEffect } from 'react';
import { CheckCircle2, Info, X, AlertTriangle } from 'lucide-react';
import { clsx } from 'clsx';

type ToastKind = 'success' | 'info' | 'error';
interface ToastItem {
  id: number;
  kind: ToastKind;
  title: string;
  description?: string;
}

interface ToastState {
  items: ToastItem[];
  push: (t: Omit<ToastItem, 'id'>) => void;
  dismiss: (id: number) => void;
}

let _id = 0;

export const useToast = create<ToastState>((set, get) => ({
  items: [],
  push: (t) => {
    const id = ++_id;
    set({ items: [...get().items, { ...t, id }] });
    window.setTimeout(() => get().dismiss(id), 4500);
  },
  dismiss: (id) => set({ items: get().items.filter((x) => x.id !== id) }),
}));

export function toast(kind: ToastKind, title: string, description?: string) {
  useToast.getState().push({ kind, title, description });
}

const ICON: Record<ToastKind, React.ReactNode> = {
  success: <CheckCircle2 size={18} strokeWidth={2} />,
  info: <Info size={18} strokeWidth={2} />,
  error: <AlertTriangle size={18} strokeWidth={2} />,
};

const CLS: Record<ToastKind, string> = {
  success: 'bg-sage-50 border-sage-300 text-sage-700',
  info: 'bg-forest-50 border-forest-100 text-forest-700',
  error: 'bg-terra-50 border-terra-300 text-terra-700',
};

export function ToastViewport() {
  const items = useToast((s) => s.items);
  const dismiss = useToast((s) => s.dismiss);

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm pointer-events-none">
      {items.map((t) => (
        <ToastCard key={t.id} item={t} onClose={() => dismiss(t.id)} />
      ))}
    </div>
  );
}

function ToastCard({ item, onClose }: { item: ToastItem; onClose: () => void }) {
  useEffect(() => {
    /* lifecycle handled in store */
  }, []);
  return (
    <div
      role="status"
      className={clsx(
        'pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-2xl border shadow-card backdrop-blur animate-pop-in',
        CLS[item.kind],
      )}
    >
      <span className="flex-shrink-0 mt-0.5">{ICON[item.kind]}</span>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold text-ink-900 leading-tight">{item.title}</div>
        {item.description && (
          <div className="text-xs text-ink-600 mt-0.5">{item.description}</div>
        )}
      </div>
      <button
        onClick={onClose}
        className="flex-shrink-0 -mr-1 -mt-1 inline-flex h-6 w-6 items-center justify-center rounded text-ink-400 hover:text-ink-900 hover:bg-paper-200 transition-colors"
        aria-label="Закрыть"
      >
        <X size={14} strokeWidth={2} />
      </button>
    </div>
  );
}
