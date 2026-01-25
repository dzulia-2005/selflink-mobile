import type { GiftType } from '@api/gifts';
import type { GiftPreview } from '@utils/gifts';

export type GiftThemeTier = 'standard' | 'premium' | 'legendary';

type GiftLike = GiftType | GiftPreview;

const getGiftPrice = (gift: GiftLike) => {
  const value = (gift as GiftType).price_slc_cents;
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
};

export const getGiftThemeTier = (gift: GiftLike): GiftThemeTier => {
  const price = getGiftPrice(gift);
  if (price >= 5000) {
    return 'legendary';
  }
  if (price >= 1500) {
    return 'premium';
  }
  return 'standard';
};
