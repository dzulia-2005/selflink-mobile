import type { AxiosRequestConfig } from 'axios';

import { env } from '@config/env';
import type {
  CreateThreadPayload,
  Message,
  MessageAttachment,
  PendingAttachment,
  MessageStatus,
  Thread,
  MessageReactionSummary,
  MessageReplyPreview,
} from '@schemas/messaging';
import { parseJsonPreservingLargeInts } from '@utils/json';
import { buildUrl } from '@utils/url';

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
  status?: MessageStatus;
  client_uuid?: string | null;
  delivered_at?: string | null;
  read_at?: string | null;
  attachments?: MessageAttachment[];
  reactions?: ReactionResponse[];
  reply_to?: ReplyToResponse | null;
  replyTo?: ReplyToResponse | null;
};

type ThreadResponse = Omit<Thread, 'id'> & {
  id: string | number;
};

type ReactionResponse = {
  emoji?: string;
  count?: number;
  user_ids?: Array<string | number> | null;
  reacted_by_current_user?: boolean;
  reacted?: boolean;
};

type ReplyToResponse = {
  id?: string | number | null;
  sender_id?: string | number | null;
  sender?: { id?: string | number | null; name?: string | null } | null;
  text_preview?: string | null;
  body?: string | null;
  has_attachments?: boolean;
  attachments?: unknown[] | null;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const normalizeAttachments = (
  approx?: MessageResponse['attachments'],
  precise?: MessageResponse['attachments'],
): Message['attachments'] => {
  const candidates = precise ?? approx;
  if (!Array.isArray(candidates)) {
    return undefined;
  }
  return candidates
    .map((item, index) => {
      if (!item) {
        return null;
      }
      const resolved = precise?.[index] ?? item;
      const id = resolved?.id ?? item.id ?? index;
      const mime = (resolved as any)?.mimeType ?? (resolved as any)?.mime_type;
      const duration =
        (resolved as any)?.duration ?? (resolved as any)?.duration_seconds ?? null;
      const rawUrl =
        (resolved as any)?.url ?? (resolved as any)?.file ?? (item as any)?.url;
      const resolvedUrl = rawUrl ? buildUrl(env.backendUrl, rawUrl) : null;
      const rawType = (resolved as any)?.type ?? (item as any)?.type ?? '';
      const typeFromMime =
        typeof mime === 'string' && mime.startsWith('video')
          ? 'video'
          : typeof mime === 'string' && mime.startsWith('image')
            ? 'image'
            : undefined;
      const normalizedType =
        rawType === 'video' || rawType === 'image' ? rawType : (typeFromMime ?? 'image');
      return {
        id: id != null ? String(id) : String(index),
        url: resolvedUrl ?? '',
        type: normalizedType as 'image' | 'video',
        mimeType: typeof mime === 'string' ? mime : '',
        width:
          (resolved as any)?.width ??
          (resolved as any)?.image_width ??
          (item as any)?.width,
        height:
          (resolved as any)?.height ??
          (resolved as any)?.image_height ??
          (item as any)?.height,
        duration: typeof duration === 'number' ? duration : null,
      };
    })
    .filter((attachment) => Boolean(attachment?.url)) as MessageAttachment[];
};

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
const normalizeEntityId = <T extends { id?: string | number | null }>(
  entity: T | null | undefined,
): T | null | undefined => {
  if (!entity || entity.id === null || entity.id === undefined) {
    return entity ?? null;
  }
  const normalizedId = typeof entity.id === 'string' ? entity.id : String(entity.id);
  if (normalizedId === entity.id) {
    return entity;
  }
  return {
    ...entity,
    id: normalizedId as T['id'],
  };
};

const normalizeThreadMembers = (
  members?: ThreadResponse['members'],
): Thread['members'] => {
  if (!Array.isArray(members)) {
    return [];
  }
  return members.map((member) => {
    const normalizedUser = normalizeEntityId(member.user);
    if (normalizedUser === member.user) {
      return member;
    }
    return {
      ...member,
      user: normalizedUser ?? member.user,
    };
  });
};

const normalizeParticipants = (
  participants?: ThreadResponse['participants'],
): Thread['participants'] => {
  if (!Array.isArray(participants)) {
    return [];
  }
  return participants.map((participant) => {
    const normalizedParticipant = normalizeEntityId(participant);
    return normalizedParticipant ?? participant;
  });
};

const normalizeReactions = (
  reactions?: ReactionResponse[] | null,
): MessageReactionSummary[] | undefined => {
  if (!Array.isArray(reactions)) {
    return undefined;
  }
  const map = new Map<string, MessageReactionSummary>();
  reactions.forEach((reaction) => {
    if (!reaction?.emoji) {
      return;
    }
    const emoji = reaction.emoji;
    const countFromUsers = Array.isArray(reaction.user_ids)
      ? reaction.user_ids.length
      : null;
    const count =
      typeof reaction.count === 'number'
        ? reaction.count
        : countFromUsers !== null
          ? countFromUsers
          : 1;
    const reacted = Boolean(reaction.reacted_by_current_user ?? reaction.reacted);
    const existing = map.get(emoji);
    if (existing) {
      map.set(emoji, {
        emoji,
        count: Math.max(existing.count, count),
        reactedByCurrentUser: existing.reactedByCurrentUser || reacted || undefined,
      });
    } else {
      map.set(emoji, {
        emoji,
        count: Math.max(1, count),
        reactedByCurrentUser: reacted || undefined,
      });
    }
  });
  return Array.from(map.values());
};
const normalizeReplyPreview = (
  reply: ReplyToResponse | null | undefined,
): MessageReplyPreview | null => {
  if (!reply) {
    return null;
  }
  const id = reply.id !== undefined && reply.id !== null ? String(reply.id) : undefined;
  const senderId =
    reply.sender_id !== undefined && reply.sender_id !== null
      ? String(reply.sender_id)
      : reply.sender?.id !== undefined && reply.sender?.id !== null
        ? String(reply.sender.id)
        : undefined;
  if (!id || !senderId) {
    return null;
  }
  const text =
    typeof reply.text_preview === 'string'
      ? reply.text_preview
      : typeof reply.body === 'string'
        ? reply.body
        : null;
  const hasAttachments =
    reply.has_attachments ??
    (Array.isArray(reply.attachments) ? reply.attachments.length > 0 : undefined);
  return {
    id,
    senderId,
    senderName: reply.sender?.name ?? null,
    textPreview: text,
    hasAttachments: hasAttachments ?? false,
  };
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
  const merged = precise ? { ...approx, ...precise } : approx;
  const resolvedId = merged.id ?? approx.id;
  const resolvedThread = merged.thread ?? approx.thread;
  if (resolvedThread !== undefined) {
    const approxKey = toKey(approx.thread);
    const preciseKey = toKey(resolvedThread);
    if (approxKey && preciseKey) {
      approxToPreciseThreadIdMap.set(approxKey, preciseKey);
      preciseToApproxThreadIdMap.set(preciseKey, approxKey);
    }
  }
  const sender = normalizeEntityId(merged.sender ?? approx.sender);
  return {
    ...approx,
    ...merged,
    id: resolvedId != null ? String(resolvedId) : String(approx.id),
    thread: resolvedThread != null ? String(resolvedThread) : String(approx.thread),
    sender: sender ?? merged.sender ?? approx.sender,
    attachments: normalizeAttachments(approx.attachments, precise?.attachments),
    reactions: normalizeReactions(merged.reactions ?? approx.reactions),
    replyTo: normalizeReplyPreview(
      merged.reply_to ?? merged.replyTo ?? (approx as any).reply_to ?? null,
    ),
  };
};

const normalizeThread = (approx: ThreadResponse, precise?: ThreadResponse): Thread => {
  const merged = precise ? { ...approx, ...precise } : approx;
  const resolvedId = merged.id ?? approx.id;
  return {
    ...approx,
    ...merged,
    id: resolvedId != null ? String(resolvedId) : String(approx.id),
    members: normalizeThreadMembers(
      precise?.members ?? approx.members ?? merged.members ?? [],
    ),
    participants: normalizeParticipants(
      precise?.participants ?? approx.participants ?? merged.participants ?? [],
    ),
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
  return sendMessageWithMeta(threadId, text, {});
}

type SendMessageOptions = {
  clientUuid?: string;
  type?: string;
  meta?: Record<string, unknown> | null;
  attachments?: PendingAttachment[];
  replyToMessageId?: string | null;
};

export type SendMessageParams = {
  threadId: string;
  text: string;
  clientUuid?: string;
  attachments?: PendingAttachment[];
  replyToMessageId?: string | null;
};

export async function sendMessageWithMeta(
  threadId: string,
  text: string,
  options: SendMessageOptions,
): Promise<Message> {
  const { parsed, precise } = await requestWithPrecision<MessageResponse>({
    method: 'POST',
    url: '/messages/',
    data: {
      thread: resolveThreadId(threadId),
      body: text,
      ...(options?.clientUuid ? { client_uuid: options.clientUuid } : {}),
      ...(options?.type ? { type: options.type } : {}),
      ...(options?.meta ? { meta: options.meta } : {}),
      ...(options?.attachments ? { attachments: options.attachments } : {}),
      ...(options?.replyToMessageId
        ? { reply_to_message_id: options.replyToMessageId }
        : {}),
    },
  });
  return normalizeMessage(parsed, precise);
}

export async function sendMessageWithAttachments(
  params: SendMessageParams,
): Promise<Message> {
  const { threadId, text, clientUuid, attachments } = params;
  if (!attachments || attachments.length === 0) {
    return sendMessageWithMeta(threadId, text, {
      clientUuid,
      replyToMessageId: params.replyToMessageId,
    });
  }
  const form = new FormData();
  const trimmed = text.trim();
  if (trimmed) {
    form.append('body', trimmed);
  }
  form.append('client_uuid', clientUuid ?? '');
  if (params.replyToMessageId) {
    form.append('reply_to_message_id', params.replyToMessageId);
  }
  attachments.forEach((attachment, index) => {
    const name =
      attachment.name ??
      `attachment-${index + 1}.${attachment.mime?.split('/')?.[1] ?? 'bin'}`;
    form.append('attachments', {
      uri: attachment.uri,
      name,
      type: attachment.mime,
    } as any);
  });

  const response = await apiClient.request<string>({
    method: 'POST',
    url: `/threads/${resolveThreadId(threadId)}/messages/`,
    data: form,
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    transformResponse: [(data) => data],
    responseType: 'text',
  });
  const raw = typeof response.data === 'string' ? response.data : '';
  const parsed = raw ? JSON.parse(raw) : null;
  const precise = raw ? parseJsonPreservingLargeInts<MessageResponse>(raw) : parsed;
  return normalizeMessage(
    parsed as MessageResponse,
    precise as MessageResponse | undefined,
  );
}

export async function ackMessage(
  messageId: string,
  status: Exclude<MessageStatus, 'queued' | 'failed'>,
): Promise<Message | null> {
  try {
    const { parsed, precise } = await requestWithPrecision<MessageResponse | null>({
      method: 'POST',
      url: `/messages/${messageId}/ack/`,
      data: { status },
    });
    if (!parsed) {
      return null;
    }
    return normalizeMessage(
      parsed as MessageResponse,
      precise as MessageResponse | undefined,
    );
  } catch (error) {
    console.warn('messagingApi: ackMessage failed', { messageId, status, error });
    throw error;
  }
}

export async function toggleReaction(
  messageId: string,
  emoji: string,
): Promise<MessageReactionSummary[] | null> {
  try {
    const { parsed, precise } = await requestWithPrecision<{
      reactions?: ReactionResponse[];
    }>({
      method: 'POST',
      url: `/messages/${messageId}/reactions/`,
      data: { emoji },
    });
    const reactions = normalizeReactions(
      (precise as { reactions?: ReactionResponse[] })?.reactions ??
        (parsed as { reactions?: ReactionResponse[] })?.reactions,
    );
    return reactions ?? null;
  } catch (error) {
    console.warn('messagingApi: toggleReaction failed', { messageId, emoji, error });
    throw error;
  }
}

export async function syncThreadMessages(
  threadId: string,
  since?: string | null,
): Promise<Message[]> {
  const params = new URLSearchParams();
  if (since) {
    params.append('since', since);
  }
  const { parsed, precise } = await requestWithPrecision<
    ListPayload<MessageResponse> | MessageResponse[]
  >({
    method: 'GET',
    url: `/threads/${resolveThreadId(threadId)}/sync/${params.size ? `?${params.toString()}` : ''}`,
  });
  const approxMessages = Array.isArray(parsed)
    ? parsed
    : extractResults<MessageResponse>(parsed as ListPayload<MessageResponse>);
  const preciseMessages = Array.isArray(precise)
    ? (precise as MessageResponse[])
    : extractResults<MessageResponse>(precise as ListPayload<MessageResponse>);
  return approxMessages.map((message, index) =>
    normalizeMessage(message as MessageResponse, preciseMessages[index]),
  );
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

export async function markThreadRead(
  threadId: string,
  lastReadMessageId?: string | null,
): Promise<void> {
  await apiClient.post(`/threads/${resolveThreadId(threadId)}/read/`, {
    ...(lastReadMessageId ? { last_read_message_id: lastReadMessageId } : {}),
  });
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
