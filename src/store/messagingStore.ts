import { create } from 'zustand';

import * as messagingApi from '@api/messaging';
import type { Message, Thread } from '@schemas/messaging';

type MessagesByThread = Record<string, Message[]>;
type UnreadMap = Record<string, number>;

const sortThreadsByUpdatedAt = (threads: Thread[]) =>
  [...threads].sort((a, b) => new Date(b.updated_at).valueOf() - new Date(a.updated_at).valueOf());

const sortMessagesChronologically = (messages: Message[]) =>
  [...messages].sort(
    (a, b) => new Date(a.created_at).valueOf() - new Date(b.created_at).valueOf(),
  );

const mergeMessagesChronologically = (
  existing: Message[] | undefined,
  incoming: Message[],
): { merged: Message[]; changed: boolean } => {
  if (!existing || existing.length === 0) {
    return { merged: sortMessagesChronologically(incoming), changed: incoming.length > 0 };
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

const normalizeThreadId = (threadId: string | number | undefined) => {
  if (threadId === null || threadId === undefined) {
    return '';
  }
  return String(threadId);
};

const computeTotalUnread = (unreadByThread: UnreadMap) =>
  Object.values(unreadByThread).reduce((sum, value) => sum + Math.max(0, value), 0);

const sessionOwnsThread = (thread: Thread, sessionUserId: number | null) => {
  if (!sessionUserId) {
    return true;
  }
  if (!Array.isArray(thread.members)) {
    return true;
  }
  return thread.members.some((member) => {
    const memberId =
      typeof member?.user?.id === 'number'
        ? member.user.id
        : typeof (member as any)?.user_id === 'number'
          ? (member as any)?.user_id
          : undefined;
    return memberId != null && String(memberId) === String(sessionUserId);
  });
};

const filterThreadsForSession = (threads: Thread[], sessionUserId: number | null) =>
  threads.filter((thread) => sessionOwnsThread(thread, sessionUserId));

const buildThreadSnapshot = (
  threads: Thread[],
  sessionUserId: number | null,
  fallbackUnread?: UnreadMap,
) => {
  const scopedThreads = filterThreadsForSession(threads, sessionUserId);
  const normalized = scopedThreads.map((thread) => {
    const key = String(thread.id);
    const serverUnread =
      typeof thread.unread_count === 'number' ? Math.max(0, thread.unread_count) : undefined;
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
  sessionUserId: null as number | null,
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
  loadThreadMessages: (threadId: string | number) => Promise<void>;
  sendMessage: (threadId: string | number, text: string) => Promise<void>;
  appendMessage: (threadId: string | number, message: Message) => void;
  removeMessage: (threadId: string | number, messageId: string | number) => Promise<void>;
  removeThread: (threadId: string | number) => Promise<void>;
  markThreadRead: (threadId: string | number, options?: { sync?: boolean }) => Promise<void>;
  setActiveThread: (threadId: string | null) => void;
  setSessionUserId: (userId: number | null) => void;
  recomputeTotalUnread: () => void;
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
    const activeThreadId = state.activeThreadId === threadKey ? null : state.activeThreadId;
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
    const nextMessages = existingMessages.filter((message) => String(message.id) !== messageKey);
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
      typeof thread.unread_count === 'number' ? Math.max(0, thread.unread_count) : undefined;
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
      set((state) => {
        const current = state.messagesByThread[key];
        const { merged, changed } = mergeMessagesChronologically(current, messages);
        if (!changed && current === merged) {
          return state;
        }
        return {
          messagesByThread: {
            ...state.messagesByThread,
            [key]: merged,
          },
        };
      });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : 'Unable to load messages.' });
    } finally {
      set({ isLoadingMessages: false });
    }
  },
  async sendMessage(threadId, text) {
    if (!text.trim()) {
      return;
    }
    try {
      const message = await messagingApi.sendMessage(threadId, text.trim());
      get().appendMessage(threadId, message);
    } catch (error) {
      const detail = error instanceof Error ? error.message : 'Unable to send message.';
      set({ error: detail });
      throw error;
    }
  },
  appendMessage(threadId, message) {
    const key = normalizeThreadId(threadId ?? message.thread);
    if (!key) {
      return;
    }
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      console.debug('messagingStore: appendMessage', { threadId: key, messageId: message.id });
    }
    const state = get();
    const threadFromState = state.threads.find((thread) => String(thread.id) === key);
    const isActiveThread = state.activeThreadId === key;
    if (!threadFromState && !isActiveThread) {
      if (state.sessionUserId != null) {
        get()
          .syncThreads()
          .catch(() => undefined);
      }
      return;
    }
    const existingMessages = state.messagesByThread[key];
    const alreadyExists = existingMessages?.some((item) => item.id === message.id);
    let messagesByThread = state.messagesByThread;
    if (!alreadyExists) {
      const nextMessages = sortMessagesChronologically([...(existingMessages ?? []), message]);
      messagesByThread = {
        ...messagesByThread,
        [key]: nextMessages,
      };
    }

    const sessionUserId = state.sessionUserId;
    const isOwnMessage =
      sessionUserId != null &&
      message.sender?.id != null &&
      String(message.sender.id) === String(sessionUserId);
    const currentUnread = state.unreadByThread[key] ?? 0;
    let unreadByThread = state.unreadByThread;
    let unreadChanged = false;
    let nextUnread = currentUnread;

    if (isOwnMessage || isActiveThread) {
      if (currentUnread !== 0) {
        nextUnread = 0;
        unreadByThread = { ...unreadByThread, [key]: 0 };
        unreadChanged = true;
      }
    } else if (!alreadyExists) {
      nextUnread = currentUnread + 1;
      unreadByThread = { ...unreadByThread, [key]: nextUnread };
      unreadChanged = true;
    }

    let threads = state.threads;
    const targetIndex = threads.findIndex((thread) => String(thread.id) === key);
    if (targetIndex !== -1) {
      const thread = threads[targetIndex];
      const needsUpdate =
        thread.last_message?.body !== message.body ||
        thread.last_message?.created_at !== message.created_at ||
        thread.updated_at !== message.created_at ||
        (thread.unread_count ?? 0) !== nextUnread;
      if (needsUpdate) {
        const nextThreads = [...threads];
        nextThreads[targetIndex] = {
          ...thread,
          last_message: {
            body: message.body,
            created_at: message.created_at,
          },
          updated_at: message.created_at,
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
      console.debug('messagingStore: markThreadRead', { threadId: key, sync: options?.sync !== false });
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
  setSessionUserId(userId) {
    const current = get().sessionUserId;
    if (current === userId) {
      return;
    }
    if (userId == null) {
      set({ ...initialState });
      return;
    }
    if (current != null && current !== userId) {
      set({ ...initialState, sessionUserId: userId });
      return;
    }
    set({ sessionUserId: userId });
  },
  recomputeTotalUnread() {
    set((state) => ({
      totalUnread: computeTotalUnread(state.unreadByThread),
    }));
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
