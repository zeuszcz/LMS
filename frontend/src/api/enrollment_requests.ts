import { api } from './client';
import type { EnrollmentRequest, EnrollmentRequestStatus, ActiveEnrollment } from '@/types';

export async function fetchRequests(params: {
  status_filter?: EnrollmentRequestStatus;
  student_id?: string;
} = {}): Promise<EnrollmentRequest[]> {
  const { data } = await api.get<EnrollmentRequest[]>('/api/enrollment-requests/', { params });
  return data;
}

export async function createRequest(group_id: string, note?: string): Promise<EnrollmentRequest> {
  const { data } = await api.post<EnrollmentRequest>('/api/enrollment-requests/', {
    group_id,
    note: note ?? null,
  });
  return data;
}

export async function approveRequest(id: string, reason?: string): Promise<EnrollmentRequest> {
  const { data } = await api.post<EnrollmentRequest>(
    `/api/enrollment-requests/${id}/approve`,
    { reason: reason ?? null },
  );
  return data;
}

export async function rejectRequest(id: string, reason?: string): Promise<EnrollmentRequest> {
  const { data } = await api.post<EnrollmentRequest>(
    `/api/enrollment-requests/${id}/reject`,
    { reason: reason ?? null },
  );
  return data;
}

export async function cancelRequest(id: string): Promise<EnrollmentRequest> {
  const { data } = await api.post<EnrollmentRequest>(
    `/api/enrollment-requests/${id}/cancel`,
  );
  return data;
}

export async function fetchMyActiveEnrollments(): Promise<ActiveEnrollment[]> {
  const { data } = await api.get<ActiveEnrollment[]>('/api/enrollment-requests/me/active-enrollments');
  return data;
}
