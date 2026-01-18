import { apiClient } from '@api/client';
import { normalizeCoinApiError, NormalizedCoinError } from '@api/coin';

export type IpayCheckoutRequest = {
  amount_cents: number;
  currency: string;
};

export type IpayCheckoutResponse = {
  checkout_id: number;
  reference: string;
  amount_cents: number;
  currency: string;
  status: string;
};

export async function createIpayCheckout(
  payload: IpayCheckoutRequest,
): Promise<IpayCheckoutResponse> {
  const { data } = await apiClient.post<IpayCheckoutResponse>(
    '/payments/ipay/checkout/',
    payload,
  );
  return data;
}

export const normalizeIpayApiError = (
  error: unknown,
  fallbackMessage = 'Unable to start iPay checkout.',
): NormalizedCoinError => normalizeCoinApiError(error, fallbackMessage);
