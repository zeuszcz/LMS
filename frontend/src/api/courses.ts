import { api } from './client';
import type { CourseDetail, CourseList, ModuleProgress } from '@/types';

export async function fetchCourses(params: {
  language?: string;
  level?: string;
  age_group?: string;
  only_published?: boolean;
  search?: string;
  limit?: number;
  offset?: number;
} = {}): Promise<CourseList> {
  const { data } = await api.get<CourseList>('/api/courses/', { params });
  return data;
}

export async function fetchCourse(id: string): Promise<CourseDetail> {
  const { data } = await api.get<CourseDetail>(`/api/courses/${id}`);
  return data;
}

export async function fetchModuleLessons(
  courseId: string,
  moduleOrder: number,
): Promise<ModuleProgress> {
  const { data } = await api.get<ModuleProgress>(
    `/api/courses/${courseId}/modules/${moduleOrder}/lessons`,
  );
  return data;
}
