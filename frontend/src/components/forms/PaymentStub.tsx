import { useState } from 'react';
import { CreditCard, ShieldCheck } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { toast } from '@/components/ui/Toast';

interface Props {
  open: boolean;
  onClose: () => void;
  amountMinor: number;
  currency: string;
  description: string;
}

/** YooKassa stub — mimics the production checkout for demo purposes.
 *  When YooKassa keys are wired, replace handleSubmit with a real
 *  POST /api/payments/init call that returns the confirmation URL. */
export function PaymentStub({ open, onClose, amountMinor, currency, description }: Props) {
  const [card, setCard] = useState('4242 4242 4242 4242');
  const [exp, setExp] = useState('12/28');
  const [cvc, setCvc] = useState('123');
  const [busy, setBusy] = useState(false);

  const onPay = () => {
    setBusy(true);
    setTimeout(() => {
      setBusy(false);
      toast(
        'success',
        'Оплата прошла',
        'В продакшене вместо этой формы будет страница ЮKassa с 3DS / СБП.',
      );
      onClose();
    }, 1500);
  };

  const formatted = new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amountMinor / 100);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Оплата курса"
      description="Демо-режим. Реальная интеграция — Phase 2 (ЮKassa)."
      footer={
        <>
          <button onClick={onClose} className="btn-secondary">Отмена</button>
          <button onClick={onPay} disabled={busy} className="btn-primary">
            <CreditCard size={14} strokeWidth={2.5} />
            {busy ? 'Обработка…' : `Оплатить ${formatted}`}
          </button>
        </>
      }
    >
      <div className="space-y-5">
        <div className="rounded-2xl bg-gradient-to-br from-forest-600 to-forest-800 text-white p-5">
          <div className="text-[10px] uppercase tracking-[0.16em] font-bold text-white/70">
            К оплате
          </div>
          <div className="font-display text-display-md font-extrabold num leading-none mt-2">
            {formatted}
          </div>
          <div className="text-sm text-white/80 mt-2">{description}</div>
        </div>

        <div className="space-y-3">
          <label className="text-xs font-bold uppercase tracking-[0.14em] text-ink-500 block">
            Номер карты
          </label>
          <input className="input num font-mono" value={card} onChange={(e) => setCard(e.target.value)} />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold uppercase tracking-[0.14em] text-ink-500 block mb-1.5">
                Срок
              </label>
              <input className="input num font-mono" value={exp} onChange={(e) => setExp(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-[0.14em] text-ink-500 block mb-1.5">
                CVC
              </label>
              <input className="input num font-mono" value={cvc} onChange={(e) => setCvc(e.target.value)} />
            </div>
          </div>
        </div>

        <div className="flex items-start gap-2 text-xs text-ink-500 leading-relaxed">
          <ShieldCheck size={14} strokeWidth={2} className="text-sage-600 flex-shrink-0 mt-0.5" />
          В продакшене сайт перенаправит на платёжную страницу ЮKassa, поддерживающую СБП,
          Apple/Google Pay и карты. Никакие данные карты не приходят в наш бэкенд — только
          подписанный webhook с результатом.
        </div>
      </div>
    </Modal>
  );
}
