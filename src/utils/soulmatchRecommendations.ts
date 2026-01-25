import type {
  SoulmatchExplanation,
  SoulmatchResult,
  SoulmatchTimingWindow,
} from '@schemas/soulmatch';
import type { SoulmatchRecommendationsMeta, SoulmatchRecommendationsRaw } from '@services/api/soulmatch';

type SoulmatchResultLike = Partial<SoulmatchResult> & {
  user?: Partial<SoulmatchResult['user']> | null;
  user_id?: number | null;
  reason?: string | null;
  explanation_short?: string | null;
};

export type SoulmatchNormalizationStats = {
  missing_user: number;
  missing_user_id: number;
  missing_score: number;
  duplicate: number;
};

export type SoulmatchNormalizationResult = {
  items: SoulmatchResult[];
  dropped: SoulmatchNormalizationStats;
};

export type SoulmatchNormalizedResponse = {
  results: SoulmatchResult[];
  meta?: SoulmatchRecommendationsMeta;
  dropped: SoulmatchNormalizationStats;
};

const buildFallbackHandle = (userId: number, name?: string | null) => {
  if (name) {
    const compact = name.replace(/\s+/g, '').toLowerCase();
    if (compact) {
      return compact;
    }
  }
  return `user${userId}`;
};

const toTimingWindow = (raw: unknown): SoulmatchTimingWindow | undefined => {
  if (!raw || typeof raw !== 'object') {
    return undefined;
  }
  const record = raw as Record<string, unknown>;
  return {
    starts_at: typeof record.starts_at === 'string' ? record.starts_at : undefined,
    ends_at: typeof record.ends_at === 'string' ? record.ends_at : undefined,
    label: typeof record.label === 'string' ? record.label : undefined,
  };
};

const toExplanation = (entry: SoulmatchResultLike): SoulmatchExplanation | undefined => {
  if (entry.explanation && typeof entry.explanation === 'object') {
    const record = entry.explanation as Record<string, unknown>;
    const short = typeof record.short === 'string' ? record.short : undefined;
    const full = typeof record.full === 'string' ? record.full : undefined;
    const strategy = typeof record.strategy === 'string' ? record.strategy : undefined;
    if (short || full || strategy) {
      return { short, full, strategy };
    }
  }
  const fallbackShort =
    typeof entry.reason === 'string'
      ? entry.reason
      : typeof entry.explanation_short === 'string'
        ? entry.explanation_short
        : undefined;
  if (fallbackShort) {
    return { short: fallbackShort };
  }
  return undefined;
};

const normalizeLensLabel = (entry: SoulmatchResultLike): string | undefined => {
  const rawLabel = typeof entry.lens_label === 'string' ? entry.lens_label : undefined;
  if (rawLabel) {
    return rawLabel;
  }
  const rawLens = typeof entry.lens === 'string' ? entry.lens : undefined;
  if (!rawLens) {
    return undefined;
  }
  return rawLens
    .split('_')
    .map((segment) => (segment ? segment[0].toUpperCase() + segment.slice(1) : segment))
    .join(' ');
};

export const normalizeSoulmatchRecommendations = (
  results: SoulmatchResultLike[],
): SoulmatchNormalizationResult => {
  const normalized: SoulmatchResult[] = [];
  const seen = new Set<number>();
  const dropped: SoulmatchNormalizationStats = {
    missing_user: 0,
    missing_user_id: 0,
    missing_score: 0,
    duplicate: 0,
  };

  results.forEach((entry) => {
    const rawUser = entry.user ?? null;
    if (!rawUser) {
      dropped.missing_user += 1;
      return;
    }
    const userId = rawUser.id ?? entry.user_id;
    if (typeof userId !== 'number') {
      dropped.missing_user_id += 1;
      return;
    }
    if (seen.has(userId)) {
      dropped.duplicate += 1;
      return;
    }
    const score = entry.score;
    if (typeof score !== 'number' || Number.isNaN(score)) {
      dropped.missing_score += 1;
      return;
    }

    const safeName = rawUser.name ?? rawUser.handle ?? `User ${userId}`;
    const safeHandle = rawUser.handle ?? buildFallbackHandle(userId, rawUser.name ?? null);
    const explanation = toExplanation(entry);
    const lensLabel = normalizeLensLabel(entry);
    const lensReasonShort =
      typeof entry.lens_reason_short === 'string'
        ? entry.lens_reason_short
        : explanation?.short;

    normalized.push({
      user: {
        id: userId,
        name: safeName,
        handle: safeHandle,
        photo: rawUser.photo ?? null,
      },
      user_id: entry.user_id ?? userId,
      score,
      components: entry.components ?? {},
      tags: Array.isArray(entry.tags) ? entry.tags : [],
      mentor_text: entry.mentor_text,
      lens: typeof entry.lens === 'string' ? entry.lens : undefined,
      lens_label: lensLabel,
      lens_reason_short: lensReasonShort,
      timing_score: typeof entry.timing_score === 'number' ? entry.timing_score : undefined,
      timing_summary:
        typeof entry.timing_summary === 'string' ? entry.timing_summary : undefined,
      timing_window: toTimingWindow(entry.timing_window),
      compatibility_trend:
        typeof entry.compatibility_trend === 'string'
          ? entry.compatibility_trend
          : undefined,
      explanation_level: entry.explanation_level,
      explanation,
    });
    seen.add(userId);
  });

  return { items: normalized, dropped };
};

export const normalizeSoulmatchRecsResponse = (
  raw: SoulmatchRecommendationsRaw,
): SoulmatchNormalizedResponse => {
  if (Array.isArray(raw)) {
    const normalized = normalizeSoulmatchRecommendations(raw as SoulmatchResultLike[]);
    return { results: normalized.items, dropped: normalized.dropped };
  }
  if (raw && typeof raw === 'object') {
    const record = raw as { results?: SoulmatchResultLike[]; meta?: SoulmatchRecommendationsMeta };
    const normalized = normalizeSoulmatchRecommendations(record.results ?? []);
    return { results: normalized.items, meta: record.meta, dropped: normalized.dropped };
  }
  return {
    results: [],
    dropped: { missing_user: 0, missing_user_id: 0, missing_score: 0, duplicate: 0 },
  };
};
