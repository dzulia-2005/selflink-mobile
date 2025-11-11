import { apiClient } from './client';
import type { CreateThreadPayload, Message, Thread } from '@schemas/messaging';

type ListPayload<T> = T[] | { results?: T[] | null };

function extractResults<T>(payload: ListPayload<T>): T[] {
  if (Array.isArray(payload)) {
    return payload;
  }
  if (payload && Array.isArray(payload.results)) {
    return payload.results;
  }
  return [];
}

export async function getThreads(): Promise<Thread[]> {
  const { data } = await apiClient.get<ListPayload<Thread>>('/threads/');
  return extractResults(data);
}

export async function createThread(payload: CreateThreadPayload): Promise<Thread> {
  const { data } = await apiClient.post<Thread>('/threads/', payload);
  return data;
}

export async function getThreadMessages(
  threadId: string | number,
  cursor?: string,
): Promise<Message[]> {
  const params = new URLSearchParams({ thread: String(threadId) });
  if (cursor) {
    params.append('cursor', cursor);
  }
  const { data } = await apiClient.get<ListPayload<Message>>(
    `/messages/?${params.toString()}`,
  );
  return extractResults(data);
}

export async function sendMessage(threadId: string | number, text: string): Promise<Message> {
  const { data } = await apiClient.post<Message>('/messages/', {
    thread: threadId,
    body: text,
  });
  return data;
}

export async function getOrCreateDirectThread(
  userId: number | string,
  initialMessage?: string,
): Promise<Thread> {
  const payload: Record<string, unknown> = { user_id: userId };
  if (initialMessage?.trim()) {
    payload.initial_message = initialMessage.trim();
  }
  const { data } = await apiClient.post<Thread>('/threads/direct/', payload);
  return data;
}
export async function getThread(threadId: string | number): Promise<Thread> {
  const { data } = await apiClient.get<Thread>(`/threads/${threadId}/`);
  return data;
}
