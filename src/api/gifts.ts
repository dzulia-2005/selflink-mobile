import { apiClient } from '@api/client';
import { normalizeCoinApiError, NormalizedCoinError } from '@api/coin';

export type GiftType = {
  id: number;
  key?: string;
  slug?: string;
  name: string;
  kind?: 'static' | 'animated' | string;
  media_url?: string | null;
  animation_url?: string | null;
  effects?: {
    version?: number;
    effects?: Array<Record<string, unknown>>;
    persist?: {
      mode?: string;
      window_seconds?: number;
    };
    [key: string]: unknown;
  };
  price_slc_cents?: number;
  is_active?: boolean;
  [key: string]: unknown;
};

export type GiftSendResponse = Record<string, unknown>;

export async function listGiftTypes(): Promise<GiftType[]> {
  const { data } = await apiClient.get<unknown>('/payments/gifts/');
  if (Array.isArray(data)) {
    return (data as GiftType[]).filter((gift) => gift.is_active !== false);
  }
  if (data && typeof data === 'object' && Array.isArray((data as any).results)) {
    const results = (data as { results: GiftType[] }).results ?? [];
    return results.filter((gift) => gift.is_active !== false);
  }
  return [];
}

type SendGiftPayload = {
  gift_type_id: number;
  quantity: number;
  note?: string;
};

export async function sendPostGift(
  postId: string | number,
  payload: SendGiftPayload,
  idempotencyKey: string,
): Promise<GiftSendResponse> {
  const { data } = await apiClient.post<GiftSendResponse>(
    `/posts/${postId}/gifts/`,
    payload,
    { headers: { 'Idempotency-Key': idempotencyKey } },
  );
  return data;
}

export async function sendCommentGift(
  commentId: string | number,
  payload: SendGiftPayload,
  idempotencyKey: string,
): Promise<GiftSendResponse> {
  const { data } = await apiClient.post<GiftSendResponse>(
    `/comments/${commentId}/gifts/`,
    payload,
    { headers: { 'Idempotency-Key': idempotencyKey } },
  );
  return data;
}

export const normalizeGiftApiError = (
  error: unknown,
  fallbackMessage = 'Unable to send gift.',
): NormalizedCoinError => {
  const normalized = normalizeCoinApiError(error, fallbackMessage);
  const code = normalized.code;
  let message = normalized.message;

  if (code === 'insufficient_funds') {
    message = 'Not enough SLC.';
  } else if (code === 'gift_inactive' || code === 'invalid_gift_type') {
    message = 'Gift not available.';
  } else if (code === 'invalid_quantity') {
    message = 'Invalid quantity.';
  } else if (code === 'idempotency_conflict') {
    message = 'This gift request is already being processed.';
  }

  return {
    ...normalized,
    message,
  };
};
