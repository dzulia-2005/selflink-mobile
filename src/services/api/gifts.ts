import { serviceApiClient as apiClient } from '@api/client';

export type Gift = {
  id: number;
  sender: number;
  receiver: number;
  gift_type: number;
  payload: string;
  created_at: string;
};

export type GiftsResponse = {
  next: string | null;
  previous: string | null;
  results: Gift[];
};

export type GiftsQuery = {
  cursor?: string;
  ordering?: string;
  page_size?: number;
  search?: string;
};

export async function fetchGifts(params: GiftsQuery = {}): Promise<GiftsResponse> {
  const searchParams = new URLSearchParams();
  if (params.cursor) {
    searchParams.set('cursor', params.cursor);
  }
  if (params.ordering) {
    searchParams.set('ordering', params.ordering);
  }
  if (params.page_size) {
    searchParams.set('page_size', String(params.page_size));
  }
  if (params.search) {
    searchParams.set('search', params.search);
  }

  const qs = searchParams.toString();
  const path = `/gifts/${qs ? `?${qs}` : ''}`;
  return apiClient.request<GiftsResponse>(path, { method: 'GET' });
}

export type GiftPayload = {
  sender: number;
  receiver: number;
  gift_type: number;
  payload: string;
};

export async function createGift(payload: GiftPayload): Promise<Gift> {
  return apiClient.request<Gift>('/gifts/', {
    method: 'POST',
    body: payload,
  });
}

export async function fetchGift(id: number): Promise<Gift> {
  return apiClient.request<Gift>(`/gifts/${id}/`, {
    method: 'GET',
  });
}

export async function updateGift(id: number, payload: GiftPayload): Promise<Gift> {
  return apiClient.request<Gift>(`/gifts/${id}/`, {
    method: 'PUT',
    body: payload,
  });
}

export async function patchGift(
  id: number,
  payload: Partial<GiftPayload>,
): Promise<Gift> {
  return apiClient.request<Gift>(`/gifts/${id}/`, {
    method: 'PATCH',
    body: payload,
  });
}

export async function deleteGift(id: number): Promise<void> {
  await apiClient.request(`/gifts/${id}/`, {
    method: 'DELETE',
  });
}
