import { api } from './client';
import type { Notification, NotificationList } from '@/types';

export async function fetchNotifications(): Promise<NotificationList> {
  const { data } = await api.get<NotificationList>('/api/notifications/');
  return data;
}

export async function markRead(id: string): Promise<Notification> {
  const { data } = await api.post<Notification>(`/api/notifications/${id}/read`);
  return data;
}
