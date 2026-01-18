import { shouldCompleteStripePolling } from '@utils/stripePolling';
import type { StripeLedgerEntry } from '@utils/stripePolling';

describe('stripe polling helpers', () => {
  const startedAtMs = Date.parse('2024-03-01T00:00:00Z');
  const ctx = {
    reference: 'stripe_ref_123',
    expectedAmountCents: 200,
    startedAtMs,
  };

  const makeEntry = (overrides: Partial<StripeLedgerEntry> = {}): StripeLedgerEntry => ({
    event_type: 'mint',
    amount_cents: 200,
    direction: 'CREDIT',
    occurred_at: '2024-03-01T00:01:00Z',
    created_at: '2024-03-01T00:01:00Z',
    event_metadata: {},
    metadata: {},
    ...overrides,
  });

  it('completes when mint entry matches the checkout reference', () => {
    const entries = [
      makeEntry({ event_metadata: { reference: 'stripe_ref_123', provider: 'stripe' } }),
    ];
    expect(shouldCompleteStripePolling(ctx, entries)).toBe(true);
  });

  it('does not complete on unrelated transfer credits', () => {
    const entries = [
      makeEntry({
        event_type: 'transfer',
        amount_cents: 100,
        event_metadata: { to_user_id: 42 },
      }),
    ];
    expect(shouldCompleteStripePolling(ctx, entries)).toBe(false);
  });

  it('does not complete on other mints without a matching reference', () => {
    const entries = [
      makeEntry({
        amount_cents: 500,
        event_metadata: { reference: 'stripe_ref_other', provider: 'stripe' },
      }),
    ];
    expect(shouldCompleteStripePolling(ctx, entries)).toBe(false);
  });

  it('completes on a mint after start with the expected amount when reference is absent', () => {
    const entries = [
      makeEntry({
        event_metadata: { provider: 'stripe' },
        occurred_at: '2024-03-01T00:02:00Z',
      }),
    ];
    expect(shouldCompleteStripePolling(ctx, entries)).toBe(true);
  });

  it('ignores mints that occurred before checkout start', () => {
    const entries = [
      makeEntry({
        event_metadata: { provider: 'stripe' },
        occurred_at: '2024-02-28T23:59:00Z',
        created_at: '2024-02-28T23:59:00Z',
      }),
    ];
    expect(shouldCompleteStripePolling(ctx, entries)).toBe(false);
  });
});
