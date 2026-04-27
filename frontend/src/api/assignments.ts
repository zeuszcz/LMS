import { api } from './client';
import type { Assignment, Submission } from '@/types';

export async function fetchAssignments(params: {
  lesson_instance_id?: string;
  group_id?: string;
  student_only?: boolean;
} = {}): Promise<Assignment[]> {
  const { data } = await api.get<Assignment[]>('/api/assignments/', { params });
  return data;
}

export async function fetchSubmissions(assignmentId: string): Promise<Submission[]> {
  const { data } = await api.get<Submission[]>(`/api/assignments/${assignmentId}/submissions`);
  return data;
}

export async function submitHomework(
  assignmentId: string,
  payload: Record<string, unknown> | null,
  submit: boolean,
): Promise<Submission> {
  const { data } = await api.post<Submission>(
    `/api/assignments/${assignmentId}/submissions`,
    { payload, submit },
  );
  return data;
}

export async function gradeSubmission(
  submissionId: string,
  score: number,
  feedback?: string,
): Promise<Submission> {
  const { data } = await api.post<Submission>(
    `/api/assignments/submissions/${submissionId}/grade`,
    { score, feedback },
  );
  return data;
}
