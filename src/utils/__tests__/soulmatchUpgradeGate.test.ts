import {
  FREE_RECOMMENDATION_LIMIT,
  isExplainLevelLocked,
  isSectionLocked,
  isTierLocked,
  requiredTierForExplain,
  shouldGateRecommendationIndex,
} from '@utils/soulmatchUpgradeGate';

describe('soulmatchUpgradeGate', () => {
  it('maps explain level to required tier', () => {
    expect(requiredTierForExplain('free')).toBe('free');
    expect(requiredTierForExplain('premium')).toBe('premium');
    expect(requiredTierForExplain('premium_plus')).toBe('premium_plus');
  });

  it('locks tiers correctly', () => {
    expect(isTierLocked('premium', 'free')).toBe(true);
    expect(isTierLocked('premium', 'premium')).toBe(false);
    expect(isTierLocked('premium_plus', 'premium')).toBe(true);
  });

  it('locks explain levels correctly', () => {
    expect(isExplainLevelLocked('premium', 'free')).toBe(true);
    expect(isExplainLevelLocked('premium_plus', 'premium_plus')).toBe(false);
  });

  it('gates recommendation index for free tier', () => {
    expect(shouldGateRecommendationIndex(FREE_RECOMMENDATION_LIMIT - 1, 'free')).toBe(
      false,
    );
    expect(shouldGateRecommendationIndex(FREE_RECOMMENDATION_LIMIT, 'free')).toBe(true);
    expect(shouldGateRecommendationIndex(FREE_RECOMMENDATION_LIMIT, 'premium')).toBe(
      false,
    );
  });

  it('locks sections by tier', () => {
    expect(isSectionLocked('full', 'free')).toBe(true);
    expect(isSectionLocked('strategy', 'premium')).toBe(true);
    expect(isSectionLocked('timing', 'premium')).toBe(false);
  });
});
