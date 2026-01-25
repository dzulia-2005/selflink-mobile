import { SoulmatchExplainLevel, SoulmatchResult } from '@schemas/soulmatch';
import { apiClient } from '@services/api/client';

export type SoulmatchRecommendationsMeta = {
  missing_requirements?: string[];
  reason?: string;
  empty_reason?: string;
};

export type SoulmatchRecommendationsRaw =
  | SoulmatchResult[]
  | { results?: SoulmatchResult[]; meta?: SoulmatchRecommendationsMeta };

const buildQuery = (params: Record<string, string | undefined>) => {
  const entries = Object.entries(params).filter(([, value]) => value);
  if (!entries.length) {
    return '';
  }
  const search = new URLSearchParams(entries as Array<[string, string]>);
  const query = search.toString();
  return query ? `?${query}` : '';
};

export async function fetchRecommendations(options?: {
  includeMeta?: boolean;
  explainLevel?: SoulmatchExplainLevel;
}): Promise<SoulmatchRecommendationsRaw> {
  const query = buildQuery({
    include_meta: options?.includeMeta ? '1' : undefined,
    explain: options?.explainLevel,
  });
  return apiClient.request<SoulmatchRecommendationsRaw>(
    `/soulmatch/recommendations/${query}`,
    {
      method: 'GET',
    },
  );
}

export async function fetchSoulmatchWith(
  userId: number,
  options?: { explainLevel?: SoulmatchExplainLevel },
): Promise<SoulmatchResult> {
  const query = buildQuery({ explain: options?.explainLevel });
  return apiClient.request<SoulmatchResult>(`/soulmatch/with/${userId}/${query}`, {
    method: 'GET',
  });
}

export async function fetchSoulmatchMentor(userId: number): Promise<SoulmatchResult> {
  return apiClient.request<SoulmatchResult>(`/mentor/soulmatch/${userId}/`, {
    method: 'GET',
  });
}
