export type CoinSpendReference = {
  value: string;
  label: string;
};

export const COIN_SPEND_REFERENCES: CoinSpendReference[] = [
  { value: 'product:test', label: 'Product: Test' },
  { value: 'product:tip', label: 'Product: Tip' },
  { value: 'product:boost:profile', label: 'Product: Boost Profile' },
];
