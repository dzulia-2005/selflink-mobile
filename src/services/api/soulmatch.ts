import { serviceApiClient as apiClient } from '@api/client';
import {
  SoulmatchExplainLevel,
  SoulmatchMode,
  SoulmatchAsyncResult,
  SoulmatchResult,
  SoulmatchWithResponse,
  SoulmatchWithSuccess,
} from '@schemas/soulmatch';

export type SoulmatchRecommendationsMeta = {
  missing_requirements?: string[];
  reason?: string;
  empty_reason?: string;
  mode?: SoulmatchMode;
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

const isObject = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object';

export const isSoulmatchAsyncResult = (value: unknown): value is SoulmatchAsyncResult => {
  if (!isObject(value)) {
    return false;
  }
  return (
    typeof value.task_id === 'string' &&
    typeof value.pair_key === 'string' &&
    (typeof value.rules_version === 'string' || typeof value.rules_version === 'number')
  );
};

export const isSoulmatchWithSuccess = (
  value: unknown,
): value is SoulmatchWithSuccess => {
  if (!isObject(value)) {
    return false;
  }
  const user = (value as Record<string, unknown>).user;
  return (
    isObject(user) &&
    typeof (value as Record<string, unknown>).score === 'number' &&
    isObject((value as Record<string, unknown>).components) &&
    Array.isArray((value as Record<string, unknown>).tags)
  );
};

const validateSoulmatchWithResponse = (value: unknown): boolean => {
  return isSoulmatchAsyncResult(value) || isSoulmatchWithSuccess(value);
};

export async function fetchRecommendations(options?: {
  includeMeta?: boolean;
  explainLevel?: SoulmatchExplainLevel;
  mode?: SoulmatchMode;
}): Promise<SoulmatchRecommendationsRaw> {
  const query = buildQuery({
    include_meta: options?.includeMeta ? '1' : undefined,
    explain: options?.explainLevel,
    mode: options?.mode,
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
  options?: {
    explainLevel?: SoulmatchExplainLevel;
    mode?: SoulmatchMode;
    includeMeta?: boolean;
  },
): Promise<SoulmatchWithResponse> {
  const query = buildQuery({
    explain: options?.explainLevel,
    mode: options?.mode,
    include_meta: options?.includeMeta ? '1' : undefined,
  });
  const response = await apiClient.request<SoulmatchWithResponse>(
    `/soulmatch/with/${userId}/${query}`,
    {
      method: 'GET',
    },
  );
  if (typeof __DEV__ !== 'undefined' && __DEV__) {
    if (!validateSoulmatchWithResponse(response)) {
      console.warn('SoulMatch: unexpected /with response shape', response);
    }
  }
  return response;
}

export async function fetchSoulmatchMentor(userId: number): Promise<SoulmatchResult> {
  return apiClient.request<SoulmatchResult>(`/mentor/soulmatch/${userId}/`, {
    method: 'GET',
  });
}
