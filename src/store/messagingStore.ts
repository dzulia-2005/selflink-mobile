import { create } from 'zustand';

import * as messagingApi from '@api/messaging';
import type { Message, Thread } from '@schemas/messaging';

export type ThreadTypingStatus = {
  typing: boolean;
  userId?: string;
  userName?: string | null;
  userHandle?: string | null;
};

type MessagesByThread = Record<string, Message[]>;
type UnreadMap = Record<string, number>;

const sortThreadsByUpdatedAt = (threads: Thread[]) =>
  [...threads].sort(
    (a, b) => new Date(b.updated_at).valueOf() - new Date(a.updated_at).valueOf(),
  );

const sortMessagesChronologically = (messages: Message[]) =>
  [...messages].sort(
    (a, b) => new Date(a.created_at).valueOf() - new Date(b.created_at).valueOf(),
  );

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
    map.set(String(message.id), message);
  });
  let changed = false;
  incoming.forEach((message) => {
    const key = String(message.id);
    const current = map.get(key);
    if (!current) {
      changed = true;
      map.set(key, message);
      return;
    }
    if (
      current.body !== message.body ||
      current.created_at !== message.created_at ||
      current.sender?.id !== message.sender?.id
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
};

const pendingReadRequests = new Set<string>();

export type MessagingState = typeof initialState & {
  loadThreads: () => Promise<void>;
  syncThreads: () => Promise<void>;
  setThreads: (threads: Thread[]) => void;
  mergeThread: (thread: Thread) => void;
  loadThreadMessages: (threadId: string) => Promise<void>;
  setMessagesForThread: (threadId: string, messages: Message[]) => void;
  sendMessage: (threadId: string, text: string) => Promise<void>;
  appendMessage: (threadId: string, message: Message) => void;
  removeMessage: (threadId: string, messageId: string) => Promise<void>;
  removeThread: (threadId: string) => Promise<void>;
  markThreadRead: (threadId: string, options?: { sync?: boolean }) => Promise<void>;
  setActiveThread: (threadId: string | null) => void;
  setSessionUserId: (userId: string | number | null) => void;
  recomputeTotalUnread: () => void;
  setTypingStatus: (threadId: string, status: ThreadTypingStatus | null) => void;
  reset: () => void;
};

export const useMessagingStore = create<MessagingState>((set, get) => ({
  ...initialState,
  async loadThreads() {
    set({ isLoadingThreads: true, error: undefined });
    try {
      const threads = await messagingApi.getThreads();
      const { sessionUserId, unreadByThread } = get();
      set(buildThreadSnapshot(threads, sessionUserId, unreadByThread));
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Unable to load threads.' });
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
    const activeThreadId =
      state.activeThreadId === threadKey ? null : state.activeThreadId;
    set({
      threads,
      messagesByThread,
      unreadByThread,
      totalUnread,
      activeThreadId,
    });
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
      set({ error: error instanceof Error ? error.message : 'Unable to load messages.' });
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
  async sendMessage(threadId, text) {
    if (!text.trim()) {
      return;
    }
    try {
      const message = await messagingApi.sendMessage(threadId, text.trim());
      get().appendMessage(message.thread, message);
    } catch (error) {
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
    const normalizedMessage =
      message.thread === key && typeof message.id === 'string'
        ? message
        : {
            ...message,
            id: String(message.id),
            thread: key,
          };
    const state = get();
    let threads = state.threads;
    let threadFromState = threads.find((thread) => String(thread.id) === key);
    const sessionUserId = state.sessionUserId;
    const isActiveThread = state.activeThreadId === key;
    const isOwnMessage =
      sessionUserId != null &&
      normalizedMessage.sender?.id != null &&
      String(normalizedMessage.sender.id) === sessionUserId;
    let unreadByThread = state.unreadByThread;
    let unreadChanged = false;

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
      (item) => String(item.id) === normalizedMessage.id,
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
        currentMessage.sender?.id !== normalizedMessage.sender?.id;
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

    const changed =
      messagesByThread !== state.messagesByThread ||
      threads !== state.threads ||
      unreadByThread !== state.unreadByThread;

    if (!changed) {
      return;
    }

    set({
      messagesByThread,
      threads,
      unreadByThread,
      totalUnread: unreadChanged ? computeTotalUnread(unreadByThread) : state.totalUnread,
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

    if (options?.sync === false || pendingReadRequests.has(key)) {
      return;
    }

    pendingReadRequests.add(key);
    try {
      if (typeof __DEV__ !== 'undefined' && __DEV__) {
        console.debug('messagingStore: markThreadRead -> POST', { threadId: key });
      }
      await messagingApi.markThreadRead(threadId);
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
      }
      return;
    }
    if (current === normalized) {
      return;
    }
    set({ ...initialState, sessionUserId: normalized });
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
  reset() {
    set({ ...initialState });
  },
}));

export const selectThreads = (state: MessagingState) => state.threads;
export const selectIsLoadingThreads = (state: MessagingState) => state.isLoadingThreads;
export const selectMessagingError = (state: MessagingState) => state.error;
export const selectMessagesLoading = (state: MessagingState) => state.isLoadingMessages;
export const selectTotalUnread = (state: MessagingState) => state.totalUnread;
