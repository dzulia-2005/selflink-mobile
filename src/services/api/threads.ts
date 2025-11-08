import { apiClient } from '@services/api/client';
import type { MessageUser } from '@services/api/messages';

export type Thread = {
  id: number;
  title?: string;
  participants: MessageUser[];
  last_message?: {
    body: string;
    created_at: string;
  };
  unread_count?: number;
  created_at: string;
  updated_at: string;
};

export type ThreadListResponse = {
  next: string | null;
  previous: string | null;
  results: Thread[];
};

export type ThreadQuery = {
  cursor?: string;
  ordering?: string;
  page_size?: number;
  search?: string;
};

function buildQuery(path: string, params: ThreadQuery = {}) {
  const searchParams = new URLSearchParams();
  if (params.cursor) searchParams.set('cursor', params.cursor);
  if (params.ordering) searchParams.set('ordering', params.ordering);
  if (params.page_size) searchParams.set('page_size', String(params.page_size));
  if (params.search) searchParams.set('search', params.search);
  const qs = searchParams.toString();
  return `${path}${qs ? `?${qs}` : ''}`;
}

export async function listThreads(params: ThreadQuery = {}): Promise<ThreadListResponse> {
  return apiClient.request<ThreadListResponse>(buildQuery('/api/v1/threads/', params), {
    method: 'GET',
  });
}

export async function getThread(id: number): Promise<Thread> {
  return apiClient.request<Thread>(`/api/v1/threads/${id}/`, { method: 'GET' });
}

export type CreateThreadPayload = {
  title?: string;
  participant_ids?: number[];
  participant_handles?: string[];
  initial_message?: string;
};

export async function createThread(payload: CreateThreadPayload): Promise<Thread> {
  return apiClient.request<Thread>('/api/v1/threads/', {
    method: 'POST',
    body: payload,
  });
}

export async function markThreadRead(id: number): Promise<void> {
  await apiClient.request(`/api/v1/threads/${id}/read/`, { method: 'POST' });
}

export type TypingPayload = {
  typing?: boolean;
};

export async function sendTypingSignal(
  id: number,
  payload: TypingPayload = { typing: true },
): Promise<void> {
  await apiClient.request(`/api/v1/threads/${id}/typing/`, {
    method: 'POST',
    body: payload,
  });
}
