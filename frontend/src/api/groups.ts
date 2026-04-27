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
