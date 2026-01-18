import { shouldCompleteBtcpayPolling } from '@utils/btcpayPolling';
import type { BtcpayLedgerEntry } from '@utils/btcpayPolling';

describe('btcpay polling helpers', () => {
  const startedAtMs = Date.parse('2024-03-10T12:00:00Z');
  const ctx = {
    reference: 'btcpay_ref_123',
    expectedAmountCents: 1500,
    startedAtMs,
  };

  const makeEntry = (overrides: Partial<BtcpayLedgerEntry> = {}): BtcpayLedgerEntry => ({
    event_type: 'mint',
    amount_cents: 1500,
    direction: 'CREDIT',
    occurred_at: '2024-03-10T12:01:00Z',
    created_at: '2024-03-10T12:01:00Z',
    event_metadata: {},
    metadata: {},
    ...overrides,
  });

  it('completes when mint entry matches the checkout reference', () => {
    const entries = [
      makeEntry({ event_metadata: { reference: 'btcpay_ref_123', provider: 'btcpay' } }),
    ];
    expect(shouldCompleteBtcpayPolling(ctx, entries)).toBe(true);
  });

  it('does not complete on unrelated transfers', () => {
    const entries = [
      makeEntry({
        event_type: 'transfer',
        amount_cents: 200,
        event_metadata: { to_user_id: 7 },
      }),
    ];
    expect(shouldCompleteBtcpayPolling(ctx, entries)).toBe(false);
  });

  it('does not complete on other mints without a matching reference', () => {
    const entries = [
      makeEntry({
        amount_cents: 500,
        event_metadata: { reference: 'btcpay_ref_other', provider: 'btcpay' },
      }),
    ];
    expect(shouldCompleteBtcpayPolling(ctx, entries)).toBe(false);
  });

  it('completes on a mint after start with expected amount when reference is absent', () => {
    const entries = [
      makeEntry({
        event_metadata: { provider: 'btcpay' },
        occurred_at: '2024-03-10T12:02:00Z',
      }),
    ];
    expect(shouldCompleteBtcpayPolling(ctx, entries)).toBe(true);
  });

  it('ignores mints that occurred before checkout start', () => {
    const entries = [
      makeEntry({
        event_metadata: { provider: 'btcpay' },
        occurred_at: '2024-03-10T11:59:00Z',
        created_at: '2024-03-10T11:59:00Z',
      }),
    ];
    expect(shouldCompleteBtcpayPolling(ctx, entries)).toBe(false);
  });
});
