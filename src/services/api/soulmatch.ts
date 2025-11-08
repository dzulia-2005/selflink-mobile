import { apiClient } from '@services/api/client';

export type SoulMatchProfile = {
  id?: number;
  compatibility_score?: number;
  summary?: string;
  partner?: Record<string, unknown>;
  updated_at?: string;
  [key: string]: unknown;
};

export async function fetchSoulMatch(): Promise<SoulMatchProfile> {
  return apiClient.request<SoulMatchProfile>('/api/v1/soulmatch/', { method: 'GET' });
}

export async function refreshSoulMatch(): Promise<SoulMatchProfile> {
  return apiClient.request<SoulMatchProfile>('/api/v1/soulmatch/refresh/', {
    method: 'POST',
  });
}
