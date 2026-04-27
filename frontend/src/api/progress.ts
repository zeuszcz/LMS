import { api } from './client';
import type { Progress } from '@/types';

export async function fetchProgress(studentId: string): Promise<Progress> {
  const { data } = await api.get<Progress>(`/api/progress/${studentId}`);
  return data;
}
