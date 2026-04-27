import { api } from './client';
import type { UserOut } from '@/types';

export async function fetchUsers(params: { limit?: number; offset?: number } = {}): Promise<
  UserOut[]
> {
  const { data } = await api.get<UserOut[]>('/api/users/', { params });
  return data;
}
