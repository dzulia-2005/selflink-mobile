import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

import * as messagingApi from '@api/messaging';
import type {
  Message,
  MessageAttachment,
  MessageStatus,
  PendingAttachment,
  Thread,
} from '@schemas/messaging';

export type ThreadTypingStatus = {
  typing: boolean;
  userId?: string;
  userName?: string | null;
  userHandle?: string | null;
};

type MessagesByThread = Record<string, Message[]>;
type UnreadMap = Record<string, number>;
type PendingMessage = {
  clientUuid: string;
  threadId: string;
  body: string;
  attachments?: PendingAttachment[];
  replyToMessageId?: string | null;
  createdAt: string;
  attempts: number;
  nextAttemptAt?: number;
  status: Exclude<MessageStatus, 'sent' | 'delivered' | 'read'>;
  error?: string;
};

const PENDING_QUEUE_STORAGE_KEY = 'selflink-messaging-pending-queue';
const MAX_SEND_ATTEMPTS = 4;
const BASE_RETRY_MS = 2_000;
const MAX_RETRY_MS = 60_000;

const sortThreadsByUpdatedAt = (threads: Thread[]) =>
  [...threads].sort(
    (a, b) => new Date(b.updated_at).valueOf() - new Date(a.updated_at).valueOf(),
  );

const sortMessagesChronologically = (messages: Message[]) =>
  [...messages].sort(
    (a, b) => new Date(a.created_at).valueOf() - new Date(b.created_at).valueOf(),
  );

const deriveMessageKey = (message: Message) => String(message.client_uuid ?? message.id);

const attachmentsEqual = (
  a?: MessageAttachment[] | null,
  b?: MessageAttachment[] | null,
): boolean => {
  const aList = Array.isArray(a) ? a : [];
  const bList = Array.isArray(b) ? b : [];
  if (aList.length !== bList.length) {
    return false;
  }
  for (let i = 0; i < aList.length; i += 1) {
    const aItem = aList[i];
    const bItem = bList[i];
    if (
      aItem?.url !== bItem?.url ||
      aItem?.type !== bItem?.type ||
      aItem?.mimeType !== bItem?.mimeType ||
      aItem?.width !== bItem?.width ||
      aItem?.height !== bItem?.height ||
      aItem?.duration !== bItem?.duration
    ) {
      return false;
    }
  }
  return true;
};

const normalizeReactions = (reactions?: Message['reactions'] | null) => {
  if (!Array.isArray(reactions)) {
    return undefined;
  }
  return reactions
    .map((reaction) =>
      reaction?.emoji
        ? {
            emoji: reaction.emoji,
            count: Math.max(1, reaction.count ?? 1),
            reactedByCurrentUser: reaction.reactedByCurrentUser ?? false,
          }
        : null,
    )
    .filter(Boolean) as Exclude<Message['reactions'], undefined>;
};

const reactionsEqual = (
  a?: Message['reactions'] | null,
  b?: Message['reactions'] | null,
): boolean => {
  const aList = normalizeReactions(a) ?? [];
  const bList = normalizeReactions(b) ?? [];
  if (aList.length !== bList.length) {
    return false;
  }
  const sortByEmoji = (list: NonNullable<Message['reactions']>) =>
    [...list].sort((left, right) => left.emoji.localeCompare(right.emoji));
  const sortedA = sortByEmoji(aList);
  const sortedB = sortByEmoji(bList);
  for (let i = 0; i < sortedA.length; i += 1) {
    const aItem = sortedA[i];
    const bItem = sortedB[i];
    if (
      aItem.emoji !== bItem.emoji ||
      aItem.count !== bItem.count ||
      Boolean(aItem.reactedByCurrentUser) !== Boolean(bItem.reactedByCurrentUser)
    ) {
      return false;
    }
  }
  return true;
};

const replyPreviewEqual = (
  a?: Message['replyTo'] | null,
  b?: Message['replyTo'] | null,
): boolean => {
  if (!a && !b) {
    return true;
  }
  if (!a || !b) {
    return false;
  }
  return (
    a.id === b.id &&
    a.senderId === b.senderId &&
    a.senderName === b.senderName &&
    a.textPreview === b.textPreview &&
    Boolean(a.hasAttachments) === Boolean(b.hasAttachments)
  );
};

const applyReactionDelta = (
  reactions: Message['reactions'] | undefined,
  emoji: string,
  delta: number,
  reactedByCurrentUser?: boolean,
): Message['reactions'] => {
  const normalized = normalizeReactions(reactions) ?? [];
  const existingIndex = normalized.findIndex((reaction) => reaction.emoji === emoji);
  if (existingIndex === -1) {
    if (delta < 0) {
      return normalized;
    }
    return [
      ...normalized,
      {
        emoji,
        count: Math.max(1, delta),
        reactedByCurrentUser: reactedByCurrentUser || false,
      },
    ];
  }
  const next = [...normalized];
  const target = next[existingIndex];
  const nextCount = Math.max(0, target.count + delta);
  if (nextCount === 0) {
    next.splice(existingIndex, 1);
  } else {
    next[existingIndex] = {
      ...target,
      count: nextCount,
      reactedByCurrentUser:
        reactedByCurrentUser !== undefined
          ? reactedByCurrentUser
          : target.reactedByCurrentUser,
    };
  }
  return next;
};

