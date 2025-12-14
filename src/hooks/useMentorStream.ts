import { useCallback, useEffect, useRef, useState } from 'react';
import EventSource from 'react-native-event-source';

import { callMentorChat, buildMentorStreamUrl } from '@services/api/mentor';
import { useAuthStore } from '@store/authStore';

type MentorStreamOptions = {
  mode?: string;
  language?: string;
};

type MentorStreamState = {
  isStreaming: boolean;
  error: string | null;
  replyText: string;
  sessionId: number | null;
};

type MentorStreamControls = {
  startStream: (message: string) => void;
  reset: () => void;
};

type MentorStreamPayload =
  | { event: 'start'; session_id?: number; mode?: string }
  | { event: 'token'; delta?: string }
  | { event: 'end'; session_id?: number }
  | { event: 'error'; detail?: string };

type StreamMessageEvent = {
  data?: string;
};

const DEFAULT_MODE = 'default';
const DEFAULT_LANGUAGE = 'en';
const STREAM_TIMEOUT_MS = 12000;

const parsePayload = (raw: string): MentorStreamPayload | null => {
  try {
    return JSON.parse(raw) as MentorStreamPayload;
  } catch {
    return null;
  }
};

/**
 * Streaming hook for Mentor replies.
 * Connects to the backend SSE endpoint (/mentor/stream/) and streams tokens in real time.
 * Falls back to the non-streaming mentor chat endpoint if SSE is unavailable.
 */
