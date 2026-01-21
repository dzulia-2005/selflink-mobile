import { apiClient } from '@api/client';
import { normalizeCoinApiError, NormalizedCoinError } from '@api/coin';

export type IapPlatform = 'ios' | 'android';

export type VerifyIapRequest = {
  platform: IapPlatform;
  product_id: string;
  transaction_id: string;
  receipt?: string;
  purchase_token?: string;
};

export type VerifyIapResponse = {
  received: boolean;
  provider: string;
  provider_event_id: string;
  coin_event_id: number;
  balance_cents: number;
  currency: string;
};

export async function verifyIapPurchase(
  payload: VerifyIapRequest,
): Promise<VerifyIapResponse> {
  const { data } = await apiClient.post<VerifyIapResponse>(
    '/payments/iap/verify/',
    payload,
  );
  return data;
}

export const normalizeIapApiError = (
  error: unknown,
  fallbackMessage = 'Unable to verify purchase.',
): NormalizedCoinError => normalizeCoinApiError(error, fallbackMessage);
