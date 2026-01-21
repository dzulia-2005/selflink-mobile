import { shouldCompleteIapPolling } from '@utils/iapPolling';
import type { IapLedgerEntry } from '@utils/iapPolling';

describe('iap polling helpers', () => {
  const startedAtMs = Date.parse('2024-03-01T00:00:00Z');
  const ctx = {
    platform: 'ios' as const,
    productId: 'com.selflink.slc.499',
    transactionId: 'tx_123',
    startedAtMs,
    providerEventId: 'tx_123',
    coinEventId: 500,
  };

  const makeEntry = (overrides: Partial<IapLedgerEntry> = {}): IapLedgerEntry => ({
    event_id: 500,
    event_type: 'mint',
    amount_cents: 499,
    direction: 'CREDIT',
    occurred_at: '2024-03-01T00:01:00Z',
    created_at: '2024-03-01T00:01:00Z',
    event_metadata: {
      provider: 'apple_iap',
      external_id: 'tx_123',
      product_id: 'com.selflink.slc.499',
    },
    metadata: {},
    ...overrides,
  });

  it('completes when coin event id matches', () => {
    const entries = [makeEntry({ event_id: 500 })];
    expect(shouldCompleteIapPolling(ctx, entries)).toBe(true);
  });

  it('completes when external id matches', () => {
    const entries = [makeEntry({ event_id: 999, event_metadata: { external_id: 'tx_123' } })];
    expect(shouldCompleteIapPolling(ctx, entries)).toBe(true);
  });

  it('does not complete on unrelated transfers', () => {
    const entries = [
      makeEntry({ event_type: 'transfer', event_metadata: { to_user_id: 42 } }),
    ];
    expect(shouldCompleteIapPolling(ctx, entries)).toBe(false);
  });

  it('falls back to product id + timestamp', () => {
    const entries = [
      makeEntry({
        event_id: 999,
        event_metadata: { provider: 'apple_iap', product_id: 'com.selflink.slc.499' },
        occurred_at: '2024-03-01T00:02:00Z',
      }),
    ];
    expect(shouldCompleteIapPolling(ctx, entries)).toBe(true);
  });

  it('ignores events before the purchase start', () => {
    const entries = [
      makeEntry({
        event_id: 999,
        occurred_at: '2024-02-28T23:59:00Z',
        created_at: '2024-02-28T23:59:00Z',
      }),
    ];
    expect(shouldCompleteIapPolling(ctx, entries)).toBe(false);
  });
});
