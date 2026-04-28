import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2 } from 'lucide-react';
import { api } from '@/api/client';
import { Modal } from '@/components/ui/Modal';
import { toast } from '@/components/ui/Toast';
import type { GroupDetail, ScheduleSlot } from '@/types';

const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

interface Props {
  open: boolean;
  onClose: () => void;
  group: GroupDetail;
}

interface SlotDraft {
  weekday: number;
  start_time: string;
  end_time: string;
  valid_from: string;
}

export function EditScheduleModal({ open, onClose, group }: Props) {
  const qc = useQueryClient();
  const [slots, setSlots] = useState<SlotDraft[]>(() =>
    group.slots.length > 0
      ? group.slots.map((s: ScheduleSlot) => ({
          weekday: s.weekday,
          start_time: s.start_time.slice(0, 5) + ':00',
          end_time: s.end_time.slice(0, 5) + ':00',
          valid_from: s.valid_from,
        }))
      : [
          {
            weekday: 1,
            start_time: '19:00:00',
            end_time: '20:30:00',
            valid_from: group.start_date,
          },
        ],
  );

  const save = useMutation({
    mutationFn: async () => {
      const { data } = await api.put<GroupDetail>(`/api/groups/${group.id}/slots`, { slots });
      return data;
    },
    onSuccess: () => {
      toast('success', 'Расписание сохранено');
      qc.invalidateQueries({ queryKey: ['group', group.id] });
      qc.invalidateQueries({ queryKey: ['groups'] });
      onClose();
    },
    onError: (err: { response?: { data?: { detail?: string } } }) => {
      toast('error', 'Не удалось сохранить', err?.response?.data?.detail ?? 'Ошибка');
    },
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Расписание группы"
      description="Эти слоты используются для авто-генерации новых уроков."
      size="lg"
      footer={
        <>
          <button onClick={onClose} className="btn-secondary">Отмена</button>
          <button onClick={() => save.mutate()} className="btn-primary" disabled={save.isPending}>
            {save.isPending ? 'Сохранение…' : 'Сохранить'}
          </button>
        </>
      }
    >
      <div className="space-y-3">
        {slots.map((s, i) => (
          <div
            key={i}
            className="grid grid-cols-12 gap-2 items-end p-3 rounded-xl bg-paper-100 border border-paper-300"
          >
            <div className="col-span-12 sm:col-span-4">
              <label className="text-[10px] uppercase tracking-[0.14em] font-bold text-ink-500 block mb-1">День</label>
              <select
                value={s.weekday}
                onChange={(e) => {
                  const next = [...slots];
                  next[i] = { ...s, weekday: Number(e.target.value) };
                  setSlots(next);
                }}
                className="input h-9 text-sm"
              >
                {WEEKDAYS.map((label, idx) => <option key={idx} value={idx}>{label}</option>)}
              </select>
            </div>
            <div className="col-span-6 sm:col-span-3">
              <label className="text-[10px] uppercase tracking-[0.14em] font-bold text-ink-500 block mb-1">С</label>
              <input
                type="time"
                value={s.start_time.slice(0, 5)}
                onChange={(e) => {
                  const next = [...slots];
                  next[i] = { ...s, start_time: e.target.value + ':00' };
                  setSlots(next);
                }}
                className="input h-9 text-sm num"
              />
            </div>
            <div className="col-span-6 sm:col-span-3">
              <label className="text-[10px] uppercase tracking-[0.14em] font-bold text-ink-500 block mb-1">По</label>
              <input
                type="time"
                value={s.end_time.slice(0, 5)}
                onChange={(e) => {
                  const next = [...slots];
                  next[i] = { ...s, end_time: e.target.value + ':00' };
                  setSlots(next);
                }}
                className="input h-9 text-sm num"
              />
            </div>
            <div className="col-span-12 sm:col-span-2 flex justify-end">
              {slots.length > 1 && (
                <button
                  type="button"
                  onClick={() => setSlots(slots.filter((_, j) => j !== i))}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-terra-500 hover:bg-terra-50 transition-colors"
                  aria-label="Удалить"
                >
                  <Trash2 size={14} strokeWidth={2} />
                </button>
              )}
            </div>
          </div>
        ))}
        <button
          type="button"
          onClick={() =>
            setSlots([
              ...slots,
              { weekday: 3, start_time: '19:00:00', end_time: '20:30:00', valid_from: group.start_date },
            ])
          }
          className="btn-secondary w-full"
        >
          <Plus size={14} strokeWidth={2.5} /> Добавить слот
        </button>
      </div>
    </Modal>
  );
}
