import { env } from '@config/env';

const BACKEND_BASE = env.backendUrl.replace(/\/$/, '');

export function resolveBackendUrl(value?: string | null): string | undefined {
  if (!value) {
    return undefined;
  }
  if (/^https?:\/\//i.test(value)) {
    return value;
  }
  if (value.startsWith('/')) {
    return `${BACKEND_BASE}${value}`;
  }
  if (!BACKEND_BASE) {
    return value;
  }
  return `${BACKEND_BASE}/${value}`;
}
