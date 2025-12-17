import { env } from '@config/env';
import { apiClient } from '@services/api/client';
import { buildUrl } from '@utils/url';

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
  const path = `/mentor/profile/${qs ? `?${qs}` : ''}`;
  return apiClient.request<MentorProfileListResponse>(path, { method: 'GET' });
}

export async function createMentorProfile(
  payload: MentorProfile,
): Promise<MentorProfile> {
  return apiClient.request<MentorProfile>('/mentor/profile/', {
    method: 'POST',
    body: payload,
  });
}

export async function getMentorProfile(id: number): Promise<MentorProfile> {
  return apiClient.request<MentorProfile>(`/mentor/profile/${id}/`, {
    method: 'GET',
  });
}

export async function updateMentorProfile(
  id: number,
  payload: MentorProfile,
): Promise<MentorProfile> {
  return apiClient.request<MentorProfile>(`/mentor/profile/${id}/`, {
    method: 'PUT',
    body: payload,
  });
}

export async function patchMentorProfile(
  id: number,
  payload: Partial<MentorProfile>,
): Promise<MentorProfile> {
  return apiClient.request<MentorProfile>(`/mentor/profile/${id}/`, {
    method: 'PATCH',
    body: payload,
  });
}

export async function deleteMentorProfile(id: number): Promise<void> {
  await apiClient.request(`/mentor/profile/${id}/`, { method: 'DELETE' });
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
  return apiClient.request('/mentor/natal/', { method: 'POST' });
}

export async function fetchSoulmatchMentor(
  userId: number,
): Promise<SoulmatchMentorResponse> {
  return apiClient.request(`/mentor/soulmatch/${userId}/`, { method: 'GET' });
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
  return apiClient.request('/mentor/daily/entry/', {
    method: 'POST',
    body: payload,
  });
}

export async function fetchDailyMentorHistory(
  limit = 7,
): Promise<DailyMentorHistoryResponse> {
  const path = `/mentor/daily/history/?limit=${limit}`;
  return apiClient.request(path, {
    method: 'GET',
  });
}

export async function fetchDailyMentorSession(
  sessionId: number | string,
): Promise<DailyMentorSession> {
  return apiClient.request(`/mentor/daily/session/${sessionId}/`, {
    method: 'GET',
  });
}

export type MentorChatRequest = {
  mode: string;
  language?: string | null;
  message: string;
};

export type MentorChatResponse = {
  sessionId: number | null;
  mode: string;
  reply: string;
};

type MentorChatRawResponse = {
  session_id?: number | null;
  mode: string;
  reply: string;
};

export async function callMentorChat(
  payload: MentorChatRequest,
): Promise<MentorChatResponse> {
  const response = await apiClient.request<MentorChatRawResponse>('/mentor/chat/', {
    method: 'POST',
    body: payload,
  });

  return {
    sessionId: response.session_id ?? null,
    mode: response.mode,
    reply: response.reply,
  };
}

type MentorStreamUrlParams = {
  mode: string;
  language?: string | null;
  message: string;
};

export function buildMentorStreamUrl({
  mode,
  language,
  message,
}: MentorStreamUrlParams): string {
  const searchParams = new URLSearchParams();
  searchParams.set('mode', mode);
  if (language) {
    searchParams.set('language', language);
  }
  searchParams.set('message', message);

  const path = `/mentor/stream/?${searchParams.toString()}`;
  return buildUrl(env.apiHttpBaseUrl, path);
}