const mergeMessagesChronologically = (
  existing: Message[] | undefined,
  incoming: Message[],
): { merged: Message[]; changed: boolean } => {
  if (!existing || existing.length === 0) {
    return {
      merged: sortMessagesChronologically(incoming),
      changed: incoming.length > 0,
    };
  }
  if (incoming.length === 0) {
    return { merged: existing, changed: false };
  }
  const map = new Map<string, Message>();
  existing.forEach((message) => {
    map.set(deriveMessageKey(message), message);
  });
  let changed = false;
  incoming.forEach((message) => {
    const key = deriveMessageKey(message);
    const current = map.get(key);
    if (!current) {
      changed = true;
      map.set(key, message);
      return;
    }
    if (
      current.body !== message.body ||
      current.created_at !== message.created_at ||
      current.sender?.id !== message.sender?.id ||
      current.status !== message.status ||
      current.client_uuid !== message.client_uuid ||
      current.delivered_at !== message.delivered_at ||
      current.read_at !== message.read_at ||
      current.meta !== message.meta ||
      current.type !== message.type ||
      !attachmentsEqual(current.attachments, message.attachments) ||
      !reactionsEqual(current.reactions, message.reactions) ||
      !replyPreviewEqual(current.replyTo, message.replyTo)
    ) {
      changed = true;
      map.set(key, message);
    }
  });
  const next = sortMessagesChronologically(Array.from(map.values()));
  if (!changed && next.length === existing.length) {
    return { merged: existing, changed: false };
  }
  return { merged: next, changed: true };
};

const mergeMessagesForThread = (
  currentMap: MessagesByThread,
  threadKey: string,
  incoming: Message[],
): MessagesByThread | null => {
  const current = currentMap[threadKey];
  const { merged, changed } = mergeMessagesChronologically(current, incoming);
  if (!changed) {
    return null;
  }
  return {
    ...currentMap,
    [threadKey]: merged,
  };
};

const normalizeThreadId = (threadId: string | number | null | undefined) => {
  if (threadId === null || threadId === undefined) {
    return '';
  }
  return String(threadId);
};

const computeTotalUnread = (unreadByThread: UnreadMap) =>
  Object.values(unreadByThread).reduce((sum, value) => sum + Math.max(0, value), 0);

const computeRetryDelayMs = (attempts: number) => {
  const exponent = Math.max(0, attempts - 1);
  return Math.min(MAX_RETRY_MS, BASE_RETRY_MS * 2 ** exponent);
};

const toBigIntId = (value: string) => {
  if (!/^\d+$/.test(value)) {
    return null;
  }
  try {
    return BigInt(value);
  } catch {
    return null;
  }
};

const messageIdLte = (candidate: string, target: string) => {
  const a = toBigIntId(candidate);
  const b = toBigIntId(target);
  if (a !== null && b !== null) {
    return a <= b;
  }
  return candidate.localeCompare(target) <= 0;
};

