export const AUTH_ERROR_MESSAGE_RE = /expired\s*token|unauthorized/i;

type ErrorLike = {
  response?: { status?: number };
  status?: number;
  message?: string;
  detail?: string;
  reason?: string;
};

export const isAuthExpiredError = (error: unknown): boolean => {
  if (!error) {
    return false;
  }
  if (typeof error === 'string') {
    return AUTH_ERROR_MESSAGE_RE.test(error);
  }
  if (typeof error === 'object') {
    const candidate = error as ErrorLike & Record<string, unknown>;
    const status = candidate.response?.status ?? candidate.status;
    if (status === 401) {
      return true;
    }
    const messageParts = [
      candidate.message,
      candidate.detail,
      candidate.reason,
      typeof candidate === 'object' && 'error' in candidate
        ? String((candidate as any).error)
        : undefined,
    ]
      .filter(Boolean)
      .join(' ');
    if (messageParts && AUTH_ERROR_MESSAGE_RE.test(messageParts)) {
      return true;
    }
  }
  return false;
};
