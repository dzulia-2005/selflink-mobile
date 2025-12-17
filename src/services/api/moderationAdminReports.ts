import { apiClient } from '@services/api/client';

export type ModerationTargetType = 'user' | 'post' | 'comment' | string;

export type ModerationReportStatus = 'open' | 'resolved' | 'dismissed' | string;

export type ModerationAdminReport = {
  id: number;
  target_type: ModerationTargetType;
  target_id: number;
  reason: string;
  status: ModerationReportStatus;
  notes: string;
  created_at: string;
  reporter: number;
};

export type ModerationAdminReportListResponse = {
  next: string | null;
  previous: string | null;
  results: ModerationAdminReport[];
};

export type ModerationAdminReportQuery = {
  cursor?: string;
  ordering?: string;
  page_size?: number;
  search?: string;
};

export type ModerationAdminReportPayload = {
  status?: ModerationReportStatus;
  notes?: string;
};

export type ModerationAdminReportPartialPayload = Partial<ModerationAdminReportPayload>;

export async function listModerationAdminReports(
  params: ModerationAdminReportQuery = {},
): Promise<ModerationAdminReportListResponse> {
  const searchParams = new URLSearchParams();
  if (params.cursor) {
    searchParams.set('cursor', params.cursor);
  }
  if (params.ordering) {
    searchParams.set('ordering', params.ordering);
  }
  if (params.page_size) {
    searchParams.set('page_size', String(params.page_size));
  }
  if (params.search) {
    searchParams.set('search', params.search);
  }

  const qs = searchParams.toString();
  const path = `/moderation/admin/reports/${qs ? `?${qs}` : ''}`;
  return apiClient.request<ModerationAdminReportListResponse>(path, { method: 'GET' });
}

export async function createModerationAdminReport(
  payload: ModerationAdminReportPayload,
): Promise<ModerationAdminReport> {
  return apiClient.request<ModerationAdminReport>('/moderation/admin/reports/', {
    method: 'POST',
    body: payload,
  });
}

export async function getModerationAdminReport(
  id: number,
): Promise<ModerationAdminReport> {
  return apiClient.request<ModerationAdminReport>(`/moderation/admin/reports/${id}/`, {
    method: 'GET',
  });
}

export async function updateModerationAdminReport(
  id: number,
  payload: ModerationAdminReportPayload,
): Promise<ModerationAdminReport> {
  return apiClient.request<ModerationAdminReport>(`/moderation/admin/reports/${id}/`, {
    method: 'PUT',
    body: payload,
  });
}

export async function patchModerationAdminReport(
  id: number,
  payload: ModerationAdminReportPartialPayload,
): Promise<ModerationAdminReport> {
  return apiClient.request<ModerationAdminReport>(`/moderation/admin/reports/${id}/`, {
    method: 'PATCH',
    body: payload,
  });
}

export async function deleteModerationAdminReport(id: number): Promise<void> {
  await apiClient.request(`/moderation/admin/reports/${id}/`, {
    method: 'DELETE',
  });
}
