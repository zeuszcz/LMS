import { api } from './client';
import type { Branch } from '@/types';

export async function fetchBranches(): Promise<Branch[]> {
  const { data } = await api.get<Branch[]>('/api/branches/');
  return data;
}
