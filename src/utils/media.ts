import type { MediaAsset } from '@types/social';

import { resolveBackendUrl } from './backendUrl';

type MediaLike = Pick<MediaAsset, 's3_key' | 'meta'> & {
  url?: string | null;
};

const pickMetaUrl = (value: MediaLike['meta']): string | undefined => {
  if (!value) {
    return undefined;
  }
  if (typeof value === 'string' && value.length > 0) {
    return value;
  }
  if (typeof value !== 'object') {
    return undefined;
  }
  if ('url' in value && typeof value.url === 'string' && value.url.length > 0) {
    return value.url;
  }
  if ('urls' in value && value.urls && typeof value.urls === 'object') {
    const urls = value.urls as Record<string, unknown>;
    const knownKeys = ['full', 'large', 'default', 'medium', 'small', 'preview'];
    for (const key of knownKeys) {
      const candidate = urls[key];
      if (typeof candidate === 'string' && candidate.length > 0) {
        return candidate;
      }
    }
  }
  return undefined;
};

export function resolveMediaUrl(media?: MediaLike | null): string | undefined {
  if (!media) {
    return undefined;
  }
  const candidate = media.url ?? pickMetaUrl(media.meta) ?? media.s3_key;
  return resolveBackendUrl(candidate);
}
