import { env } from '@config/env';
import { parseJsonPreservingLargeInts } from '@utils/json';

type StatusEvent = {
  type: 'status';
  status: 'connecting' | 'open' | 'closed';
  attempt: number;
};

export type RealtimePayload = StatusEvent | Record<string, unknown>;

type RealtimeHandler = (payload: RealtimePayload) => void;

export interface RealtimeConnection {
  subscribe: (handler: RealtimeHandler) => () => void;
  unsubscribe: (handler?: RealtimeHandler) => void;
  disconnect: () => void;
  isConnected: () => boolean;
}

const MAX_BACKOFF_MS = 30_000;
const BASE_BACKOFF_MS = 1_000;
const PING_INTERVAL_MS = 25_000;
const REALTIME_PATH = '/ws';

const toRealtimeProtocol = (protocol: string) => (protocol === 'https:' ? 'wss:' : 'ws:');

const deriveRealtimeUrlFromBackend = (): string => {
  try {
    const apiUrl = new URL(env.backendUrl);
    const defaultPort =
      apiUrl.port ||
      (apiUrl.protocol === 'https:' ? '443' : apiUrl.protocol === 'http:' ? '80' : '');
    const realtimePort = defaultPort === '8000' ? '8001' : defaultPort;
    apiUrl.protocol = toRealtimeProtocol(apiUrl.protocol);
    apiUrl.port = realtimePort;
    apiUrl.pathname = REALTIME_PATH;
    apiUrl.search = '';
    apiUrl.hash = '';
    return apiUrl.toString();
  } catch {
    const normalized = env.backendUrl.replace(/^http(s)?:\/\//i, (match) =>
      match.toLowerCase().startsWith('https') ? 'wss://' : 'ws://',
    );
    const trimmed = normalized.replace(/\/+$/, '');
    return `${trimmed}${REALTIME_PATH}`;
  }
};

const resolveRealtimeUrl = (override?: string): string => {
  if (override) {
    return override;
  }
  if (env.realtimeUrl) {
    try {
      return new URL(env.realtimeUrl).toString();
    } catch {
      // fall back
    }
  }
  return deriveRealtimeUrlFromBackend();
};

export function connectRealtime(token: string, urlOverride?: string): RealtimeConnection {
  const handlers = new Set<RealtimeHandler>();
  let socket: WebSocket | null = null;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let pingTimer: ReturnType<typeof setInterval> | null = null;
  let shouldReconnect = true;
  let attempt = 0;

  const notify = (payload: RealtimePayload) => {
    handlers.forEach((handler) => {
      try {
        handler(payload);
      } catch (error) {
        console.warn('realtime: handler error', error);
      }
    });
  };

  const cleanupSocket = () => {
    if (pingTimer) {
      clearInterval(pingTimer);
      pingTimer = null;
    }
    if (socket) {
      socket.onopen = null;
      socket.onmessage = null;
      socket.onerror = null;
      socket.onclose = null;
      socket = null;
    }
  };

  const scheduleReconnect = () => {
    if (!shouldReconnect) {
      return;
    }
    const timeout = Math.min(MAX_BACKOFF_MS, BASE_BACKOFF_MS * 2 ** attempt);
    reconnectTimer = setTimeout(() => {
      attempt += 1;
      connect();
    }, timeout);
  };

  const connect = () => {
    if (!shouldReconnect) {
      return;
    }
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    notify({ type: 'status', status: 'connecting', attempt });
    const url = new URL(resolveRealtimeUrl(urlOverride));
    if (token) {
      url.searchParams.set('token', token);
    }
    const urlString = url.toString();
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      console.debug('realtime: connect start', { url: urlString, attempt });
    }
    socket = new WebSocket(urlString);
    let disconnectHandled = false;
    const handleDisconnect = (
      reason: 'closed' | 'error',
      details?: { code?: number; reason?: string; wasClean?: boolean },
    ) => {
      if (disconnectHandled) {
        return;
      }
      disconnectHandled = true;
      notify({ type: 'status', status: 'closed', attempt });
      if (typeof __DEV__ !== 'undefined' && __DEV__) {
        console.debug('realtime: disconnected', { url: urlString, reason, ...details });
      }
      cleanupSocket();
      scheduleReconnect();
    };
    socket.onopen = () => {
      attempt = 0;
      notify({ type: 'status', status: 'open', attempt: 0 });
      if (typeof __DEV__ !== 'undefined' && __DEV__) {
        console.debug('realtime: open', { url: urlString });
      }
      if (pingTimer) {
        clearInterval(pingTimer);
      }
      pingTimer = setInterval(() => {
        if (socket?.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({ type: 'ping' }));
        }
      }, PING_INTERVAL_MS);
    };
    socket.onmessage = (event) => {
      try {
        const payload = parseJsonPreservingLargeInts<RealtimePayload>(event.data);
        if (typeof __DEV__ !== 'undefined' && __DEV__) {
          const type =
            typeof payload === 'object'
              ? (payload.type as string | undefined)
              : undefined;
          if (type && (type === 'message' || type === 'message:new')) {
            const payloadObj = payload as Record<string, unknown>;
            const nested =
              (payloadObj.payload as Record<string, unknown> | undefined) ?? {};
            const message =
              (nested.message as Record<string, unknown> | undefined) ?? nested;
            const threadId =
              payloadObj.thread_id ??
              payloadObj.thread ??
              nested?.thread ??
              nested?.thread_id ??
              message?.thread ??
              message?.thread_id;
            const messageId =
              payloadObj.message_id ??
              payloadObj.id ??
              nested?.message_id ??
              nested?.id ??
              message?.id;
            console.debug('realtime: event received', {
              type,
              thread: threadId,
              messageId,
            });
          }
        }
        notify(payload);
      } catch (error) {
        console.warn('realtime: failed to parse payload', error);
      }
    };
    socket.onerror = (event: Event) => {
      const message =
        event && typeof event === 'object' && 'message' in event
          ? String((event as { message?: string }).message)
          : undefined;
      const code =
        typeof event === 'object' && 'code' in event ? (event as any).code : undefined;
      const reason =
        typeof event === 'object' && 'reason' in event
          ? (event as any).reason
          : undefined;
      const logPayload = {
        url: urlString,
        type: event?.type,
        message,
        code,
        reason,
        raw: event,
      };
      if (typeof __DEV__ !== 'undefined' && __DEV__) {
        console.debug('realtime: error', logPayload);
      } else {
        console.warn('realtime: socket error', logPayload);
      }
      handleDisconnect('error', { code, reason });
    };
    socket.onclose = (event) => {
      handleDisconnect('closed', {
        code: event?.code,
        reason: event?.reason,
        wasClean: event?.wasClean,
      });
    };
  };

  connect();

  return {
    subscribe(handler) {
      handlers.add(handler);
      return () => handlers.delete(handler);
    },
    unsubscribe(handler) {
      if (handler) {
        handlers.delete(handler);
      } else {
        handlers.clear();
      }
    },
    disconnect() {
      shouldReconnect = false;
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
      if (typeof __DEV__ !== 'undefined' && __DEV__) {
        console.debug('realtime: disconnect requested');
      }
      socket?.close();
      cleanupSocket();
    },
    isConnected() {
      return socket?.readyState === WebSocket.OPEN;
    },
  };
}
