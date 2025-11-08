import { useCallback, useEffect, useMemo, useState } from 'react';

import { useToast } from '@context/ToastContext';
import {
  GiftType,
  Plan,
  Subscription,
  listGiftTypes,
  listPlans,
  listSubscriptions,
} from '@services/api/payments';

type CatalogState = {
  gifts: GiftType[];
  plans: Plan[];
  subscriptions: Subscription[];
};

const initialState: CatalogState = {
  gifts: [],
  plans: [],
  subscriptions: [],
};

export function usePaymentsCatalog() {
  const toast = useToast();
  const [state, setState] = useState<CatalogState>(initialState);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchCatalog = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      try {
        const [giftsRes, plansRes, subscriptionsRes] = await Promise.all([
          listGiftTypes({ page_size: 20 }),
          listPlans({ page_size: 10 }),
          listSubscriptions({ page_size: 5 }),
        ]);
        setState({
          gifts: giftsRes.results,
          plans: plansRes.results,
          subscriptions: subscriptionsRes.results,
        });
      } catch (error) {
        console.warn('usePaymentsCatalog: failed to load catalog', error);
        toast.push({
          tone: 'error',
          message: 'Unable to load payments data. Please try again.',
        });
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [toast],
  );

  useEffect(() => {
    fetchCatalog(false);
  }, [fetchCatalog]);

  const activeSubscription = useMemo(() => {
    return (
      state.subscriptions.find((sub) => sub.status === 'active') ?? state.subscriptions[0]
    );
  }, [state.subscriptions]);

  return {
    ...state,
    loading,
    refreshing,
    refresh: () => fetchCatalog(true),
    activeSubscription,
  };
}
