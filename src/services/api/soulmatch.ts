import { SoulmatchResult } from '@schemas/soulmatch';
import { apiClient } from '@services/api/client';

export type SoulmatchRecommendationsMeta = {
  missing_requirements?: string[];
  reason?: string;
};

export type SoulmatchRecommendationsResponse = {
  results: SoulmatchResult[];
  meta?: SoulmatchRecommendationsMeta;
};

export async function fetchRecommendations(
  options?: { includeMeta?: boolean },
): Promise<SoulmatchRecommendationsResponse> {
  const query = options?.includeMeta ? '?include_meta=1' : '';
  const response = await apiClient.request<
    SoulmatchResult[] | { results?: SoulmatchResult[]; meta?: SoulmatchRecommendationsMeta }
  >(`/soulmatch/recommendations/${query}`, {
    method: 'GET',
  });

  if (Array.isArray(response)) {
    return { results: response };
  }

  if (response && typeof response === 'object') {
    const record = response as { results?: SoulmatchResult[]; meta?: SoulmatchRecommendationsMeta };
    return {
      results: Array.isArray(record.results) ? record.results : [],
      meta: record.meta,
    };
  }

  return { results: [] };
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
