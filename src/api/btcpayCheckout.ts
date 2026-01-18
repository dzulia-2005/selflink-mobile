import { apiClient } from '@api/client';
import { normalizeCoinApiError, NormalizedCoinError } from '@api/coin';

export type BtcpayCheckoutRequest = {
  amountCents: number;
  currency: string;
};

export type BtcpayCheckoutResponse = {
  checkout_id: number;
  reference: string;
  amount_cents: number;
  currency: string;
  status: string;
  payment_url: string;
};

export async function createBtcpayCheckout(
  payload: BtcpayCheckoutRequest,
): Promise<BtcpayCheckoutResponse> {
  const { data } = await apiClient.post<BtcpayCheckoutResponse>(
    '/payments/btcpay/checkout/',
    {
      amount_cents: payload.amountCents,
      currency: payload.currency,
    },
  );
  return data;
}

export const normalizeBtcpayApiError = (
  error: unknown,
  fallbackMessage = 'Unable to start BTCPay checkout.',
): NormalizedCoinError => normalizeCoinApiError(error, fallbackMessage);
