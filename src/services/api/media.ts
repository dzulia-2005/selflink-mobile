import { apiClient } from '@services/api/client';

export type MediaItem = {
  id: number;
  s3_key: string;
  mime: string;
  width: number;
  height: number;
  duration: number;
  status: string;
  checksum?: string;
  meta: Record<string, unknown> | string;
  created_at: string;
};

export type MediaListResponse = {
  next: string | null;
  previous: string | null;
  results: MediaItem[];
};

export type MediaQuery = {
  cursor?: string;
  ordering?: string;
  page_size?: number;
  search?: string;
};

export type MediaPayload = {
  s3_key: string;
  mime: string;
  width: number;
  height: number;
  duration?: number;
  meta?: Record<string, unknown> | string;
};

export type MediaPartialPayload = Partial<MediaPayload>;

export async function listMedia(params: MediaQuery = {}): Promise<MediaListResponse> {
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
  const path = `/api/v1/media/${qs ? `?${qs}` : ''}`;
  return apiClient.request<MediaListResponse>(path, { method: 'GET' });
}

export async function createMedia(payload: MediaPayload): Promise<MediaItem> {
  return apiClient.request<MediaItem>('/api/v1/media/', {
    method: 'POST',
    body: payload,
  });
}

export async function getMedia(id: number): Promise<MediaItem> {
  return apiClient.request<MediaItem>(`/api/v1/media/${id}/`, { method: 'GET' });
}

export async function updateMedia(id: number, payload: MediaPayload): Promise<MediaItem> {
  return apiClient.request<MediaItem>(`/api/v1/media/${id}/`, {
    method: 'PUT',
    body: payload,
  });
}

export async function patchMedia(
  id: number,
  payload: MediaPartialPayload,
): Promise<MediaItem> {
  return apiClient.request<MediaItem>(`/api/v1/media/${id}/`, {
    method: 'PATCH',
    body: payload,
  });
}

export async function deleteMedia(id: number): Promise<void> {
  await apiClient.request(`/api/v1/media/${id}/`, {
    method: 'DELETE',
  });
}
