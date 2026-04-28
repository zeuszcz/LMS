import { api } from './client';

export interface TeacherLoad {
  id: string;
  full_name: string;
  email: string | null;
  active_groups: number;
  total_students: number;
  today_lessons: number;
}

export interface StudentRosterRow {
  id: string;
  full_name: string;
  email: string | null;
  group_id: string;
  group_course_id: string;
  course_title: string;
  course_level: string;
  enrolled_at: string;
  attendance_rate: number;
  homework_total: number;
  homework_submitted: number;
  homework_graded: number;
  avg_score: number | null;
}

export interface TeacherTodayLesson {
  id: string;
  title: string;
  scheduled_at: string;
  duration_min: number;
  group_id: string;
  course_title: string;
  enrolled_count: number;
}

export async function fetchTeachersLoad(): Promise<TeacherLoad[]> {
  const { data } = await api.get<TeacherLoad[]>('/api/teachers/load');
  return data;
}

export async function fetchMyStudents(): Promise<StudentRosterRow[]> {
  const { data } = await api.get<StudentRosterRow[]>('/api/teachers/me/students');
  return data;
}

export async function fetchMyToday(): Promise<TeacherTodayLesson[]> {
  const { data } = await api.get<TeacherTodayLesson[]>('/api/teachers/me/today');
  return data;
}
