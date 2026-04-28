import { api } from './client';
import type { Enrollment, Group, GroupDetail } from '@/types';

export async function fetchGroups(params: {
  branch_id?: string;
  teacher_id?: string;
  course_id?: string;
} = {}): Promise<Group[]> {
  const { data } = await api.get<Group[]>('/api/groups/', { params });
  return data;
}

export async function fetchGroup(id: string): Promise<GroupDetail> {
  const { data } = await api.get<GroupDetail>(`/api/groups/${id}`);
  return data;
}

export async function fetchEnrollments(groupId: string): Promise<Enrollment[]> {
  const { data } = await api.get<Enrollment[]>(`/api/groups/${groupId}/enrollments`);
  return data;
}

export interface ScheduleSlotIn {
  weekday: number;
  start_time: string;
  end_time: string;
  valid_from: string;
  valid_to?: string | null;
}

export interface CreateGroupBody {
  course_id: string;
  branch_id?: string | null;
  teacher_id?: string | null;
  mode: 'offline' | 'online' | 'hybrid';
  start_date: string;
  end_date?: string | null;
  max_students?: number;
  slots?: ScheduleSlotIn[];
}

export async function createGroup(body: CreateGroupBody): Promise<Group> {
  const { data } = await api.post<Group>('/api/groups/', body);
  return data;
}
