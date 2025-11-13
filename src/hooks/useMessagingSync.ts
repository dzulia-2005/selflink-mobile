import { useCallback, useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';

import * as messagingApi from '@api/messaging';
import type { Message } from '@schemas/messaging';
import { connectRealtime, RealtimePayload } from '@realtime/index';
import { useAuthStore } from '@store/authStore';
import { useMessagingStore } from '@store/messagingStore';

type MessageEnvelope = RealtimePayload & {
  type?: string;
  message?: Message;
  message_id?: number;
  thread_id?: number | string;
  thread?: number | string;
  payload?: Record<string, unknown> & {
    message?: Message;
    message_id?: number;
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

  const connectionRef = useRef<ReturnType<typeof connectRealtime> | null>(null);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const realtimeConnectedRef = useRef(false);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const inflightMessages = useRef(new Map<number, Promise<Message | null>>());

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
    syncThreads().catch(() => undefined);
    const { activeThreadId: activeIdFromStore, loadThreadMessages } = useMessagingStore.getState();
    if (!activeIdFromStore) {
      return;
    }
    loadThreadMessages(activeIdFromStore).catch((error) => {
      console.warn('messagingSync: failed to refresh active thread messages', error);
    });
  }, [syncThreads]);

  const ensurePolling = useCallback(() => {
    const shouldPoll = enabled && appStateRef.current === 'active' && !realtimeConnectedRef.current;
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

  const fetchMessageDetails = useCallback((messageId?: number) => {
    if (!messageId) {
      return Promise.resolve<Message | null>(null);
    }
    const existing = inflightMessages.current.get(messageId);
    if (existing) {
      return existing;
    }
    const request = messagingApi
      .getMessage(messageId)
      .catch((error) => {
        console.warn('useMessagingSync: failed to fetch message', error);
        return null;
      })
      .finally(() => {
        inflightMessages.current.delete(messageId);
      });
    inflightMessages.current.set(messageId, request);
    return request;
  }, []);

  const normalizeEnvelope = useCallback((payload: MessageEnvelope): MessageEnvelope => {
    if (!payload || typeof payload !== 'object') {
      return payload;
    }
    if (payload.payload && typeof payload.payload === 'object') {
      const nested = payload.payload;
      return {
        ...payload,
        ...nested,
        message: (nested.message as Message | undefined) ?? payload.message,
        message_id: (nested.message_id as number | undefined) ?? payload.message_id,
        thread_id:
          typeof nested.thread_id !== 'undefined'
            ? (nested.thread_id as number | string)
            : typeof nested.thread !== 'undefined'
              ? (nested.thread as number | string)
              : payload.thread_id ?? payload.thread,
      };
    }
    return payload;
  }, []);

  const handleRealtimeMessage = useCallback(
    async (rawPayload: MessageEnvelope) => {
      const payload = normalizeEnvelope(rawPayload);
      const directMessage = payload.message;
      let nextMessage: Message | null = null;
      if (directMessage?.sender) {
        nextMessage = directMessage;
      } else if (payload.message_id) {
        nextMessage = await fetchMessageDetails(payload.message_id);
      }

      if (!nextMessage) {
        await syncThreads();
        if (activeThreadId) {
          const { loadThreadMessages } = useMessagingStore.getState();
          await loadThreadMessages(activeThreadId);
        }
        return;
      }

      appendMessage(nextMessage.thread, nextMessage);
    },
    [activeThreadId, appendMessage, fetchMessageDetails, normalizeEnvelope, syncThreads],
  );

  const handleRealtimePayload = useCallback(
    (payload: RealtimePayload) => {
      const type = typeof payload === 'object' ? (payload.type as string | undefined) : undefined;
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
        // no-op for now
      }
    },
    [ensurePolling, handleRealtimeMessage, stopPolling],
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
  }, [enabled, ensurePolling, handleRealtimePayload, pollThreadsAndActiveMessages, resetMessaging, stopPolling, token]);
}
