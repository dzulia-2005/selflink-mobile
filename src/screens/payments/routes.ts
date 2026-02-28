export const PAYMENTS_DOMAIN_KEY = 'payments' as const;
export const PAYMENTS_ENABLED_BY_DEFAULT = true;

export const PAYMENTS_STACK_ROUTES = ['Payments', 'WalletLedger'] as const;
export const PAYMENTS_TAB_ROUTES = [] as const;

export type PaymentsStackRouteName = (typeof PAYMENTS_STACK_ROUTES)[number];
