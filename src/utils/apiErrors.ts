type ParsedApiError = {
  status?: number;
  message: string;
  code?: string;
  rawBody?: unknown;
};

const extractDetailMessage = (payload: unknown): string | null => {
  if (!payload) {
    return null;
  }
  if (typeof payload === 'string') {
    return payload;
  }
  if (typeof payload !== 'object') {
    return null;
  }
  const record = payload as Record<string, unknown>;
  if (typeof record.detail === 'string') {
    return record.detail;
  }
  for (const value of Object.values(record)) {
    if (typeof value === 'string') {
      return value;
    }
    if (Array.isArray(value) && typeof value[0] === 'string') {
      return value[0];
    }
  }
  return null;
};

export const parseApiError = (error: unknown): ParsedApiError => {
  if (error instanceof Error) {
    const match = error.message.match(/Request failed \((\d+)\):\s*(.*)$/);
    if (match) {
      const status = Number(match[1]);
      const rawBody = match[2];
      let parsedBody: unknown = rawBody;
      try {
        parsedBody = rawBody ? JSON.parse(rawBody) : rawBody;
      } catch {
        parsedBody = rawBody;
      }
      const message = extractDetailMessage(parsedBody) || rawBody || error.message;
      const code =
        typeof parsedBody === 'object' && parsedBody
          ? (parsedBody as { code?: string }).code
          : undefined;
      return { message, status, code, rawBody: parsedBody };
    }
    return { message: error.message };
  }
  return { message: 'Unexpected error' };
};

export const normalizeApiError = (
  error: unknown,
  fallbackMessage: string,
): ParsedApiError => {
  const parsed = parseApiError(error);
  let message = parsed.message || fallbackMessage;

  if (parsed.status === 401 || parsed.status === 403) {
    message = 'Please sign in to continue.';
  } else if (parsed.status === 429) {
    message = 'Too many requests; try again in a moment.';
  } else if (!parsed.status && /network|failed to fetch/i.test(message)) {
    message = 'Unable to reach the server. Please try again.';
  }

  return { ...parsed, message };
};
