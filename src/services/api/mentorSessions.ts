import { serviceApiClient as apiClient } from '@api/client';

export type MentorChatPayload = {
  message: string;
  mode?: string;
  language?: string | null;
};

export type MentorChatMeta = {
  user_flags?: Record<string, unknown>;
  mentor_flags?: Record<string, unknown>;
};

export type MentorChatResponse = {
  session_id: number;
  user_message_id: number;
  mentor_message_id: number;
  mentor_reply: string;
  mode?: string;
  language?: string | null;
  meta: MentorChatMeta;
};

export type MentorHistoryMessage = {
  id: number;
  session_id: number;
  role: 'user' | 'mentor';
  content: string;
  meta: Record<string, unknown> | null;
  created_at: string;
};

export type MentorHistoryResponse = {
  next: string | null;
  previous: string | null;
  results: MentorHistoryMessage[];
};

export async function sendMentorChat(
  payload: MentorChatPayload,
): Promise<MentorChatResponse> {
  return apiClient.request<MentorChatResponse>('/mentor/chat/', {
    method: 'POST',
    body: payload,
  });
}

export async function fetchMentorHistory(
  cursor?: string | null,
): Promise<MentorHistoryResponse> {
  const path = cursor ?? '/mentor/history/';
  return apiClient.request<MentorHistoryResponse>(path, { method: 'GET' });
}
