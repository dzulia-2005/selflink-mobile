import { apiClient } from '@services/api/client';
import type { MessageUser } from '@services/api/messages';

export type ThreadMember = {
  id: number;
  user: MessageUser;
  role: string;
  created_at: string;
  updated_at: string;
};

export type ThreadLastMessage = {
  body: string;
  created_at: string;
};

export type Thread = {
  id: number;
  title?: string | null;
  is_group: boolean;
  participants: MessageUser[];
  members: ThreadMember[];
  last_message?: ThreadLastMessage | null;
  unread_count: number;
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
  return `${path}${qs ? `?${qs}` : ''}`;
}

export async function listThreads(params: ThreadQuery = {}): Promise<ThreadListResponse> {
  return apiClient.request<ThreadListResponse>(buildQuery('/threads/', params), {
    method: 'GET',
  });
}

export async function getThread(id: number | string): Promise<Thread> {
  return apiClient.request<Thread>(`/threads/${id}/`, { method: 'GET' });
}

export type CreateThreadPayload = {
  title?: string;
  participant_ids: number[];
  initial_message?: string;
};

export async function createThread(payload: CreateThreadPayload): Promise<Thread> {
  return apiClient.request<Thread>('/threads/', {
    method: 'POST',
    body: payload,
  });
}

export async function markThreadRead(id: number | string): Promise<void> {
  await apiClient.request(`/threads/${id}/read/`, { method: 'POST' });
}

export type TypingPayload = {
  is_typing?: boolean;
};

export async function sendTypingSignal(
  id: number | string,
  payload: TypingPayload = { is_typing: true },
): Promise<void> {
  await apiClient.request(`/threads/${id}/typing/`, {
    method: 'POST',
    body: payload,
  });
}

export type TypingStatus = {
  typing: boolean;
  userId?: number | string;
  userName?: string | null;
  userHandle?: string | null;
};

type TypingStatusResponse = {
  typing_user_ids: number[];
  users?: MessageUser[];
};

export async function getTypingStatus(id: number | string): Promise<TypingStatus> {
  const response = await apiClient.request<TypingStatusResponse>(
    `/threads/${id}/typing/`,
    {
      method: 'GET',
    },
  );
  const user = response.users?.[0];
  const userId = user?.id ?? response.typing_user_ids[0];
  return {
    typing: response.typing_user_ids.length > 0,
    userId: userId != null ? String(userId) : undefined,
    userName: user?.name ?? null,
    userHandle: user?.handle ?? null,
  };
}

export async function leaveThread(id: number | string): Promise<void> {
  await apiClient.request(`/threads/${id}/leave/`, {
    method: 'POST',
  });
}
