import type { MediaAsset } from '@schemas/social';

import { resolveBackendUrl } from './backendUrl';
import { resolveMediaUrl } from './media';

export type Attachment = {
  key: string;
  uri: string;
  aspectRatio?: number;
};

type BuildOptions = {
  media?: MediaAsset[] | null;
  legacySources?: unknown[];
};

export function buildAttachments({
  media,
  legacySources = [],
}: BuildOptions): Attachment[] {
  const attachments: Attachment[] = [];

  if (Array.isArray(media) && media.length > 0) {
    attachments.push(
      ...(media
        .map((item, index) => {
          const uri = resolveMediaUrl(item);
          if (!uri) {
            return null;
          }
          const aspectRatio =
            item.width && item.height && item.width > 0 && item.height > 0
              ? item.width / item.height
              : undefined;
          return {
            key: String(item.id ?? item.s3_key ?? index),
            uri,
            aspectRatio,
          };
        })
        .filter(Boolean) as Attachment[]),
    );
  }

  legacySources
    .flatMap((source, index) => collectLegacyImages(source, String(index)))
    .forEach((legacy) => attachments.push(legacy));

  return dedupeAttachments(attachments);
}

export function collectLegacyImages(source: unknown, prefix = 'legacy'): Attachment[] {
  const urls = collectLegacyImageUrls(source);
  return urls.map((uri, index) => ({
    key: `${prefix}-${index}-${uri}`,
    uri,
  }));
}

const collectLegacyImageUrls = (value: unknown): string[] => {
  if (!value) {
    return [];
  }
  if (typeof value === 'string' && value.length > 0) {
    const resolved = resolveBackendUrl(value);
    return [resolved ?? value];
  }
  if (Array.isArray(value)) {
    return value.flatMap((item) => collectLegacyImageUrls(item));
  }
  if (typeof value === 'object') {
    const direct = extractDirectUrl(value as Record<string, unknown>);
    if (direct) {
      const resolved = resolveBackendUrl(direct);
      return [resolved ?? direct];
    }
    const nestedKeys = ['results', 'data', 'items', 'edges', 'nodes', 'images', 'photos'];
    for (const key of nestedKeys) {
      if (key in (value as Record<string, unknown>)) {
        const nestedValue = (value as Record<string, unknown>)[key];
        const nested = collectLegacyImageUrls(nestedValue);
        if (nested.length) {
          return nested;
        }
      }
    }
  }
  return [];
};

const extractDirectUrl = (value: Record<string, unknown>): string | undefined => {
  const candidates = ['url', 'uri', 'image', 'image_url', 'src', 'source'];
  for (const key of candidates) {
    const candidate = value[key];
    if (typeof candidate === 'string' && candidate.length > 0) {
      return candidate;
    }
  }
  if ('node' in value && value.node && typeof value.node === 'object') {
    return extractDirectUrl(value.node as Record<string, unknown>);
  }
  if ('full' in value && typeof value.full === 'string') {
    return value.full;
  }
  if ('default' in value && typeof value.default === 'string') {
    return value.default;
  }
  return undefined;
};

const dedupeAttachments = (attachments: Attachment[]): Attachment[] => {
  if (attachments.length <= 1) {
    return attachments;
  }
  const seen = new Set<string>();
  return attachments.filter((attachment) => {
    if (seen.has(attachment.uri)) {
      return false;
    }
    seen.add(attachment.uri);
    return true;
  });
};