export function useMentorStream(
  options?: MentorStreamOptions,
): MentorStreamState & MentorStreamControls {
  const accessToken = useAuthStore((state) => state.accessToken);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [sessionId, setSessionId] = useState<number | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const fallbackUsedRef = useRef(false);
  const pendingMessageRef = useRef<string | null>(null);
  const streamTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const localStreamTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearStreamTimeout = useCallback(() => {
    if (streamTimeoutRef.current) {
      clearTimeout(streamTimeoutRef.current);
      streamTimeoutRef.current = null;
    }
  }, []);

  const closeStream = useCallback(() => {
    const source = eventSourceRef.current as unknown as { close?: () => void } | null;
    try {
      if (source?.close) {
        source.close();
      }
    } catch (err) {
      if (__DEV__) {
        console.debug('[useMentorStream] closeStream error', err);
      }
    } finally {
      eventSourceRef.current = null;
      clearStreamTimeout();
    }
  }, [clearStreamTimeout]);

  const stopLocalStream = useCallback(() => {
    if (localStreamTimerRef.current) {
      clearInterval(localStreamTimerRef.current);
      localStreamTimerRef.current = null;
    }
  }, []);

  const playLocalStream = useCallback(
    (full: string, speedMs = 20, chunkSize = 3) => {
      stopLocalStream();
      setReplyText('');
      if (!full) {
        setIsStreaming(false);
        return;
      }

      setIsStreaming(true);
      let index = 0;

      localStreamTimerRef.current = setInterval(() => {
        index += chunkSize;
        const next = full.slice(0, index);
        setReplyText(next);

        if (index >= full.length) {
          stopLocalStream();
          setIsStreaming(false);
        }
      }, speedMs);
    },
    [stopLocalStream],
  );

  const reset = useCallback(() => {
    closeStream();
    stopLocalStream();
    fallbackUsedRef.current = false;
    pendingMessageRef.current = null;
    setError(null);
    setReplyText('');
    setSessionId(null);
    setIsStreaming(false);
  }, [closeStream, stopLocalStream]);

  const fallbackToHttp = useCallback(
    async (message: string, mode: string, language: string) => {
      fallbackUsedRef.current = true;
      clearStreamTimeout();
      if (__DEV__) {
        console.debug('[useMentorStream] Falling back to POST /mentor/chat/');
      }
      try {
        const response = await callMentorChat({ mode, language, message });
        const reply = response.reply ?? '';
        const sid = response.sessionId ?? (response as any).session_id ?? null;
        setSessionId(sid);
        playLocalStream(reply);
        if (reply.trim()) {
          setError(null);
        }
      } catch (fallbackError) {
        stopLocalStream();
        setIsStreaming(false);
        const fallbackMessage =
          fallbackError instanceof Error && fallbackError.message
            ? fallbackError.message
            : 'Mentor is temporarily unavailable. Please try again.';
        setError(fallbackMessage);
      }
    },
    [clearStreamTimeout, playLocalStream, stopLocalStream],
  );

  const startStream = useCallback(
    (message: string) => {
      const trimmed = message.trim();
      if (!trimmed || isStreaming) {
        return;
      }

      reset();
      const mode = options?.mode ?? DEFAULT_MODE;
      const language = options?.language ?? DEFAULT_LANGUAGE;

      setIsStreaming(true);
      pendingMessageRef.current = trimmed;

      const streamUrl = buildMentorStreamUrl({
        mode,
        language,
        message: trimmed,
      });

      if (__DEV__) {
        console.debug('[useMentorStream] Opening stream', streamUrl);
      }

      const handleFailure = (detail?: string) => {
        if (__DEV__) {
          console.debug('[useMentorStream] SSE error, switching to POST', detail);
        }
        clearStreamTimeout();
        closeStream();
        if (!fallbackUsedRef.current) {
          fallbackToHttp(trimmed, mode, language).catch(() => undefined);
          return;
        }
        setError(detail ?? 'Stream connection error.');
        setIsStreaming(false);
      };

      const handlePayload = (raw: string) => {
        const payload = parsePayload(raw);
        if (!payload?.event) {
          return;
        }
        switch (payload.event) {
          case 'start':
            if (typeof payload.session_id === 'number') {
              setSessionId(payload.session_id);
            }
            clearStreamTimeout();
            break;
          case 'token':
            if (typeof payload.delta === 'string') {
              setReplyText((current) => current + payload.delta);
            }
            clearStreamTimeout();
            break;
          case 'end':
            if (typeof payload.session_id === 'number') {
              setSessionId(payload.session_id);
            }
            clearStreamTimeout();
            setIsStreaming(false);
            closeStream();
            break;
          case 'error': {
            const detail =
              typeof payload.detail === 'string'
                ? payload.detail
                : 'Stream error. Using fallback.';
            handleFailure(detail);
            break;
          }
          default:
            break;
        }
      };

      try {
        const headers =
          accessToken && accessToken.length > 0
            ? { Authorization: `Bearer ${accessToken}` }
            : undefined;
        const source = new EventSource(streamUrl, { headers }) as EventSource & {
          onopen?: () => void;
        };
        eventSourceRef.current = source;

        streamTimeoutRef.current = setTimeout(() => {
          handleFailure('Stream timeout. Using fallback.');
        }, STREAM_TIMEOUT_MS);

        (source as any).onopen = () => {
          if (__DEV__) {
            console.debug('[useMentorStream] SSE opened');
          }
        };

        source.onmessage = (event: StreamMessageEvent) => {
          if (!event.data) {
            return;
          }
          const payload = parsePayload(event.data);
          if (payload?.event) {
            handlePayload(event.data);
            return;
          }
          const token = (payload as any)?.token || (payload as any)?.delta;
          const done = (payload as any)?.done === true;
          const session_id = (payload as any)?.session_id;
          if (typeof session_id === 'number') {
            setSessionId(session_id);
          }
          if (typeof token === 'string') {
            setReplyText((current) => current + token);
          }
          if (done) {
            setIsStreaming(false);
            closeStream();
          }
          clearStreamTimeout();
        };

        source.onerror = (event: any) => {
          const status = event?.status ?? event?.target?._xhr?.status;
          const detail = status ? `status ${status}` : undefined;
          handleFailure(detail ?? 'Stream connection error.');
        };
      } catch {
        handleFailure('Unable to open stream. Using fallback.');
      }
    },
    [
      accessToken,
      closeStream,
      fallbackToHttp,
      isStreaming,
      clearStreamTimeout,
      options?.language,
      options?.mode,
      reset,
    ],
  );

  useEffect(() => {
    return () => {
      closeStream();
      clearStreamTimeout();
      stopLocalStream();
    };
  }, [clearStreamTimeout, closeStream, stopLocalStream]);

  return {
    isStreaming,
    error,
    replyText,
    sessionId,
    startStream,
    reset,
  };
}
