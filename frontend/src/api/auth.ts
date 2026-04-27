import { api } from './client';
import type { CurrentUser, TokenPair } from '@/types';

export async function login(email: string, password: string): Promise<TokenPair> {
  const { data } = await api.post<TokenPair>('/api/auth/login', { email, password });
  return data;
}

export async function fetchMe(): Promise<CurrentUser> {
  const { data } = await api.get<CurrentUser>('/api/auth/me');
  return data;
}
