import { createIpayPollSession } from '@utils/ipayPolling';

export const createStripePollSession = createIpayPollSession;

export const shouldCompleteStripePolling = (
  baseline: number,
  expectedAmount: number,
  current: number,
) => current >= baseline + expectedAmount;
