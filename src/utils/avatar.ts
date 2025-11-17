import { resolveBackendUrl } from './backendUrl';

export function normalizeAvatarUrl(value?: string | null) {
  return resolveBackendUrl(value);
}
