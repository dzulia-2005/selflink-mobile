import { apiClient } from '@services/api/client';

export type MessageUserSettings = {
  privacy: string;
  dm_policy: string;
  language: string;
  quiet_hours: Record<string, unknown> | string;
  push_enabled: boolean;
  email_enabled: boolean;
  digest_enabled: boolean;
};

export type MessageUser = {
  id: number;
  email: string;
  handle: string;
  name: string;
  bio: string;
  photo: string;
  birth_date: string | null;
  birth_time: string | null;
  birth_place: string;
  locale: string;
  flags: Record<string, unknown> | string;
  followers_count?: number;
  following_count?: number;
  posts_count?: number;
  is_following?: boolean;
  created_at: string;
  updated_at: string;
  settings: MessageUserSettings;
};

export type Message = {
  id: number;
  thread: number;
  sender: MessageUser;
  body: string;
  type: string;
  meta: Record<string, unknown> | string;
  attachments?: Array<{
    id?: number | string;
    url?: string;
    file?: string;
    type?: string;
    mimeType?: string;
    mime_type?: string;
  }> | null;
  created_at: string;
};

export type MessageListResponse = {
  next: string | null;
  previous: string | null;
  results: Message[];
};

export type MessageQuery = {
  cursor?: string;
  ordering?: string;
  page_size?: number;
  search?: string;
  thread?: number;
};

export type MessagePayload = {
  thread: number;
  body: string;
  type?: string;
  meta?: Record<string, unknown> | string;
};

export type MessagePartialPayload = Partial<MessagePayload>;

export async function listMessages(
  params: MessageQuery = {},
): Promise<MessageListResponse> {
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
  if (params.thread) {
    searchParams.set('thread', String(params.thread));
  }

  const qs = searchParams.toString();
  const path = `/api/v1/messages/${qs ? `?${qs}` : ''}`;
  return apiClient.request<MessageListResponse>(path, { method: 'GET' });
}

export async function createMessage(payload: MessagePayload): Promise<Message> {
  return apiClient.request<Message>('/api/v1/messages/', {
    method: 'POST',
    body: payload,
  });
}

export async function getMessage(id: number): Promise<Message> {
  return apiClient.request<Message>(`/api/v1/messages/${id}/`, { method: 'GET' });
}

export async function updateMessage(
  id: number,
  payload: MessagePayload,
): Promise<Message> {
  return apiClient.request<Message>(`/api/v1/messages/${id}/`, {
    method: 'PUT',
    body: payload,
  });
}

export async function patchMessage(
  id: number,
  payload: MessagePartialPayload,
): Promise<Message> {
  return apiClient.request<Message>(`/api/v1/messages/${id}/`, {
    method: 'PATCH',
    body: payload,
  });
}

export async function deleteMessage(id: number): Promise<void> {
  await apiClient.request(`/api/v1/messages/${id}/`, { method: 'DELETE' });
}
