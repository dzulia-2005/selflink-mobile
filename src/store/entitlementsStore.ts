import { create } from 'zustand';

import * as usersApi from '@api/users';
import type { EntitlementsResponse } from '@api/users';

export type EntitlementsStore = {
  entitlements: EntitlementsResponse | null;
  isLoading: boolean;
  error: string | null;
  fetchEntitlements: () => Promise<void>;
  setEntitlements: (entitlements: EntitlementsResponse | null) => void;
  reset: () => void;
};

export const selectTierFromEntitlements = (
  entitlements: EntitlementsResponse | null,
): 'free' | 'premium' | 'premium_plus' => {
  if (entitlements?.premium_plus?.active) {
    return 'premium_plus';
  }
  if (entitlements?.premium?.active) {
    return 'premium';
  }
  return 'free';
};

export const useEntitlementsStore = create<EntitlementsStore>((set) => ({
  entitlements: null,
  isLoading: false,
  error: null,
  async fetchEntitlements() {
    set({ isLoading: true, error: null });
    try {
      const entitlements = await usersApi.getEntitlements();
      set({ entitlements, isLoading: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to load entitlements.';
      set({ error: message, isLoading: false });
      throw error;
    }
  },
  setEntitlements(entitlements) {
    set({ entitlements });
  },
  reset() {
    set({ entitlements: null, error: null, isLoading: false });
  },
}));
