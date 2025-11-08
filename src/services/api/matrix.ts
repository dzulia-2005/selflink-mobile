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
