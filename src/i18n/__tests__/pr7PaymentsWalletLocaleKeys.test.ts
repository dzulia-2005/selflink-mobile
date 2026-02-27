import en from '@i18n/locales/en.json';
import ka from '@i18n/locales/ka.json';
import ru from '@i18n/locales/ru.json';

function flattenKeys(value: unknown, prefix = ''): string[] {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return [];
  }
  return Object.entries(value as Record<string, unknown>).flatMap(([key, child]) => {
    const current = prefix ? `${prefix}.${key}` : key;
    if (child && typeof child === 'object' && !Array.isArray(child)) {
      return [current, ...flattenKeys(child, current)];
    }
    return [current];
  });
}

describe('PR7 payments/wallet locale key parity', () => {
  it('keeps payments, wallet, and transactions keys aligned across en/ru/ka', () => {
    const enKeys = flattenKeys({
      payments: en.payments,
      wallet: en.wallet,
      transactions: en.transactions,
    });
    const ruKeys = flattenKeys({
      payments: ru.payments,
      wallet: ru.wallet,
      transactions: ru.transactions,
    });
    const kaKeys = flattenKeys({
      payments: ka.payments,
      wallet: ka.wallet,
      transactions: ka.transactions,
    });

    expect(ruKeys).toEqual(enKeys);
    expect(kaKeys).toEqual(enKeys);
    expect(en.wallet?.title).toBe('Wallet');
  });
});
