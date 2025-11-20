import { SoulmatchResult } from '@schemas/soulmatch';
import { apiClient } from '@services/api/client';

export async function fetchRecommendations(): Promise<SoulmatchResult[]> {
  return apiClient.request<SoulmatchResult[]>('/api/v1/soulmatch/recommendations/', {
    method: 'GET',
  });
}

export async function fetchSoulmatchWith(userId: number): Promise<SoulmatchResult> {
  return apiClient.request<SoulmatchResult>(`/api/v1/soulmatch/with/${userId}/`, {
    method: 'GET',
  });
}

export async function fetchSoulmatchMentor(userId: number): Promise<SoulmatchResult> {
  return apiClient.request<SoulmatchResult>(`/api/v1/mentor/soulmatch/${userId}/`, {
    method: 'GET',
  });
}
