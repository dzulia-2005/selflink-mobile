import { env } from '@config/env';

const BACKEND_BASE = env.backendUrl.replace(/\/$/, '');

export function normalizeAvatarUrl(value?: string | null) {
  if (!value) {
    return undefined;
  }
  if (/^https?:\/\//i.test(value)) {
    return value;
  }
  if (!BACKEND_BASE) {
    return value;
  }
  if (value.startsWith('/')) {
    return `${BACKEND_BASE}${value}`;
  }
  return `${BACKEND_BASE}/${value}`;
}
