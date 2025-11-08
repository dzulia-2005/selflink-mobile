import { apiClient } from '@services/api/client';

export type MentorSession = {
  id: number;
  question: string;
  answer: string;
  sentiment: string;
  created_at: string;
};

export type MentorSessionListResponse = {
  next: string | null;
  previous: string | null;
  results: MentorSession[];
};

export type MentorSessionQuery = {
  cursor?: string;
  ordering?: string;
  page_size?: number;
  search?: string;
};

export type MentorSessionAskPayload = {
  question: string;
  context?: Record<string, unknown>;
};

export type MentorSessionAskResponse = MentorSession;

export async function listMentorSessions(
  params: MentorSessionQuery = {},
): Promise<MentorSessionListResponse> {
  const searchParams = new URLSearchParams();
  if (params.cursor) searchParams.set('cursor', params.cursor);
  if (params.ordering) searchParams.set('ordering', params.ordering);
  if (params.page_size) searchParams.set('page_size', String(params.page_size));
  if (params.search) searchParams.set('search', params.search);

  const qs = searchParams.toString();
  const path = `/api/v1/mentor/sessions/${qs ? `?${qs}` : ''}`;
  return apiClient.request<MentorSessionListResponse>(path, { method: 'GET' });
}

export async function getMentorSession(id: number): Promise<MentorSession> {
  return apiClient.request<MentorSession>(`/api/v1/mentor/sessions/${id}/`, {
    method: 'GET',
  });
}

export async function askMentor(
  payload: MentorSessionAskPayload,
): Promise<MentorSessionAskResponse> {
  return apiClient.request<MentorSessionAskResponse>(
    '/api/v1/mentor/sessions/ask/',
    {
      method: 'POST',
      body: payload,
    },
  );
}
