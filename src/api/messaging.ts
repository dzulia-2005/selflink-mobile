import type { AxiosRequestConfig } from 'axios';

import type { CreateThreadPayload, Message, Thread } from '@schemas/messaging';
import { parseJsonPreservingLargeInts } from '@utils/json';

import { apiClient } from './client';

type PaginatedList<T> = {
  results?: T[] | null;
  next?: string | null;
  previous?: string | null;
};

type ListPayload<T> = T[] | PaginatedList<T>;

const approxToPreciseThreadIdMap = new Map<string, string>();
const preciseToApproxThreadIdMap = new Map<string, string>();

type MessageResponse = Omit<Message, 'id' | 'thread'> & {
  id: string | number;
  thread: string | number;
};

type ThreadResponse = Omit<Thread, 'id'> & {
  id: string | number;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const toKey = (value: unknown) => {
  if (value === null || value === undefined) {
    return '';
  }
  return String(value);
};

const rememberThreadFromResponse = (approx: unknown, precise: unknown) => {
  if (!approx || !precise) {
    return;
  }
  if (Array.isArray(approx) && Array.isArray(precise)) {
    approx.forEach((item, index) => {
      rememberThreadFromResponse(item, precise[index]);
    });
    return;
  }
  if (isRecord(approx) && isRecord(precise)) {
    const approxId = toKey(approx.id);
    const preciseId = toKey(precise.id);
    if (approxId && preciseId) {
      approxToPreciseThreadIdMap.set(approxId, preciseId);
      preciseToApproxThreadIdMap.set(preciseId, approxId);
    }
    const approxResults = approx.results;
    const preciseResults = precise.results;
    if (Array.isArray(approxResults) && Array.isArray(preciseResults)) {
      approxResults.forEach((item, index) => {
        rememberThreadFromResponse(item, preciseResults[index]);
      });
    }
  }
};

const resolveThreadId = (threadId: string): string => {
  const key = String(threadId);
  return approxToPreciseThreadIdMap.get(key) ?? key;
};

export const mapThreadIdToClient = (
  threadId: string | number | null | undefined,
): string | null => {
  if (threadId === null || threadId === undefined) {
    return null;
  }
  const key = String(threadId);
  return preciseToApproxThreadIdMap.get(key) ?? key;
};

async function requestWithPrecision<T>(config: AxiosRequestConfig): Promise<{
  parsed: T;
  precise: T;
}> {
  const response = await apiClient.request<string>({
    ...config,
    responseType: 'text',
    transformResponse: [(data) => data],
  });
  const raw =
    typeof response.data === 'string'
      ? response.data
      : response.data != null
        ? String(response.data)
        : '';
  const parsed: T = raw ? JSON.parse(raw) : (null as T);
  const precise = raw ? parseJsonPreservingLargeInts<T>(raw) : parsed;
  return { parsed, precise };
}

function extractResults<T>(payload: ListPayload<T> | null | undefined): T[] {
  if (!payload) {
    return [];
  }
  if (Array.isArray(payload)) {
    return payload;
  }
  if (payload && Array.isArray(payload.results)) {
    return payload.results.filter((item): item is T => item != null);
  }
  return [];
}

const normalizeMessage = (
  approx: MessageResponse,
  precise?: MessageResponse,
): Message => {
  const preciseId = precise?.id ?? approx.id;
  const preciseThread = precise?.thread ?? approx.thread;
  if (preciseThread !== undefined) {
    const approxKey = toKey(approx.thread);
    const preciseKey = toKey(preciseThread);
    if (approxKey && preciseKey) {
      approxToPreciseThreadIdMap.set(approxKey, preciseKey);
      preciseToApproxThreadIdMap.set(preciseKey, approxKey);
    }
  }
  return {
    ...approx,
    id: preciseId != null ? String(preciseId) : String(approx.id),
    thread: preciseThread != null ? String(preciseThread) : String(approx.thread),
  };
};

const normalizeThread = (approx: ThreadResponse, precise?: ThreadResponse): Thread => {
  const resolvedId = precise?.id ?? approx.id;
  return {
    ...approx,
    id: resolvedId != null ? String(resolvedId) : String(approx.id),
  };
};

export async function getThreads(): Promise<Thread[]> {
  const { parsed, precise } = await requestWithPrecision<ListPayload<Thread>>({
    method: 'GET',
    url: '/threads/',
  });
  rememberThreadFromResponse(parsed, precise);
  const approxThreads = extractResults(parsed);
  const preciseThreads = extractResults(precise);
  return approxThreads.map((thread, index) =>
    normalizeThread(
      thread as ThreadResponse,
      preciseThreads[index] as ThreadResponse | undefined,
    ),
  );
}

export async function createThread(payload: CreateThreadPayload): Promise<Thread> {
  const { parsed, precise } = await requestWithPrecision<Thread>({
    method: 'POST',
    url: '/threads/',
    data: payload,
  });
  rememberThreadFromResponse(parsed, precise);
  return normalizeThread(parsed as ThreadResponse, precise as ThreadResponse | undefined);
}

export async function getThreadMessages(
  threadId: string,
  cursor?: string,
): Promise<Message[]> {
  const params = new URLSearchParams({ thread: resolveThreadId(threadId) });
  if (cursor) {
    params.append('cursor', cursor);
  }
  const { parsed, precise } = await requestWithPrecision<ListPayload<MessageResponse>>({
    method: 'GET',
    url: `/messages/?${params.toString()}`,
  });
  const approxMessages = extractResults(parsed);
  const preciseMessages = extractResults(precise);
  return approxMessages.map((message, index) =>
    normalizeMessage(message, preciseMessages[index]),
  );
}

export async function sendMessage(threadId: string, text: string): Promise<Message> {
  const { parsed, precise } = await requestWithPrecision<MessageResponse>({
    method: 'POST',
    url: '/messages/',
    data: {
      thread: resolveThreadId(threadId),
      body: text,
    },
  });
  return normalizeMessage(parsed, precise);
}

export async function getOrCreateDirectThread(
  userId: number | string,
  initialMessage?: string,
): Promise<Thread> {
  const payload: Record<string, unknown> = { user_id: String(userId) };
  if (initialMessage?.trim()) {
    payload.initial_message = initialMessage.trim();
  }
  const { parsed, precise } = await requestWithPrecision<Thread>({
    method: 'POST',
    url: '/threads/direct/',
    data: payload,
  });
  rememberThreadFromResponse(parsed, precise);
  return normalizeThread(parsed as ThreadResponse, precise as ThreadResponse | undefined);
}

export async function getThread(threadId: string): Promise<Thread> {
  const { parsed, precise } = await requestWithPrecision<Thread>({
    method: 'GET',
    url: `/threads/${resolveThreadId(threadId)}/`,
  });
  rememberThreadFromResponse(parsed, precise);
  return normalizeThread(parsed as ThreadResponse, precise as ThreadResponse | undefined);
}

export async function markThreadRead(threadId: string): Promise<void> {
  await apiClient.post(`/threads/${resolveThreadId(threadId)}/read/`, {});
}

export async function getMessage(messageId: string): Promise<Message> {
  const { parsed, precise } = await requestWithPrecision<MessageResponse>({
    method: 'GET',
    url: `/messages/${messageId}/`,
  });
  return normalizeMessage(parsed, precise);
}

export async function deleteMessage(messageId: string): Promise<void> {
  await apiClient.delete(`/messages/${messageId}/`);
}

export async function deleteThread(threadId: string): Promise<void> {
  await apiClient.post(`/threads/${resolveThreadId(threadId)}/leave/`, {});
}
