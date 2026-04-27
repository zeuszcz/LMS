import { api } from './client';
import type { CourseList } from '@/types';

export async function fetchCourses(params: {
  language?: string;
  level?: string;
  age_group?: string;
  only_published?: boolean;
  limit?: number;
  offset?: number;
} = {}): Promise<CourseList> {
  const { data } = await api.get<CourseList>('/api/courses/', { params });
  return data;
}
