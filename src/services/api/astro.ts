import { serviceApiClient as apiClient } from '@api/client';
import { BirthDataPayload, NatalChart } from '@schemas/astro';

export async function createOrUpdateNatalChart(
  payload: BirthDataPayload,
): Promise<NatalChart> {
  return apiClient.request<NatalChart>('/astro/natal/', {
    method: 'POST',
    body: payload,
  });
}

export async function getMyNatalChart(): Promise<NatalChart> {
  return apiClient.request<NatalChart>('/astro/natal/me/', {
    method: 'GET',
  });
}
