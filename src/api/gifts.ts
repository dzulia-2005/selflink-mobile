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
  price_slc_cents?: number;
  is_active?: boolean;
  [key: string]: unknown;
};

export type GiftSendResponse = Record<string, unknown>;

export async function listGiftTypes(): Promise<GiftType[]> {
  const { data } = await apiClient.get<unknown>('/payments/gifts/');
  if (Array.isArray(data)) {
    return data as GiftType[];
  }
  if (data && typeof data === 'object' && Array.isArray((data as any).results)) {
    return (data as { results: GiftType[] }).results ?? [];
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
  idempotencyKey?: string,
): Promise<GiftSendResponse> {
  const { data } = await apiClient.post<GiftSendResponse>(
    `/posts/${postId}/gifts/`,
    payload,
    idempotencyKey ? { headers: { 'Idempotency-Key': idempotencyKey } } : undefined,
  );
  return data;
}

export async function sendCommentGift(
  commentId: string | number,
  payload: SendGiftPayload,
  idempotencyKey?: string,
): Promise<GiftSendResponse> {
  const { data } = await apiClient.post<GiftSendResponse>(
    `/comments/${commentId}/gifts/`,
    payload,
    idempotencyKey ? { headers: { 'Idempotency-Key': idempotencyKey } } : undefined,
  );
  return data;
}

export const normalizeGiftApiError = (
  error: unknown,
  fallbackMessage = 'Unable to send gift.',
): NormalizedCoinError => normalizeCoinApiError(error, fallbackMessage);
