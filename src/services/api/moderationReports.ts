import { serviceApiClient as apiClient } from '@api/client';

export type ModerationReportStatus =
  | 'open'
  | 'reviewing'
  | 'resolved'
  | 'dismissed'
  | string;

export type ModerationReport = {
  id: number;
  target_type: string;
  target_id: number;
  reason: string;
  status: ModerationReportStatus;
  notes: string;
  created_at: string;
};

export type ModerationReportListResponse = {
  next: string | null;
  previous: string | null;
  results: ModerationReport[];
};

export type ModerationReportQuery = {
  cursor?: string;
  ordering?: string;
  page_size?: number;
  search?: string;
};

export type ModerationReportPayload = {
  target_type?: string;
  target_id?: number;
  reason?: string;
  status?: ModerationReportStatus;
  notes?: string;
};

export type ModerationReportPartialPayload = Partial<ModerationReportPayload>;

export async function listModerationReports(
  params: ModerationReportQuery = {},
): Promise<ModerationReportListResponse> {
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
  const path = `/moderation/reports/${qs ? `?${qs}` : ''}`;
  return apiClient.request<ModerationReportListResponse>(path, { method: 'GET' });
}

export async function createModerationReport(
  payload: ModerationReportPayload,
): Promise<ModerationReport> {
  return apiClient.request<ModerationReport>('/moderation/reports/', {
    method: 'POST',
    body: payload,
  });
}

export async function getModerationReport(id: number): Promise<ModerationReport> {
  return apiClient.request<ModerationReport>(`/moderation/reports/${id}/`, {
    method: 'GET',
  });
}

export async function updateModerationReport(
  id: number,
  payload: ModerationReportPayload,
): Promise<ModerationReport> {
  return apiClient.request<ModerationReport>(`/moderation/reports/${id}/`, {
    method: 'PUT',
    body: payload,
  });
}

export async function patchModerationReport(
  id: number,
  payload: ModerationReportPartialPayload,
): Promise<ModerationReport> {
  return apiClient.request<ModerationReport>(`/moderation/reports/${id}/`, {
    method: 'PATCH',
    body: payload,
  });
}

export async function deleteModerationReport(id: number): Promise<void> {
  await apiClient.request(`/moderation/reports/${id}/`, { method: 'DELETE' });
}
