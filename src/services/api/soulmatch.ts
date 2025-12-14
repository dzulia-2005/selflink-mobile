import { SoulmatchResult } from '@schemas/soulmatch';
import { apiClient } from '@services/api/client';

export async function fetchRecommendations(): Promise<SoulmatchResult[]> {
  return apiClient.request<SoulmatchResult[]>('/soulmatch/recommendations/', {
    method: 'GET',
  });
}

export async function fetchSoulmatchWith(userId: number): Promise<SoulmatchResult> {
  return apiClient.request<SoulmatchResult>(`/soulmatch/with/${userId}/`, {
    method: 'GET',
  });
}

export async function fetchSoulmatchMentor(userId: number): Promise<SoulmatchResult> {
  return apiClient.request<SoulmatchResult>(`/mentor/soulmatch/${userId}/`, {
    method: 'GET',
  });
}
