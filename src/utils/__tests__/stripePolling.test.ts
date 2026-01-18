import { shouldCompleteStripePolling } from '@utils/stripePolling';

describe('stripe polling helpers', () => {
  it('completes when balance increases over baseline', () => {
    expect(shouldCompleteStripePolling(1000, 200, 1100)).toBe(true);
  });

  it('ignores interim balance dips before mint', () => {
    expect(shouldCompleteStripePolling(1000, 100, 900)).toBe(false);
    expect(shouldCompleteStripePolling(1000, 100, 1000)).toBe(false);
    expect(shouldCompleteStripePolling(1000, 100, 1001)).toBe(true);
  });
});
