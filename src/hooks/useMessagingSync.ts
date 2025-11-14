import { useCallback, useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';

import * as messagingApi from '@api/messaging';
import { connectRealtime, RealtimePayload } from '@realtime/index';
import type { Message } from '@schemas/messaging';
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

const POLL_INTERVAL_MS = 12_000;

export function useMessagingSync(enabled: boolean) {
  const token = useAuthStore((state) => state.accessToken);
  const currentUserId = useAuthStore((state) => state.currentUser?.id ?? null);
  const appendMessage = useMessagingStore((state) => state.appendMessage);
  const syncThreads = useMessagingStore((state) => state.syncThreads);
  const setSessionUserId = useMessagingStore((state) => state.setSessionUserId);
  const resetMessaging = useMessagingStore((state) => state.reset);
  const activeThreadId = useMessagingStore((state) => state.activeThreadId);
  const setMessagesForThread = useMessagingStore((state) => state.setMessagesForThread);
  const setTypingStatus = useMessagingStore((state) => state.setTypingStatus);
  const activeThreadIdRef = useRef<string | null>(activeThreadId);
  useEffect(() => {
    activeThreadIdRef.current = activeThreadId;
  }, [activeThreadId]);

  const connectionRef = useRef<ReturnType<typeof connectRealtime> | null>(null);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const realtimeConnectedRef = useRef(false);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  useEffect(() => {
    setSessionUserId(currentUserId);
  }, [currentUserId, setSessionUserId]);

  const stopPolling = useCallback(() => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
      if (typeof __DEV__ !== 'undefined' && __DEV__) {
        console.debug('messagingSync: stop polling');
      }
    }
  }, []);

  const pollThreadsAndActiveMessages = useCallback(() => {
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      console.log('messagingSync: polling threads');
    }
    syncThreads().catch((error) => {
      console.warn('messagingSync: failed to sync threads', error);
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
    messagingApi
      .getThreadMessages(activeIdFromStore)
      .then((messages) => {
        setMessagesForThread(activeIdFromStore, messages);
      })
      .catch((error) => {
        console.warn('messagingSync: failed to refresh active thread messages', error);
      });
  }, [setMessagesForThread, syncThreads]);

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
    },
    [
      appendMessage,
      extractThreadId,
      normalizeEnvelope,
      normalizeIncomingMessage,
      syncThreads,
    ],
  );

  const handleRealtimePayload = useCallback(
    (payload: RealtimePayload) => {
      const type =
        typeof payload === 'object' ? (payload.type as string | undefined) : undefined;
      if (type === 'status') {
        const status = (payload as any).status;
        if (status === 'open') {
          realtimeConnectedRef.current = true;
          stopPolling();
        } else if (status === 'closed') {
          realtimeConnectedRef.current = false;
          ensurePolling();
        } else if (status === 'connecting') {
          realtimeConnectedRef.current = false;
          ensurePolling();
        }
        return;
      }
      if (type && MESSAGE_EVENT_TYPES.has(type)) {
        handleRealtimeMessage(payload as MessageEnvelope).catch(() => undefined);
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
    [ensurePolling, handleRealtimeMessage, setTypingStatus, stopPolling],
  );

  useEffect(() => {
    if (!enabled || !token) {
      connectionRef.current?.disconnect();
      connectionRef.current = null;
      realtimeConnectedRef.current = false;
      stopPolling();
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
    token,
  ]);
}
