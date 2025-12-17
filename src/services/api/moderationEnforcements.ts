import { apiClient } from '@services/api/client';

export type ModerationEnforcementAction = 'warn' | 'mute' | 'ban' | string;

export type ModerationEnforcement = {
  id: number;
  target_type: string;
  target_id: number;
  action: ModerationEnforcementAction;
  reason: string;
  expires_at: string | null;
  created_at: string;
};

export type ModerationEnforcementListResponse = {
  next: string | null;
  previous: string | null;
  results: ModerationEnforcement[];
};

export type ModerationEnforcementQuery = {
  cursor?: string;
  ordering?: string;
  page_size?: number;
  search?: string;
};

export async function listModerationEnforcements(
  params: ModerationEnforcementQuery = {},
): Promise<ModerationEnforcementListResponse> {
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
  const path = `/moderation/enforcements/${qs ? `?${qs}` : ''}`;
  return apiClient.request<ModerationEnforcementListResponse>(path, { method: 'GET' });
}

export async function getModerationEnforcement(
  id: number,
): Promise<ModerationEnforcement> {
  return apiClient.request<ModerationEnforcement>(`/moderation/enforcements/${id}/`, {
    method: 'GET',
  });
}
