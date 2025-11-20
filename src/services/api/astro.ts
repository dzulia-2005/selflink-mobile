import { BirthDataPayload, NatalChart } from '@schemas/astro';
import { apiClient } from '@services/api/client';

export async function createOrUpdateNatalChart(
  payload: BirthDataPayload,
): Promise<NatalChart> {
  return apiClient.request<NatalChart>('/api/v1/astro/natal/', {
    method: 'POST',
    body: payload,
  });
}

export async function getMyNatalChart(): Promise<NatalChart> {
  return apiClient.request<NatalChart>('/api/v1/astro/natal/me/', {
    method: 'GET',
  });
}
