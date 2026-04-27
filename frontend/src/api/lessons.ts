import { api } from './client';
import type {
  AttendanceRow,
  AttendanceStatus,
  Lesson,
} from '@/types';

export async function fetchLessons(params: {
  group_id?: string;
  upcoming_only?: boolean;
} = {}): Promise<Lesson[]> {
  const { data } = await api.get<Lesson[]>('/api/lessons/', { params });
  return data;
}

export async function fetchLesson(id: string): Promise<Lesson> {
  const { data } = await api.get<Lesson>(`/api/lessons/${id}`);
  return data;
}

export async function fetchAttendance(lessonId: string): Promise<AttendanceRow[]> {
  const { data } = await api.get<AttendanceRow[]>(`/api/lessons/${lessonId}/attendance`);
  return data;
}

export interface AttendanceInput {
  student_id: string;
  status: AttendanceStatus;
  participation_score?: number | null;
  comment?: string | null;
}

export async function recordAttendance(
  lessonId: string,
  entries: AttendanceInput[],
): Promise<AttendanceRow[]> {
  const { data } = await api.post<AttendanceRow[]>(
    `/api/lessons/${lessonId}/attendance`,
    { entries },
  );
  return data;
}

export async function startLesson(id: string): Promise<Lesson> {
  const { data } = await api.post<Lesson>(`/api/lessons/${id}/start`);
  return data;
}

export async function closeLesson(
  id: string,
  attendance: AttendanceInput[],
  notes_for_methodist?: string,
): Promise<Lesson> {
  const { data } = await api.post<Lesson>(`/api/lessons/${id}/close`, {
    attendance,
    notes_for_methodist,
  });
  return data;
}

export async function selfCompleteLesson(id: string): Promise<AttendanceRow> {
  const { data } = await api.post<AttendanceRow>(`/api/lessons/${id}/self-complete`);
  return data;
}
