import { normalizeAssetUrl } from '@utils/urls';

export type GiftPreview = {
  id?: number | string;
  name?: string;
  mediaUrl?: string | null;
  artUrl?: string | null;
  animationUrl?: string | null;
  kind?: string;
  quantity?: number;
};

export type GiftRenderData = {
  recent: GiftPreview[];
  counts: Record<string, number>;
  totalCount: number;
  hasData: boolean;
};

const toNumber = (value: unknown) => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

const normalizeCounts = (raw: unknown): Record<string, number> => {
  if (!raw) {
    return {};
  }
  if (Array.isArray(raw)) {
    return raw.reduce<Record<string, number>>((acc, item) => {
      if (!item || typeof item !== 'object') {
        return acc;
      }
      const record = item as Record<string, unknown>;
      const key =
        (typeof record.gift_type_id === 'number' && String(record.gift_type_id)) ||
        (typeof record.id === 'number' && String(record.id)) ||
        (typeof record.key === 'string' && record.key) ||
        (typeof record.slug === 'string' && record.slug) ||
        '';
      if (!key) {
        return acc;
      }
      const count =
        toNumber(record.count) || toNumber(record.quantity) || toNumber(record.total);
      if (count > 0) {
        acc[key] = count;
      }
      return acc;
    }, {});
  }
  if (typeof raw === 'object') {
    return Object.entries(raw as Record<string, unknown>).reduce<Record<string, number>>(
      (acc, [key, value]) => {
        const count = toNumber(value);
        if (count > 0) {
          acc[key] = count;
        }
        return acc;
      },
      {},
    );
  }
  return {};
};

const normalizeRecent = (raw: unknown): GiftPreview[] => {
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw
    .map((item) => {
      if (!item || typeof item !== 'object') {
        return null;
      }
      const record = item as Record<string, unknown>;
      const giftType = record.gift_type as Record<string, unknown> | undefined;
      const id = record.gift_type_id ?? record.gift_type ?? giftType?.id ?? record.id;
      const name =
        (typeof record.name === 'string' && record.name) ||
        (typeof giftType?.name === 'string' && giftType.name) ||
        undefined;
      const mediaUrl =
        normalizeAssetUrl(
          (typeof record.media_url === 'string' && record.media_url) ||
            (typeof giftType?.media_url === 'string' && giftType.media_url) ||
            (typeof record.art_url === 'string' && record.art_url) ||
            (typeof giftType?.art_url === 'string' && giftType.art_url) ||
            '',
        ) || null;
      const artUrl =
        normalizeAssetUrl(
          (typeof record.art_url === 'string' && record.art_url) ||
            (typeof giftType?.art_url === 'string' && giftType.art_url) ||
            '',
        ) || null;
      const animationUrl =
        normalizeAssetUrl(
          (typeof record.animation_url === 'string' && record.animation_url) ||
            (typeof giftType?.animation_url === 'string' && giftType.animation_url) ||
            '',
        ) || null;
      const kind =
        (typeof record.kind === 'string' && record.kind) ||
        (typeof giftType?.kind === 'string' && giftType.kind) ||
        undefined;
      const quantity = toNumber(record.quantity) || toNumber(record.count) || undefined;
      return {
        id: typeof id === 'string' || typeof id === 'number' ? id : undefined,
        name,
        mediaUrl,
        artUrl,
        animationUrl,
        kind,
        quantity,
      };
    })
    .filter(Boolean) as GiftPreview[];
};

export function normalizeGiftRenderData(raw: unknown): GiftRenderData {
  if (!raw || typeof raw !== 'object') {
    return { recent: [], counts: {}, totalCount: 0, hasData: false };
  }
  const record = raw as Record<string, unknown>;
  const counts = normalizeCounts(
    record.gift_summary ?? record.gift_counts ?? record.gifts_summary,
  );
  const recent = normalizeRecent(record.recent_gifts ?? record.gifts ?? []);
  const totalCount =
    Object.values(counts).reduce((sum, value) => sum + value, 0) ||
    recent.reduce((sum, item) => sum + (item.quantity ?? 0), 0);
  return {
    recent,
    counts,
    totalCount,
    hasData: totalCount > 0 || recent.length > 0,
  };
}
