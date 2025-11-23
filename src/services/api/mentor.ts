import { apiClient } from '@services/api/client';

export type MentorProfile = {
  id?: number;
  tone?: string;
  level?: string;
  preferences?: Record<string, unknown> | string;
  created_at?: string;
  updated_at?: string;
  [key: string]: unknown;
};

export type MentorProfileListResponse = {
  next: string | null;
  previous: string | null;
  results: MentorProfile[];
};

export type MentorProfileQuery = {
  cursor?: string;
  ordering?: string;
  page_size?: number;
  search?: string;
};

export async function listMentorProfiles(
  params: MentorProfileQuery = {},
): Promise<MentorProfileListResponse> {
  const searchParams = new URLSearchParams();
  if (params.cursor) {
    searchParams.set('cursor', params.cursor);
  }
  if (params.ordering) {
    searchParams.set('ordering', params.ordering);
  }
  if (params.page_size) {
    searchParams.set('page_size', String(params.page_size));
  }
  if (params.search) {
    searchParams.set('search', params.search);
  }

  const qs = searchParams.toString();
  const path = `/api/v1/mentor/profile/${qs ? `?${qs}` : ''}`;
  return apiClient.request<MentorProfileListResponse>(path, { method: 'GET' });
}

export async function createMentorProfile(
  payload: MentorProfile,
): Promise<MentorProfile> {
  return apiClient.request<MentorProfile>('/api/v1/mentor/profile/', {
    method: 'POST',
    body: payload,
  });
}

export async function getMentorProfile(id: number): Promise<MentorProfile> {
  return apiClient.request<MentorProfile>(`/api/v1/mentor/profile/${id}/`, {
    method: 'GET',
  });
}

export async function updateMentorProfile(
  id: number,
  payload: MentorProfile,
): Promise<MentorProfile> {
  return apiClient.request<MentorProfile>(`/api/v1/mentor/profile/${id}/`, {
    method: 'PUT',
    body: payload,
  });
}

export async function patchMentorProfile(
  id: number,
  payload: Partial<MentorProfile>,
): Promise<MentorProfile> {
  return apiClient.request<MentorProfile>(`/api/v1/mentor/profile/${id}/`, {
    method: 'PATCH',
    body: payload,
  });
}

export async function deleteMentorProfile(id: number): Promise<void> {
  await apiClient.request(`/api/v1/mentor/profile/${id}/`, { method: 'DELETE' });
}

export type NatalMentorResponse = {
  mentor_text: string;
  generated_at?: string;
};

export type SoulmatchMentorResponse = {
  user_id: number;
  score: number;
  components: Record<string, number>;
  tags: string[];
  mentor_text: string;
};

export async function fetchNatalMentor(): Promise<NatalMentorResponse> {
  return apiClient.request('/api/v1/mentor/natal/', { method: 'POST' });
}

export async function fetchSoulmatchMentor(
  userId: number,
): Promise<SoulmatchMentorResponse> {
  return apiClient.request(`/api/v1/mentor/soulmatch/${userId}/`, { method: 'GET' });
}

export type DailyMentorEntryPayload = {
  text: string;
  date?: string;
  language?: string | null;
};

export type DailyMentorEntryResponse = {
  session_id: number;
  date: string;
  reply: string;
  entry?: string;
  language?: string | null;
};

export type DailyMentorHistoryItem = {
  session_id: number;
  date: string;
  entry_preview: string;
  reply_preview: string;
};

export type DailyMentorHistoryResponse = {
  results: DailyMentorHistoryItem[];
};

export type DailyMentorSession = {
  session_id: number;
  date: string;
  entry: string;
  reply: string;
  language?: string | null;
};

export async function createDailyMentorEntry(
  payload: DailyMentorEntryPayload,
): Promise<DailyMentorEntryResponse> {
  return apiClient.request('/api/v1/mentor/daily/entry/', { method: 'POST', body: payload });
}

export async function fetchDailyMentorHistory(
  limit = 7,
): Promise<DailyMentorHistoryResponse> {
  const path = `/api/v1/mentor/daily/history/?limit=${limit}`;
  return apiClient.request(path, { method: 'GET' });
}

export async function fetchDailyMentorSession(
  sessionId: number | string,
): Promise<DailyMentorSession> {
  return apiClient.request(`/api/v1/mentor/daily/session/${sessionId}/`, { method: 'GET' });
}
