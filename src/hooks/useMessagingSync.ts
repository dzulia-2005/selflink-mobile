import { useCallback, useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';

import * as messagingApi from '@api/messaging';
import { forceLogout } from '@auth/forceLogout';
import { connectRealtime, RealtimePayload } from '@realtime/index';
import type { Message, MessageStatus } from '@schemas/messaging';
import { useAuthStore } from '@store/authStore';
import { useMessagingStore } from '@store/messagingStore';

const isMessageShape = (value: unknown): value is Message => {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  return 'id' in candidate && 'thread' in candidate && 'body' in candidate;
};

type MessageEnvelope = RealtimePayload & {
  type?: string;
  message?: Message;
  message_id?: number | string;
  thread_id?: number | string;
  thread?: number | string;
  payload?: Record<string, unknown> & {
    message?: Message;
    message_id?: number | string;
    thread_id?: number | string;
    thread?: number | string;
  };
};

const MESSAGE_EVENT_TYPES = new Set(['message', 'message:new']);
const MESSAGE_STATUS_TYPES = new Set(['message:status']);
const MESSAGE_REACTION_TYPES = new Set(['message:reaction']);

const POLL_INTERVAL_MS = 12_000;
const looksLikeNetworkError = (error: unknown) => {
  if (!error || typeof error !== 'object') {
    return false;
  }
  const candidate = error as { response?: unknown; code?: string; message?: string };
  if (candidate.response) {
    return false;
  }
  const code = candidate.code ?? '';
  const message = candidate.message ?? '';
  return (
    code === 'ERR_NETWORK' ||
    code === 'ECONNABORTED' ||
    /network\s?error/i.test(message ?? '') ||
    /timeout/i.test(message ?? '')
  );
};

export function useMessagingSync(enabled: boolean) {
  const token = useAuthStore((state) => state.accessToken);
  const rawCurrentUserId = useAuthStore((state) => state.currentUser?.id ?? null);
  const appendMessage = useMessagingStore((state) => state.appendMessage);
  const syncThreads = useMessagingStore((state) => state.syncThreads);
  const setSessionUserId = useMessagingStore((state) => state.setSessionUserId);
  const resetMessaging = useMessagingStore((state) => state.reset);
  const activeThreadId = useMessagingStore((state) => state.activeThreadId);
  const setMessagesForThread = useMessagingStore((state) => state.setMessagesForThread);
  const setTypingStatus = useMessagingStore((state) => state.setTypingStatus);
  const flushPendingQueue = useMessagingStore((state) => state.flushPendingQueue);
  const hydratePendingQueue = useMessagingStore((state) => state.hydratePendingQueue);
  const setTransportOnline = useMessagingStore((state) => state.setTransportOnline);
  const applyMessageStatus = useMessagingStore((state) => state.applyMessageStatus);
  const applyReaction = useMessagingStore((state) => state.applyReaction);
  const activeThreadIdRef = useRef<string | null>(activeThreadId);
  useEffect(() => {
    activeThreadIdRef.current = activeThreadId;
  }, [activeThreadId]);

  const connectionRef = useRef<ReturnType<typeof connectRealtime> | null>(null);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const realtimeConnectedRef = useRef(false);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const deliveredAckedRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    setSessionUserId(rawCurrentUserId == null ? null : String(rawCurrentUserId));
  }, [rawCurrentUserId, setSessionUserId]);

  useEffect(() => {
    if (!enabled) {
      return;
    }
    hydratePendingQueue().catch(() => undefined);
  }, [enabled, hydratePendingQueue]);

  const stopPolling = useCallback(() => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
      if (typeof __DEV__ !== 'undefined' && __DEV__) {
        console.debug('messagingSync: stop polling');
      }
    }
  }, []);

  const ackDelivered = useCallback(
    (messages: Message[]) => {
      const sessionKey = rawCurrentUserId != null ? String(rawCurrentUserId) : null;
      messages.forEach((message) => {
        const senderId =
          message.sender?.id != null ? String(message.sender.id) : undefined;
        const isOwn = senderId && sessionKey ? senderId === sessionKey : false;
        if (isOwn || message.id == null) {
          return;
        }
        const ackKey = String(message.id);
        if (deliveredAckedRef.current.has(ackKey)) {
          return;
        }
        deliveredAckedRef.current.add(ackKey);
        messagingApi.ackMessage(ackKey, 'delivered').catch(() => undefined);
      });
    },
    [rawCurrentUserId],
  );

  const resolveLatestCursor = useCallback((threadId: string | null) => {
    if (!threadId) {
      return null;
    }
    const messages = useMessagingStore.getState().messagesByThread[threadId] ?? [];
    if (!messages.length) {
      return null;
    }
    const latest = messages.reduce((current, candidate) => {
      if (!current) {
        return candidate;
      }
      const currentTime = new Date(current.created_at).valueOf();
      const candidateTime = new Date(candidate.created_at).valueOf();
      return candidateTime > currentTime ? candidate : current;
    });
    if (!latest?.id) {
      return null;
    }
    return String(latest.id);
  }, []);

  const pollThreadsAndActiveMessages = useCallback(() => {
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      console.log('messagingSync: polling threads');
    }
    syncThreads()
      .then(() => {
        setTransportOnline(true);
        flushPendingQueue().catch(() => undefined);
      })
      .catch((error) => {
        console.warn('messagingSync: failed to sync threads', error);
        if (looksLikeNetworkError(error)) {
          setTransportOnline(false);
        }
      });
    const { activeThreadId: activeIdFromStore } = useMessagingStore.getState();
    if (!activeIdFromStore) {
      return;
    }
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      console.log('messagingSync: polling active thread messages', {
        threadId: activeIdFromStore,
      });
    }
    const since = resolveLatestCursor(activeIdFromStore);
    messagingApi
      .syncThreadMessages(activeIdFromStore, since ?? undefined)
      .then((messages) => {
        if (messages.length) {
          setMessagesForThread(activeIdFromStore, messages);
          ackDelivered(messages);
        }
        setTransportOnline(true);
        flushPendingQueue().catch(() => undefined);
      })
      .catch((error) => {
        console.warn('messagingSync: failed to refresh active thread messages', error);
        if (looksLikeNetworkError(error)) {
          setTransportOnline(false);
          return;
        }
        messagingApi
          .getThreadMessages(activeIdFromStore)
          .then((messages) => {
            setMessagesForThread(activeIdFromStore, messages);
            ackDelivered(messages);
          })
          .catch((fallbackError) => {
            console.warn(
              'messagingSync: failed to refresh active thread messages (fallback)',
              fallbackError,
            );
          });
      });
  }, [
    ackDelivered,
    flushPendingQueue,
    resolveLatestCursor,
    setMessagesForThread,
    setTransportOnline,
    syncThreads,
  ]);

  const ensurePolling = useCallback(() => {
    const shouldPoll =
      enabled && appStateRef.current === 'active' && !realtimeConnectedRef.current;
    if (!shouldPoll) {
      stopPolling();
      return;
    }
    if (pollTimerRef.current) {
      return;
    }
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      console.debug('messagingSync: start polling');
    }
    pollThreadsAndActiveMessages();
    pollTimerRef.current = setInterval(() => {
      pollThreadsAndActiveMessages();
    }, POLL_INTERVAL_MS);
  }, [enabled, pollThreadsAndActiveMessages, stopPolling]);

  useEffect(() => {
    const handleAppStateChange = (next: AppStateStatus) => {
      const prev = appStateRef.current;
      appStateRef.current = next;
      if (!enabled) {
        stopPolling();
        return;
      }
      if (next === 'active' && prev !== 'active') {
        pollThreadsAndActiveMessages();
      }
      ensurePolling();
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => {
      subscription.remove();
      stopPolling();
    };
  }, [enabled, ensurePolling, pollThreadsAndActiveMessages, stopPolling]);

  const normalizeEnvelope = useCallback((payload: MessageEnvelope): MessageEnvelope => {
    if (!payload || typeof payload !== 'object') {
      return payload;
    }
    if (payload.payload && typeof payload.payload === 'object') {
      const nested = payload.payload;
      const nestedMessage =
        (nested.message as Message | undefined) ??
        (isMessageShape(nested) ? (nested as Message) : undefined);
      return {
        ...payload,
        ...nested,
        message: nestedMessage ?? payload.message,
        message_id:
          (nested.message_id as number | string | undefined) ?? payload.message_id,
        thread_id:
          typeof nested.thread_id !== 'undefined'
            ? (nested.thread_id as number | string)
            : typeof nested.thread !== 'undefined'
              ? (nested.thread as number | string)
              : (payload.thread_id ?? payload.thread),
      };
    }
    if (!payload.message && isMessageShape(payload)) {
      return {
        ...payload,
        message: payload as Message,
        thread_id:
          payload.thread_id ??
          (typeof (payload as Record<string, unknown>).thread !== 'undefined'
            ? ((payload as Record<string, unknown>).thread as number | string)
            : undefined),
      };
    }
    return payload;
  }, []);

  const extractThreadId = useCallback(
    (payload: MessageEnvelope, message: Message | null) => {
      const candidates: Array<string | number | null | undefined> = [
        message?.thread,
        (payload.payload?.message as Record<string, unknown> | undefined)?.thread as
          | string
          | number
          | undefined,
        payload.thread,
        payload.thread_id,
        payload.payload?.thread,
        payload.payload?.thread_id,
      ];
      for (const candidate of candidates) {
        if (candidate !== null && candidate !== undefined) {
          return String(candidate);
        }
      }
      return null;
    },
    [],
  );

  const normalizeIncomingMessage = useCallback(
    (incoming: Message, threadId: string): Message => {
      const normalizedId = String((incoming as Message & { id: string | number }).id);
      if (incoming.thread === threadId && incoming.id === normalizedId) {
        return incoming;
      }
      return {
        ...incoming,
        id: normalizedId,
        thread: threadId,
      };
    },
    [],
  );

  const handleRealtimeMessage = useCallback(
    async (rawPayload: MessageEnvelope) => {
      const payload = normalizeEnvelope(rawPayload);
      const nextMessage = payload.message ?? null;

      if (!nextMessage) {
        await syncThreads();
        const currentActiveThreadId = activeThreadIdRef.current;
        if (currentActiveThreadId) {
          const { loadThreadMessages } = useMessagingStore.getState();
          await loadThreadMessages(currentActiveThreadId);
        }
        return;
      }

      const resolvedThreadId = extractThreadId(payload, nextMessage);
      if (!resolvedThreadId) {
        if (typeof __DEV__ !== 'undefined' && __DEV__) {
          console.warn('messagingSync: unable to resolve thread for message', {
            payload,
          });
        }
        return;
      }
      const normalizedThreadId = String(resolvedThreadId);
      const messageForStore = normalizeIncomingMessage(nextMessage, normalizedThreadId);
      if (typeof __DEV__ !== 'undefined' && __DEV__) {
        console.debug('messagingSync: message received', {
          thread: normalizedThreadId,
          messageId: messageForStore.id,
        });
      }
      appendMessage(normalizedThreadId, messageForStore);
      ackDelivered([messageForStore]);
    },
    [
      ackDelivered,
      appendMessage,
      extractThreadId,
      normalizeEnvelope,
      normalizeIncomingMessage,
      syncThreads,
    ],
  );

  const handleStatusEvent = useCallback(
    (payload: Record<string, any>) => {
      const status = payload.status as MessageStatus | undefined;
      const messageId =
        payload.message_id ?? payload.id ?? (payload.message as any)?.id ?? null;
      if (!status || !messageId) {
        return;
      }
      const threadHint =
        payload.thread_id ??
        payload.thread ??
        (payload.message as any)?.thread ??
        payload.payload?.thread_id ??
        payload.payload?.thread;
      applyMessageStatus(
        String(messageId),
        status,
        threadHint ? String(threadHint) : null,
      );
    },
    [applyMessageStatus],
  );

  const handleReactionEvent = useCallback(
    (payload: Record<string, any>) => {
      const messageId =
        payload.message_id ?? payload.id ?? (payload.message as any)?.id ?? null;
      const emoji = payload.emoji;
      const action =
        (payload.action as 'added' | 'removed' | undefined) ??
        (payload.removed ? 'removed' : 'added');
      if (!messageId || !emoji || !action) {
        return;
      }
      const threadHint =
        payload.thread_id ??
        payload.thread ??
        (payload.message as any)?.thread ??
        payload.payload?.thread_id ??
        payload.payload?.thread;
      applyReaction({
        messageId: String(messageId),
        emoji: String(emoji),
        action,
        threadId: threadHint ? String(threadHint) : undefined,
        userId:
          payload.user_id ??
          payload.userId ??
          payload.user ??
          (payload.payload as any)?.user_id ??
          null,
        reactions: payload.reactions as Message['reactions'],
      });
    },
    [applyReaction],
  );

  const handleRealtimePayload = useCallback(
    (payload: RealtimePayload) => {
      const type =
        typeof payload === 'object' ? (payload.type as string | undefined) : undefined;
      if (type === 'auth_error') {
        forceLogout('expired').catch(() => undefined);
        return;
      }
      if (type === 'status') {
        const status = (payload as any).status;
        if (status === 'open') {
          realtimeConnectedRef.current = true;
          setTransportOnline(true);
          stopPolling();
          pollThreadsAndActiveMessages();
          flushPendingQueue().catch(() => undefined);
        } else if (status === 'closed') {
          realtimeConnectedRef.current = false;
          setTransportOnline(false);
          ensurePolling();
        } else if (status === 'connecting') {
          realtimeConnectedRef.current = false;
          ensurePolling();
        }
        return;
      }
      if (type && MESSAGE_EVENT_TYPES.has(type)) {
        handleRealtimeMessage(payload as MessageEnvelope).catch(() => undefined);
      } else if (type && MESSAGE_STATUS_TYPES.has(type)) {
        handleStatusEvent(payload as Record<string, any>);
      } else if (type && MESSAGE_REACTION_TYPES.has(type)) {
        handleReactionEvent(payload as Record<string, any>);
      } else if (type === 'typing') {
        const typingPayload = payload as Record<string, any>;
        const threadHint =
          typingPayload.thread_id ??
          typingPayload.thread ??
          typingPayload.payload?.thread_id ??
          typingPayload.payload?.thread;
        if (!threadHint) {
          return;
        }
        const threadKey = String(threadHint);
        const isTyping = Boolean(typingPayload.is_typing);
        const status = isTyping
          ? {
              typing: true,
              userId:
                typingPayload.user_id !== undefined && typingPayload.user_id !== null
                  ? String(typingPayload.user_id)
                  : undefined,
              userName: typingPayload.user_name ?? null,
              userHandle: typingPayload.user_handle ?? null,
            }
          : null;
        setTypingStatus(threadKey, status);
      }
    },
    [
      ensurePolling,
      flushPendingQueue,
      handleReactionEvent,
      handleRealtimeMessage,
      handleStatusEvent,
      pollThreadsAndActiveMessages,
      setTransportOnline,
      setTypingStatus,
      stopPolling,
    ],
  );

  useEffect(() => {
    if (!enabled || !token) {
      connectionRef.current?.disconnect();
      connectionRef.current = null;
      realtimeConnectedRef.current = false;
      stopPolling();
      setTransportOnline(false);
      if (!token) {
        resetMessaging();
      }
      return;
    }
    pollThreadsAndActiveMessages();
    const connection = connectRealtime(token);
    connectionRef.current = connection;
    const unsubscribe = connection.subscribe(handleRealtimePayload);
    ensurePolling();
    return () => {
      unsubscribe();
      connection.disconnect();
      connectionRef.current = null;
      realtimeConnectedRef.current = false;
      stopPolling();
    };
  }, [
    enabled,
    ensurePolling,
    handleRealtimePayload,
    pollThreadsAndActiveMessages,
    resetMessaging,
    stopPolling,
    setTransportOnline,
    token,
  ]);
}
