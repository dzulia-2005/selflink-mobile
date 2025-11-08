import { apiClient } from '@services/api/client';

export type MatrixProfile = {
  id?: number;
  user?: number;
  archetype?: string;
  traits?: Record<string, unknown>;
  compatibility?: Record<string, unknown>;
  updated_at?: string;
  [key: string]: unknown;
};

export async function fetchMatrixProfile(): Promise<MatrixProfile> {
  return apiClient.request<MatrixProfile>('/api/v1/matrix/profile/', {
    method: 'GET',
  });
}

export type MatrixSyncPayload = {
  force?: boolean;
  [key: string]: unknown;
};

export type MatrixSyncResponse = {
  status?: string;
  profile?: MatrixProfile;
  [key: string]: unknown;
};

export async function syncMatrixProfile(
  payload: MatrixSyncPayload = {},
): Promise<MatrixSyncResponse> {
  return apiClient.request<MatrixSyncResponse>('/api/v1/matrix/sync/', {
    method: 'POST',
    body: payload,
  });
}