const generateClientUuid = () => {
  const globalCrypto =
    typeof globalThis !== 'undefined' ? (globalThis as any).crypto : null;
  if (globalCrypto?.randomUUID) {
    return globalCrypto.randomUUID();
  }
  return `msg-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const isLikelyNetworkError = (error: unknown) => {
  if (!error || typeof error !== 'object') {
    return false;
  }
  const axiosLike = error as { code?: string; message?: string; response?: unknown };
  if (axiosLike.response) {
    return false;
  }
  const code = axiosLike.code ?? '';
  const message = axiosLike.message ?? '';
  return (
    code === 'ERR_NETWORK' ||
    code === 'ECONNABORTED' ||
    /network\s?error/i.test(message ?? '') ||
    /timeout/i.test(message ?? '')
  );
};

const normalizeId = (value: unknown) => {
  if (value === null || value === undefined) {
    return null;
  }
  return String(value);
};

const sessionOwnsThread = (thread: Thread, sessionUserId: string | null) => {
  if (!sessionUserId) {
    return true;
  }
  if (!Array.isArray(thread.members)) {
    return true;
  }
  const sessionKey = normalizeId(sessionUserId);
  if (!sessionKey) {
    return true;
  }
  return thread.members.some((member) => {
    const memberCandidate =
      (member as any)?.user?.id ??
      (member as any)?.user_id ??
      (member?.user ? (member.user as any).id : undefined);
    const memberId = normalizeId(memberCandidate);
    return memberId != null && memberId === sessionKey;
  });
};

const filterThreadsForSession = (threads: Thread[], sessionUserId: string | null) =>
  threads.filter((thread) => sessionOwnsThread(thread, sessionUserId));

const buildThreadSnapshot = (
  threads: Thread[],
  sessionUserId: string | null,
  fallbackUnread?: UnreadMap,
) => {
  const scopedThreads = filterThreadsForSession(threads, sessionUserId);
  const normalized = scopedThreads.map((thread) => {
    const key = String(thread.id);
    const serverUnread =
      typeof thread.unread_count === 'number'
        ? Math.max(0, thread.unread_count)
        : undefined;
    const localUnread = fallbackUnread?.[key];
    if (serverUnread !== undefined || localUnread === undefined) {
      return serverUnread !== undefined && serverUnread !== (thread.unread_count ?? 0)
        ? { ...thread, unread_count: serverUnread }
        : thread;
    }
    if (localUnread === (thread.unread_count ?? 0)) {
      return thread;
    }
    return {
      ...thread,
      unread_count: Math.max(0, localUnread),
    };
  });
  const sorted = sortThreadsByUpdatedAt(normalized);
  const unreadByThread: UnreadMap = {};
  for (const thread of sorted) {
    unreadByThread[String(thread.id)] = Math.max(0, thread.unread_count ?? 0);
  }
  return {
    threads: sorted,
    unreadByThread,
    totalUnread: computeTotalUnread(unreadByThread),
  };
};

const buildPlaceholderThread = (
  threadKey: string,
  message: Message,
  unread: number,
): Thread => ({
  id: threadKey,
  is_group: false,
  title: message.sender?.name || message.sender?.handle || 'Conversation',
  members: [],
  participants: message.sender ? [message.sender] : [],
  last_message: {
    body: message.body,
    created_at: message.created_at,
  },
  unread_count: unread,
  created_at: message.created_at,
  updated_at: message.created_at,
});

const applyUnreadToThread = (threads: Thread[], threadKey: string, unread: number) => {
  const targetIndex = threads.findIndex((thread) => String(thread.id) === threadKey);
  if (targetIndex === -1) {
    return threads;
  }
  const target = threads[targetIndex];
  if ((target.unread_count ?? 0) === unread) {
    return threads;
  }
  const nextThreads = [...threads];
  nextThreads[targetIndex] = {
    ...target,
    unread_count: unread,
  };
  return nextThreads;
};

const omitKey = <T>(map: Record<string, T>, key: string): Record<string, T> => {
  if (!Object.prototype.hasOwnProperty.call(map, key)) {
    return map;
  }
  const next = { ...map };
  delete next[key];
  return next;
};

const initialState = {
  threads: [] as Thread[],
  messagesByThread: {} as MessagesByThread,
  unreadByThread: {} as UnreadMap,
  totalUnread: 0,
  activeThreadId: null as string | null,
  sessionUserId: null as string | null,
  typingByThread: {} as Record<string, ThreadTypingStatus | undefined>,
  isLoadingThreads: false,
  isLoadingMessages: false,
  error: undefined as string | undefined,
  pendingMessages: [] as PendingMessage[],
  transportOnline: true,
  pendingQueueHydrated: false,
  isFlushingQueue: false,
};

const pendingReadRequests = new Set<string>();
const persistPendingQueue = async (queue: PendingMessage[]) => {
  try {
    await AsyncStorage.setItem(PENDING_QUEUE_STORAGE_KEY, JSON.stringify(queue));
  } catch (error) {
    console.warn('messagingStore: failed to persist pending queue', error);
  }
};

const loadPendingQueue = async (): Promise<PendingMessage[]> => {
  try {
    const raw = await AsyncStorage.getItem(PENDING_QUEUE_STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as PendingMessage[];
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.map((item) => ({
      ...item,
      attempts: item.attempts ?? 0,
      status: item.status ?? 'queued',
      replyToMessageId:
        item.replyToMessageId ??
        (item as any)?.reply_to_message_id ??
        (item as any)?.reply_to ??
        null,
      attachments: Array.isArray(item.attachments)
        ? (item.attachments as PendingAttachment[]).map((attachment) => ({
            uri: (attachment as any).uri ?? (attachment as any).url ?? '',
            type: (attachment as any).type ?? 'image',
            mime:
              (attachment as any).mime ??
              (attachment as any).mimeType ??
              'application/octet-stream',
            width: (attachment as any).width,
            height: (attachment as any).height,
            duration: (attachment as any).duration,
            name: (attachment as any).name,
          }))
        : undefined,
    }));
  } catch (error) {
    console.warn('messagingStore: failed to load pending queue', error);
    return [];
  }
};

export type MessagingState = typeof initialState & {
  loadThreads: () => Promise<void>;
  syncThreads: () => Promise<void>;
  setThreads: (threads: Thread[]) => void;
  mergeThread: (thread: Thread) => void;
  loadThreadMessages: (threadId: string) => Promise<void>;
  setMessagesForThread: (threadId: string, messages: Message[]) => void;
  sendMessage: (
    threadId: string,
    text: string,
    attachments?: PendingAttachment[],
    replyToMessageId?: string | null,
  ) => Promise<void>;
  appendMessage: (threadId: string, message: Message) => void;
  removeMessage: (threadId: string, messageId: string) => Promise<void>;
  removeThread: (threadId: string) => Promise<void>;
  markThreadRead: (
    threadId: string,
    options?: { sync?: boolean; lastMessageId?: string | null },
  ) => Promise<void>;
  setActiveThread: (threadId: string | null) => void;
  setSessionUserId: (userId: string | number | null) => void;
  recomputeTotalUnread: () => void;
  setTypingStatus: (threadId: string, status: ThreadTypingStatus | null) => void;
  hydratePendingQueue: () => Promise<void>;
  flushPendingQueue: (options?: { force?: boolean }) => Promise<void>;
  retryPendingMessage: (clientUuid: string) => Promise<void>;
  setTransportOnline: (online: boolean) => void;
  applyMessageStatus: (
    messageId: string,
    status: MessageStatus,
    threadId?: string | null,
  ) => void;
  applyReaction: (payload: {
    threadId?: string | null;
    messageId: string;
    emoji: string;
    action: 'added' | 'removed';
    userId?: string | null;
    reactions?: Message['reactions'];
  }) => void;
  reset: () => void;
};

export const useMessagingStore = create<MessagingState>((set, get) => {
  const updateLocalStatus = (
    threadId: string,
    clientUuid: string,
    status: MessageStatus,
    extras?: Partial<Message>,
  ) => {
    const key = normalizeThreadId(threadId);
    if (!key) {
      return;
    }
    const state = get();
    const messages = state.messagesByThread[key];
    if (!messages || messages.length === 0) {
      return;
    }
    const targetIndex = messages.findIndex(
      (message) =>
        message.client_uuid === clientUuid ||
        deriveMessageKey(message) === clientUuid ||
        String(message.id) === clientUuid,
    );
    if (targetIndex === -1) {
      return;
    }
    const nextMessages = [...messages];
    const current = nextMessages[targetIndex];
    nextMessages[targetIndex] = {
      ...current,
      ...extras,
      status,
    };
    set({
      messagesByThread: { ...state.messagesByThread, [key]: nextMessages },
    });
  };

  const applyReadThrough = (threadId: string, lastReadId: string | null) => {
    const key = normalizeThreadId(threadId);
    if (!key || !lastReadId) {
      return;
    }
    const state = get();
    const sessionUserId = state.sessionUserId;
    if (!sessionUserId) {
      return;
    }
    const messages = state.messagesByThread[key];
    if (!messages || messages.length === 0) {
      return;
    }
    let changed = false;
    const nextMessages = messages.map((message) => {
      const senderId = message.sender?.id != null ? String(message.sender.id) : null;
      if (!senderId || senderId !== sessionUserId) {
        return message;
      }
      if (!message.id || !messageIdLte(String(message.id), lastReadId)) {
        return message;
      }
      if (message.status === 'read') {
        return message;
      }
      changed = true;
      return {
        ...message,
        status: 'read' as MessageStatus,
        read_at: message.read_at ?? new Date().toISOString(),
      };
    });
    if (changed) {
      set({
        messagesByThread: { ...state.messagesByThread, [key]: nextMessages },
      });
    }
  };

  const findMessageLocation = (messageId: string, threadHint?: string | null) => {
    const state = get();
    const targetId = String(messageId);
    const searchThreads = threadHint
      ? [normalizeThreadId(threadHint)]
      : Object.keys(state.messagesByThread);
    for (const key of searchThreads) {
      if (!key) {
        continue;
      }
      const messages = state.messagesByThread[key];
      if (!messages || messages.length === 0) {
        continue;
      }
      const index = messages.findIndex(
        (message) =>
          String(message.id) === targetId ||
          deriveMessageKey(message) === targetId ||
          (message as any)?.client_uuid === targetId,
      );
      if (index !== -1) {
        return { key, index, messages };
      }
    }
    return null;
  };

  return {
    ...initialState,
    async loadThreads() {
      set({ isLoadingThreads: true, error: undefined });
      try {
        const threads = await messagingApi.getThreads();
        const { sessionUserId, unreadByThread } = get();
        set(buildThreadSnapshot(threads, sessionUserId, unreadByThread));
      } catch (error) {
        set({
          error: error instanceof Error ? error.message : 'Unable to load threads.',
        });
      } finally {
        set({ isLoadingThreads: false });
      }
    },
    async removeThread(threadId) {
      const threadKey = normalizeThreadId(threadId);
      if (!threadKey) {
        return;
      }
      const state = get();
      const threads = state.threads.filter((thread) => String(thread.id) !== threadKey);
      const messagesByThread = omitKey(state.messagesByThread, threadKey);
      const unreadByThread = omitKey(state.unreadByThread, threadKey);
      const totalUnread = computeTotalUnread(unreadByThread);
      const pendingMessages = state.pendingMessages.filter(
        (pending) => pending.threadId !== threadKey,
      );
      const activeThreadId =
        state.activeThreadId === threadKey ? null : state.activeThreadId;
      set({
        threads,
        messagesByThread,
        unreadByThread,
        totalUnread,
        activeThreadId,
        pendingMessages,
      });
      if (pendingMessages.length !== state.pendingMessages.length) {
        persistPendingQueue(pendingMessages);
      }
      try {
        await messagingApi.deleteThread(threadId);
        await get().syncThreads();
      } catch (error) {
        console.warn('messagingStore: removeThread failed', error);
        await get().syncThreads();
        throw error;
      }
    },
    async removeMessage(threadId, messageId) {
      const threadKey = normalizeThreadId(threadId);
      const messageKey = String(messageId);
      if (!threadKey || !messageKey) {
        return;
      }
      const state = get();
      const existingMessages = state.messagesByThread[threadKey];
      if (!existingMessages || existingMessages.length === 0) {
        try {
          await messagingApi.deleteMessage(messageId);
          await get().syncThreads();
        } catch (error) {
          console.warn('messagingStore: removeMessage failed', error);
          throw error;
        }
        return;
      }
      const nextMessages = existingMessages.filter(
        (message) => String(message.id) !== messageKey,
      );
      if (nextMessages.length === existingMessages.length) {
        return;
      }
      const messagesByThread =
        nextMessages.length === 0
          ? omitKey(state.messagesByThread, threadKey)
          : { ...state.messagesByThread, [threadKey]: nextMessages };
      let threads = state.threads;
      const targetIndex = threads.findIndex((thread) => String(thread.id) === threadKey);
      if (targetIndex !== -1) {
        const thread = threads[targetIndex];
        const newLast = nextMessages[nextMessages.length - 1] ?? null;
        const nextThreads = [...threads];
        nextThreads[targetIndex] = {
          ...thread,
          last_message: newLast
            ? {
                body: newLast.body,
                created_at: newLast.created_at,
              }
            : null,
          updated_at: newLast?.created_at ?? thread.updated_at,
        };
        threads = sortThreadsByUpdatedAt(nextThreads);
      }
      set({ messagesByThread, threads });
      try {
        await messagingApi.deleteMessage(messageId);
        await get().syncThreads();
      } catch (error) {
        console.warn('messagingStore: removeMessage rollback', error);
        await Promise.all([
          get()
            .syncThreads()
            .catch(() => undefined),
          get()
            .loadThreadMessages(threadId)
            .catch(() => undefined),
        ]);
        throw error;
      }
    },
    async syncThreads() {
      try {
        const threads = await messagingApi.getThreads();
        const { sessionUserId, unreadByThread } = get();
        set(buildThreadSnapshot(threads, sessionUserId, unreadByThread));
      } catch (error) {
        console.warn('messagingStore: failed to sync threads', error);
      }
    },
    setThreads(threads) {
      const { sessionUserId, unreadByThread } = get();
      set(buildThreadSnapshot(threads, sessionUserId, unreadByThread));
    },
    mergeThread(thread) {
      const state = get();
      if (!sessionOwnsThread(thread, state.sessionUserId)) {
        return;
      }
      const key = String(thread.id);
      const serverUnread =
        typeof thread.unread_count === 'number'
          ? Math.max(0, thread.unread_count)
          : undefined;
      const fallbackUnread = state.unreadByThread[key] ?? 0;
      const resolvedUnread = serverUnread ?? fallbackUnread;
      const normalizedThread =
        serverUnread === undefined && thread.unread_count !== resolvedUnread
          ? { ...thread, unread_count: resolvedUnread }
          : thread;
      const nextThreads = sortThreadsByUpdatedAt([
        normalizedThread,
        ...state.threads.filter((existing) => existing.id !== thread.id),
      ]);
      const unreadByThread = {
        ...state.unreadByThread,
        [key]: resolvedUnread,
      };
      set({
        threads: nextThreads,
        unreadByThread,
        totalUnread: computeTotalUnread(unreadByThread),
      });
    },
    async loadThreadMessages(threadId) {
      const key = normalizeThreadId(threadId);
      if (!key) {
        return;
      }
      set({ isLoadingMessages: true, error: undefined });
      try {
        const messages = await messagingApi.getThreadMessages(threadId);
        const state = get();
        const messagesByThread = mergeMessagesForThread(
          state.messagesByThread,
          key,
          messages,
        );
        if (messagesByThread) {
          set({ messagesByThread });
        }
      } catch (error) {
        set({
          error: error instanceof Error ? error.message : 'Unable to load messages.',
        });
      } finally {
        set({ isLoadingMessages: false });
      }
    },
    setMessagesForThread(threadId, messages) {
      const key = normalizeThreadId(threadId);
      if (!key) {
        return;
      }
      const state = get();
      const messagesByThread = mergeMessagesForThread(
        state.messagesByThread,
        key,
        messages,
      );
      if (messagesByThread) {
        set({ messagesByThread });
      }
    },
    async sendMessage(threadId, text, attachments, replyToMessageId) {
      const body = text.trim();
      const hasBody = Boolean(body);
      const hasAttachments = Array.isArray(attachments) && attachments.length > 0;
      if (!hasBody && !hasAttachments) {
        return;
      }
      const clientUuid = generateClientUuid();
      const createdAt = new Date().toISOString();
      const threadKey = normalizeThreadId(threadId) || String(threadId);
      const state = get();
      const replySource =
        replyToMessageId && state.messagesByThread[threadKey]
          ? state.messagesByThread[threadKey].find(
              (message) => message.id === replyToMessageId,
            )
          : undefined;
      const replyPreview =
        replyToMessageId && replySource
          ? {
              id: replyToMessageId,
              senderId:
                replySource.sender?.id !== undefined && replySource.sender?.id !== null
                  ? String(replySource.sender.id)
                  : '',
              senderName: replySource.sender?.name ?? null,
              textPreview: replySource.body ?? null,
              hasAttachments: Array.isArray(replySource.attachments)
                ? replySource.attachments.length > 0
                : false,
            }
          : undefined;
      const optimistic: Message = {
        id: clientUuid,
        thread: threadKey,
        sender: { id: state.sessionUserId ?? 'me' } as unknown as Message['sender'],
        body: hasBody ? body : '',
        type: 'text',
        meta: null,
        status: state.transportOnline ? 'pending' : 'queued',
        client_uuid: clientUuid,
        created_at: createdAt,
        replyTo: replyPreview,
        attachments: Array.isArray(attachments)
          ? attachments.map((attachment, index) => ({
              id: `${clientUuid}-${index}`,
              url: attachment.uri,
              type: attachment.type,
              mimeType: attachment.mime,
              width: attachment.width ?? null,
              height: attachment.height ?? null,
              duration: attachment.duration ?? null,
            }))
          : undefined,
      };

      get().appendMessage(threadId, optimistic);

      const queueCandidate: PendingMessage = {
        clientUuid,
        threadId: threadKey,
        body: hasBody ? body : '',
        attachments: hasAttachments ? attachments : undefined,
        replyToMessageId: replyToMessageId ?? undefined,
        createdAt,
        attempts: 0,
        status: 'queued',
      };

      const enqueuePending = (entry: PendingMessage) => {
        set((currentState) => {
          const existingIndex = currentState.pendingMessages.findIndex(
            (item) => item.clientUuid === entry.clientUuid,
          );
          const pendingMessages =
            existingIndex === -1
              ? [...currentState.pendingMessages, entry]
              : currentState.pendingMessages.map((item, index) =>
                  index === existingIndex ? { ...item, ...entry } : item,
                );
          persistPendingQueue(pendingMessages);
          return { pendingMessages };
        });
      };

      if (!state.transportOnline) {
        enqueuePending(queueCandidate);
        updateLocalStatus(threadKey, clientUuid, 'queued');
        return;
      }

      try {
        const message = hasAttachments
          ? await messagingApi.sendMessageWithAttachments({
              threadId,
              text: body,
              clientUuid,
              attachments: attachments ?? [],
              replyToMessageId,
            })
          : await messagingApi.sendMessageWithMeta(threadId, body, {
              clientUuid,
              replyToMessageId,
            });
        const normalized =
          message.client_uuid || message.status || message.id === clientUuid
            ? message
            : { ...message, client_uuid: clientUuid };
        get().appendMessage(normalized.thread, {
          ...normalized,
          status: normalized.status ?? 'sent',
        });
      } catch (error) {
        if (isLikelyNetworkError(error)) {
          enqueuePending({
            ...queueCandidate,
            attempts: 1,
            status: 'queued',
            error: error instanceof Error ? error.message : undefined,
            nextAttemptAt: Date.now() + computeRetryDelayMs(1),
          });
          updateLocalStatus(threadKey, clientUuid, 'queued', {
            client_uuid: clientUuid,
          });
          return;
        }
        const detail = error instanceof Error ? error.message : 'Unable to send message.';
        set({ error: detail });
        throw error;
      }
    },
    appendMessage(threadId, message) {
      const messageThreadKey = normalizeThreadId(message?.thread);
      const fallbackKey = normalizeThreadId(threadId);
      const key = messageThreadKey || fallbackKey;
      if (!key) {
        return;
      }
      const state = get();
      const clientUuid =
        (message as Message & { client_uuid?: string | number | null }).client_uuid ??
        (message as any)?.clientUuid ??
        null;
      const normalizedId =
        typeof (message as Message & { id: string | number }).id === 'string'
          ? (message as Message & { id: string | number }).id
          : String((message as Message & { id: string | number }).id);
      let normalizedMessage: Message = {
        ...message,
        id: normalizedId,
        thread: key,
        client_uuid: clientUuid != null ? String(clientUuid) : undefined,
        reactions: normalizeReactions((message as any).reactions) ?? undefined,
      };
      const replyFallback = (message as any).replyTo ?? (message as any).reply_to;
      if (replyFallback?.id != null && replyFallback?.sender_id != null) {
        normalizedMessage.replyTo = {
          id: String(replyFallback.id),
          senderId: String(
            replyFallback.sender_id ??
              replyFallback.sender?.id ??
              replyFallback.senderId ??
              replyFallback.sender?.sender_id ??
              '',
          ),
          senderName:
            replyFallback.sender?.name ?? replyFallback.sender_name ?? replyFallback.name,
          textPreview: replyFallback.text_preview ?? replyFallback.body ?? null,
          hasAttachments: Boolean(replyFallback.has_attachments),
        };
      } else if ((message as any).replyTo) {
        normalizedMessage.replyTo = (message as any).replyTo;
      }
      let threads = state.threads;
      let threadFromState = threads.find((thread) => String(thread.id) === key);
      const sessionUserId = state.sessionUserId;
      const isActiveThread = state.activeThreadId === key;
      const senderId =
        normalizedMessage.sender?.id != null ? String(normalizedMessage.sender.id) : null;
      const isOwnMessage = sessionUserId != null && senderId === sessionUserId;
      if (!normalizedMessage.status && isOwnMessage) {
        normalizedMessage = {
          ...normalizedMessage,
          status: state.transportOnline ? 'sent' : 'pending',
        };
      }
      let unreadByThread = state.unreadByThread;
      let unreadChanged = false;
      let pendingMessages = state.pendingMessages;

      if (!threadFromState) {
        const placeholderUnread = isOwnMessage || isActiveThread ? 0 : 1;
        const placeholder = buildPlaceholderThread(
          key,
          normalizedMessage,
          placeholderUnread,
        );
        threads = sortThreadsByUpdatedAt([placeholder, ...threads]);
        threadFromState = placeholder;
        if (unreadByThread[key] !== placeholderUnread) {
          unreadByThread = { ...unreadByThread, [key]: placeholderUnread };
          unreadChanged = placeholderUnread !== (state.unreadByThread[key] ?? 0);
        }
        if (state.sessionUserId != null) {
          get()
            .syncThreads()
            .catch(() => undefined);
        }
      }

      const existingMessages = state.messagesByThread[key] ?? [];
      const duplicateIndex = existingMessages.findIndex(
        (item) => deriveMessageKey(item) === deriveMessageKey(normalizedMessage),
      );
      let messagesByThread = state.messagesByThread;
      let insertedNew = false;
      let logged = false;
      if (duplicateIndex === -1) {
        const nextMessages = sortMessagesChronologically([
          ...existingMessages,
          normalizedMessage,
        ]);
        messagesByThread = {
          ...messagesByThread,
          [key]: nextMessages,
        };
        insertedNew = true;
      } else {
        const currentMessage = existingMessages[duplicateIndex];
        const needsReplacement =
          currentMessage.body !== normalizedMessage.body ||
          currentMessage.created_at !== normalizedMessage.created_at ||
          currentMessage.meta !== normalizedMessage.meta ||
          currentMessage.type !== normalizedMessage.type ||
          currentMessage.sender?.id !== normalizedMessage.sender?.id ||
          currentMessage.status !== normalizedMessage.status ||
          currentMessage.delivered_at !== normalizedMessage.delivered_at ||
          currentMessage.read_at !== normalizedMessage.read_at ||
          currentMessage.client_uuid !== normalizedMessage.client_uuid ||
          !reactionsEqual(currentMessage.reactions, normalizedMessage.reactions) ||
          !replyPreviewEqual(currentMessage.replyTo, normalizedMessage.replyTo);
        if (needsReplacement) {
          const nextMessages = [...existingMessages];
          nextMessages[duplicateIndex] = normalizedMessage;
          messagesByThread = {
            ...messagesByThread,
            [key]: nextMessages,
          };
          logged = true;
        } else {
          if (typeof __DEV__ !== 'undefined' && __DEV__) {
            console.debug('messagingStore: appendMessage skip duplicate', {
              threadId: key,
              messageId: normalizedMessage.id,
            });
          }
          return;
        }
      }

      if ((insertedNew || logged) && typeof __DEV__ !== 'undefined' && __DEV__) {
        console.debug('messagingStore: appendMessage', {
          threadId: key,
          messageId: normalizedMessage.id,
        });
      }

      const currentUnread = unreadByThread[key] ?? 0;
      let nextUnread = currentUnread;

      if (isOwnMessage || isActiveThread) {
        if (currentUnread !== 0) {
          nextUnread = 0;
          unreadByThread = { ...unreadByThread, [key]: 0 };
          unreadChanged = true;
        }
      } else if (insertedNew) {
        nextUnread = currentUnread + 1;
        unreadByThread = { ...unreadByThread, [key]: nextUnread };
        unreadChanged = true;
      }

      const targetIndex = threads.findIndex((thread) => String(thread.id) === key);
      if (targetIndex !== -1) {
        const thread = threads[targetIndex];
        const needsUpdate =
          thread.last_message?.body !== normalizedMessage.body ||
          thread.last_message?.created_at !== normalizedMessage.created_at ||
          thread.updated_at !== normalizedMessage.created_at ||
          (thread.unread_count ?? 0) !== nextUnread;
        if (needsUpdate) {
          const nextThreads = [...threads];
          nextThreads[targetIndex] = {
            ...thread,
            last_message: {
              body: normalizedMessage.body,
              created_at: normalizedMessage.created_at,
            },
            updated_at: normalizedMessage.created_at,
            unread_count: nextUnread,
          };
          threads = sortThreadsByUpdatedAt(nextThreads);
        }
      }

      if (normalizedMessage.client_uuid) {
        const pendingIndex = pendingMessages.findIndex(
          (pending) => pending.clientUuid === normalizedMessage.client_uuid,
        );
        if (pendingIndex !== -1) {
          pendingMessages = pendingMessages.filter(
            (pending) => pending.clientUuid !== normalizedMessage.client_uuid,
          );
          persistPendingQueue(pendingMessages);
        }
      }

      const changed =
        messagesByThread !== state.messagesByThread ||
        threads !== state.threads ||
        unreadByThread !== state.unreadByThread ||
        pendingMessages !== state.pendingMessages;

      if (!changed) {
        return;
      }

      set({
        messagesByThread,
        threads,
        unreadByThread,
        pendingMessages,
        totalUnread: unreadChanged
          ? computeTotalUnread(unreadByThread)
          : state.totalUnread,
      });
    },
    async markThreadRead(threadId, options) {
      const key = normalizeThreadId(threadId);
      if (!key) {
        return;
      }
      if (typeof __DEV__ !== 'undefined' && __DEV__) {
        console.debug('messagingStore: markThreadRead', {
          threadId: key,
          sync: options?.sync !== false,
        });
      }
      const state = get();
      if ((state.unreadByThread[key] ?? 0) !== 0) {
        const unreadByThread = { ...state.unreadByThread, [key]: 0 };
        const threads = applyUnreadToThread(state.threads, key, 0);
        set({
          unreadByThread,
          threads,
          totalUnread: computeTotalUnread(unreadByThread),
        });
      }

      const messages = state.messagesByThread[key] ?? [];
      const latestMessageId =
        options?.lastMessageId ??
        (messages.length > 0 ? String(messages[messages.length - 1].id) : null);

      if (options?.sync === false || pendingReadRequests.has(key)) {
        return;
      }

      pendingReadRequests.add(key);
      try {
        if (typeof __DEV__ !== 'undefined' && __DEV__) {
          console.debug('messagingStore: markThreadRead -> POST', { threadId: key });
        }
        await messagingApi.markThreadRead(threadId, latestMessageId);
        if (latestMessageId) {
          applyReadThrough(threadId, latestMessageId);
        }
      } catch (error) {
        console.warn('messagingStore: failed to mark thread read', error);
        try {
          await get().syncThreads();
        } catch {
          // already logged in syncThreads
        }
      } finally {
        pendingReadRequests.delete(key);
      }
    },
    setActiveThread(threadId) {
      const key = threadId == null ? null : normalizeThreadId(threadId);
      if (get().activeThreadId === key) {
        return;
      }
      set({ activeThreadId: key });
    },
    setSessionUserId(userId: string | number | null) {
      const normalized = userId == null ? null : String(userId);
      const current = get().sessionUserId;
      if (normalized == null) {
        if (current !== null) {
          set({ ...initialState });
          persistPendingQueue([]).catch(() => undefined);
        }
        return;
      }
      if (current === normalized) {
        return;
      }
      set({ ...initialState, sessionUserId: normalized });
      persistPendingQueue([]).catch(() => undefined);
      const refreshData = async () => {
        await get()
          .loadThreads()
          .catch(() => undefined);
        await get()
          .syncThreads()
          .catch(() => undefined);
      };
      refreshData();
    },
    recomputeTotalUnread() {
      set((state) => ({
        totalUnread: computeTotalUnread(state.unreadByThread),
      }));
    },
    setTypingStatus(threadId, status) {
      const key = normalizeThreadId(threadId);
      if (!key) {
        return;
      }
      set((state) => {
        const current = state.typingByThread[key];
        if (!status || !status.typing) {
          if (!current) {
            return state;
          }
          const nextTyping = { ...state.typingByThread };
          delete nextTyping[key];
          return { ...state, typingByThread: nextTyping };
        }
        const nextTyping = { ...state.typingByThread, [key]: status };
        return { ...state, typingByThread: nextTyping };
      });
    },
    async hydratePendingQueue() {
      if (get().pendingQueueHydrated) {
        return;
      }
      const queue = await loadPendingQueue();
      set({ pendingMessages: queue, pendingQueueHydrated: true });
    },
    async flushPendingQueue(options) {
      const state = get();
      if (
        (state.isFlushingQueue || state.pendingMessages.length === 0) &&
        !options?.force
      ) {
        return;
      }
      if (!state.transportOnline && !options?.force) {
        return;
      }
      set({ isFlushingQueue: true });
      let queue = [...get().pendingMessages];
      try {
        for (const pending of queue) {
          if (!options?.force && pending.status === 'failed') {
            continue;
          }
          if (
            !options?.force &&
            pending.nextAttemptAt &&
            pending.nextAttemptAt > Date.now()
          ) {
            continue;
          }
          queue = queue.map((item) =>
            item.clientUuid === pending.clientUuid
              ? { ...item, status: 'pending' }
              : item,
          );
          set({ pendingMessages: queue });
          updateLocalStatus(pending.threadId, pending.clientUuid, 'pending', {
            client_uuid: pending.clientUuid,
          });
          try {
            const message =
              pending.attachments && pending.attachments.length > 0
                ? await messagingApi.sendMessageWithAttachments({
                    threadId: pending.threadId,
                    text: pending.body,
                    clientUuid: pending.clientUuid,
                    attachments: pending.attachments,
                    replyToMessageId: pending.replyToMessageId,
                  })
                : await messagingApi.sendMessageWithMeta(pending.threadId, pending.body, {
                    clientUuid: pending.clientUuid,
                    replyToMessageId: pending.replyToMessageId,
                  });
            get().appendMessage(message.thread, {
              ...message,
              status: message.status ?? 'sent',
              client_uuid: message.client_uuid ?? pending.clientUuid,
            });
            queue = get().pendingMessages.filter(
              (item) => item.clientUuid !== pending.clientUuid,
            );
            set({ pendingMessages: queue });
          } catch (error) {
            const attempts = pending.attempts + 1;
            const nextAttemptAt = Date.now() + computeRetryDelayMs(attempts);
            const status = attempts >= MAX_SEND_ATTEMPTS ? 'failed' : 'queued';
            queue = queue.map((item) =>
              item.clientUuid === pending.clientUuid
                ? {
                    ...item,
                    attempts,
                    status,
                    nextAttemptAt,
                    error: error instanceof Error ? error.message : undefined,
                  }
                : item,
            );
            set({ pendingMessages: queue });
            if (status === 'failed') {
              updateLocalStatus(pending.threadId, pending.clientUuid, 'failed', {
                client_uuid: pending.clientUuid,
              });
            } else {
              updateLocalStatus(pending.threadId, pending.clientUuid, 'queued', {
                client_uuid: pending.clientUuid,
              });
            }
          }
        }
        persistPendingQueue(queue);
      } finally {
        set({ isFlushingQueue: false });
      }
    },
    async retryPendingMessage(clientUuid) {
      if (!clientUuid) {
        return;
      }
      set((state) => {
        const pendingMessages: PendingMessage[] = state.pendingMessages.map((pending) =>
          pending.clientUuid === clientUuid
            ? {
                ...pending,
                status: 'queued' as PendingMessage['status'],
                attempts: 0,
                nextAttemptAt: Date.now(),
              }
            : pending,
        );
        persistPendingQueue(pendingMessages);
        return { pendingMessages };
      });
      await get().flushPendingQueue({ force: true });
    },
    setTransportOnline(online) {
      if (get().transportOnline === online) {
        return;
      }
      set({ transportOnline: online });
      if (online) {
        get()
          .flushPendingQueue()
          .catch(() => undefined);
      }
    },
    applyMessageStatus(messageId, status, threadId) {
      if (!messageId || !status) {
        return;
      }
      const location = findMessageLocation(messageId, threadId);
      if (!location) {
        return;
      }
      const state = get();
      const { key, index, messages } = location;
      const target = messages[index];
      const nextStatus = status as MessageStatus;
      if (target.status === nextStatus) {
        return;
      }
      const nextMessages = [...messages];
      nextMessages[index] = {
        ...target,
        status: nextStatus,
        delivered_at:
          nextStatus === 'delivered' && !target.delivered_at
            ? new Date().toISOString()
            : target.delivered_at,
        read_at:
          nextStatus === 'read' && !target.read_at
            ? new Date().toISOString()
            : target.read_at,
      };
      set({
        messagesByThread: { ...state.messagesByThread, [key]: nextMessages },
      });
    },
    applyReaction({ threadId, messageId, emoji, action, userId, reactions }) {
      if (!emoji || !messageId) {
        return;
      }
      const location = findMessageLocation(messageId, threadId);
      if (!location) {
        return;
      }
      const state = get();
      const { key, index, messages } = location;
      const target = messages[index];
      const isSelf =
        userId !== undefined && userId !== null && state.sessionUserId !== null
          ? String(userId) === state.sessionUserId
          : undefined;
      const nextReactions = reactions
        ? normalizeReactions(reactions)
        : applyReactionDelta(
            target.reactions,
            emoji,
            action === 'removed' ? -1 : 1,
            isSelf,
          );
      if (reactionsEqual(target.reactions, nextReactions)) {
        return;
      }
      const nextMessages = [...messages];
      nextMessages[index] = { ...target, reactions: nextReactions };
      set({
        messagesByThread: { ...state.messagesByThread, [key]: nextMessages },
      });
    },
    reset() {
      set({ ...initialState });
      persistPendingQueue([]).catch(() => undefined);
    },
  };
});

export const selectThreads = (state: MessagingState) => state.threads;
export const selectIsLoadingThreads = (state: MessagingState) => state.isLoadingThreads;
export const selectMessagingError = (state: MessagingState) => state.error;
export const selectMessagesLoading = (state: MessagingState) => state.isLoadingMessages;
export const selectTotalUnread = (state: MessagingState) => state.totalUnread;
