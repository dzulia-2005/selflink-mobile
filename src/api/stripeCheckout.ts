import { apiClient } from '@api/client';
import { normalizeCoinApiError, NormalizedCoinError } from '@api/coin';

export type StripeCheckoutRequest = {
  amountCents: number;
  currency: string;
};

export type StripeCheckoutResponse = {
  checkout_id: number;
  reference: string;
  amount_cents: number;
  currency: string;
  status: string;
  payment_url: string;
};

export async function createStripeCheckout(
  payload: StripeCheckoutRequest,
): Promise<StripeCheckoutResponse> {
  const { data } = await apiClient.post<StripeCheckoutResponse>(
    '/payments/stripe/checkout/',
    {
      amount_cents: payload.amountCents,
      currency: payload.currency,
    },
  );
  return data;
}

export const normalizeStripeApiError = (
  error: unknown,
  fallbackMessage = 'Unable to start Stripe checkout.',
): NormalizedCoinError => normalizeCoinApiError(error, fallbackMessage);
