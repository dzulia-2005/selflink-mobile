import type { SoulmatchExplainLevel } from '@schemas/soulmatch';

export type SoulmatchTier = 'free' | 'premium' | 'premium_plus';

export const FREE_RECOMMENDATION_LIMIT = 5;

const TIER_ORDER: Record<SoulmatchTier, number> = {
  free: 0,
  premium: 1,
  premium_plus: 2,
};

export const requiredTierForExplain = (level: SoulmatchExplainLevel): SoulmatchTier => {
  if (level === 'premium_plus') {
    return 'premium_plus';
  }
  if (level === 'premium') {
    return 'premium';
  }
  return 'free';
};

export const isTierLocked = (targetTier: SoulmatchTier, currentTier: SoulmatchTier) =>
  TIER_ORDER[currentTier] < TIER_ORDER[targetTier];

export const isExplainLevelLocked = (
  level: SoulmatchExplainLevel,
  currentTier: SoulmatchTier,
) => isTierLocked(requiredTierForExplain(level), currentTier);

export const shouldGateRecommendationIndex = (
  index: number,
  currentTier: SoulmatchTier,
) => currentTier === 'free' && index >= FREE_RECOMMENDATION_LIMIT;

export type SoulmatchLockedSection = 'full' | 'strategy' | 'timing';

const SECTION_TIER: Record<SoulmatchLockedSection, SoulmatchTier> = {
  full: 'premium',
  timing: 'premium',
  strategy: 'premium_plus',
};

export const isSectionLocked = (
  section: SoulmatchLockedSection,
  currentTier: SoulmatchTier,
) => isTierLocked(SECTION_TIER[section], currentTier);
