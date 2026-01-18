import { createIpayPollSession } from '@utils/ipayPolling';

export const createStripePollSession = createIpayPollSession;

export const shouldCompleteStripePolling = (
  baselineBalance: number,
  _expectedMint: number,
  currentBalance: number,
) => currentBalance > baselineBalance;
