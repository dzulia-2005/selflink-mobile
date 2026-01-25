import { useCallback, useState } from 'react';

import type { GiftType } from '@api/gifts';
import type { GiftPreview } from '@utils/gifts';

type GiftLike = GiftType | GiftPreview;

type GiftBurstState = {
  gift: GiftLike;
  key: number;
} | null;

export function useGiftBurst() {
  const [burst, setBurst] = useState<GiftBurstState>(null);

  const triggerGiftBurst = useCallback((gift: GiftLike) => {
    setBurst({ gift, key: Date.now() });
  }, []);

  const clearGiftBurst = useCallback(() => {
    setBurst(null);
  }, []);

  return {
    burst,
    triggerGiftBurst,
    clearGiftBurst,
  };
}
