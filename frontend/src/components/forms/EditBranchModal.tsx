import { FormEvent, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';
import { Modal, FormField } from '@/components/ui/Modal';
import { toast } from '@/components/ui/Toast';
import type { Branch } from '@/types';

interface Props {
  open: boolean;
  onClose: () => void;
  branch: Branch | null;  // null → create mode
}

export function EditBranchModal({ open, onClose, branch }: Props) {
  const qc = useQueryClient();
  const isNew = !branch;
  const [name, setName] = useState(branch?.name ?? '');
  const [address, setAddress] = useState(branch?.address ?? '');
  const [city, setCity] = useState(branch?.city ?? 'Москва');
  const [phone, setPhone] = useState(branch?.phone ?? '');
  const [tz, setTz] = useState(branch?.timezone ?? 'Europe/Moscow');
  const [error, setError] = useState<string | null>(null);

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        name: name.trim(),
        address: address.trim(),
        city: city.trim(),
        phone: phone.trim() || null,
        timezone: tz,
      };
      if (isNew) {
        const { data } = await api.post<Branch>('/api/branches/', payload);
        return data;
      } else {
        const { data } = await api.patch<Branch>(`/api/branches/${branch!.id}`, payload);
        return data;
      }
    },
    onSuccess: () => {
      toast('success', isNew ? 'Филиал создан' : 'Филиал обновлён');
      qc.invalidateQueries({ queryKey: ['branches'] });
      qc.invalidateQueries({ queryKey: ['branches-all'] });
      qc.invalidateQueries({ queryKey: ['branches-page'] });
      onClose();
    },
    onError: (err: { response?: { data?: { detail?: string } } }) => {
      setError(err?.response?.data?.detail ?? 'Не удалось сохранить');
    },
  });

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!name.trim() || !address.trim() || !city.trim()) {
      setError('Заполните название, адрес и город');
      return;
    }
    save.mutate();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isNew ? 'Создать филиал' : 'Редактировать филиал'}
      description={isNew ? 'Новая школа сети YES Center.' : 'Адрес, телефон, часовой пояс.'}
      footer={
        <>
          <button onClick={onClose} className="btn-secondary">Отмена</button>
          <button form="edit-branch-form" type="submit" className="btn-primary" disabled={save.isPending}>
            {save.isPending ? 'Сохранение…' : isNew ? 'Создать' : 'Сохранить'}
          </button>
        </>
      }
    >
      <form id="edit-branch-form" onSubmit={onSubmit} className="space-y-4">
        <FormField label="Название" required>
          <input className="input" required value={name} onChange={(e) => setName(e.target.value)} placeholder="YES Митино" />
        </FormField>
        <FormField label="Адрес" required>
          <input className="input" required value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Москва, ул. Митинская, 35" />
        </FormField>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <FormField label="Город" required>
            <input className="input" required value={city} onChange={(e) => setCity(e.target.value)} />
          </FormField>
          <FormField label="Телефон">
            <input className="input num" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+7 495 …" />
          </FormField>
        </div>
        <FormField label="Часовой пояс">
          <select className="input" value={tz} onChange={(e) => setTz(e.target.value)}>
            <option value="Europe/Moscow">Europe/Moscow</option>
            <option value="Europe/Kaliningrad">Europe/Kaliningrad</option>
            <option value="Europe/Samara">Europe/Samara</option>
            <option value="Asia/Yekaterinburg">Asia/Yekaterinburg</option>
            <option value="Asia/Novosibirsk">Asia/Novosibirsk</option>
            <option value="Asia/Vladivostok">Asia/Vladivostok</option>
          </select>
        </FormField>
        {error && (
          <div className="text-sm text-terra-700 bg-terra-50 border border-terra-300 rounded-xl px-4 py-3">
            {error}
          </div>
        )}
      </form>
    </Modal>
  );
}
