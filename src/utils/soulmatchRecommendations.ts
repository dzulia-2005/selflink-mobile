import type { SoulmatchResult } from '@schemas/soulmatch';

type SoulmatchResultLike = Partial<SoulmatchResult> & {
  user?: Partial<SoulmatchResult['user']> | null;
  user_id?: number | null;
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

const buildFallbackHandle = (userId: number, name?: string | null) => {
  if (name) {
    const compact = name.replace(/\s+/g, '').toLowerCase();
    if (compact) {
      return compact;
    }
  }
  return `user${userId}`;
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
    });
    seen.add(userId);
  });

  return { items: normalized, dropped };
};
