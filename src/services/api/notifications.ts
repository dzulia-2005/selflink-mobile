import { apiClient } from '@services/api/client';

export type Notification = {
  id: number;
  type: string;
  payload: Record<string, unknown> | string;
  is_read: boolean;
  created_at: string;
  read_at: string | null;
};

export type NotificationListResponse = {
  next: string | null;
  previous: string | null;
  results: Notification[];
};

export type NotificationQuery = {
  cursor?: string;
  ordering?: string;
  page_size?: number;
  search?: string;
};

export type NotificationPayload = {
  type: string;
  payload?: Record<string, unknown> | string;
  is_read?: boolean;
};

export type NotificationPartialPayload = Partial<NotificationPayload>;

export async function listNotifications(
  params: NotificationQuery = {},
): Promise<NotificationListResponse> {
  const searchParams = new URLSearchParams();
  if (params.cursor) searchParams.set('cursor', params.cursor);
  if (params.ordering) searchParams.set('ordering', params.ordering);
  if (params.page_size) searchParams.set('page_size', String(params.page_size));
  if (params.search) searchParams.set('search', params.search);

  const qs = searchParams.toString();
  const path = `/api/v1/notifications/${qs ? `?${qs}` : ''}`;
  return apiClient.request<NotificationListResponse>(path, { method: 'GET' });
}

export async function createNotification(payload: NotificationPayload): Promise<Notification> {
  return apiClient.request<Notification>('/api/v1/notifications/', {
    method: 'POST',
    body: payload,
  });
}

export async function getNotification(id: number): Promise<Notification> {
  return apiClient.request<Notification>(`/api/v1/notifications/${id}/`, { method: 'GET' });
}

export async function updateNotification(
  id: number,
  payload: NotificationPayload,
): Promise<Notification> {
  return apiClient.request<Notification>(`/api/v1/notifications/${id}/`, {
    method: 'PUT',
    body: payload,
  });
}

export async function patchNotification(
  id: number,
  payload: NotificationPartialPayload,
): Promise<Notification> {
  return apiClient.request<Notification>(`/api/v1/notifications/${id}/`, {
    method: 'PATCH',
    body: payload,
  });
}

export async function deleteNotification(id: number): Promise<void> {
  await apiClient.request(`/api/v1/notifications/${id}/`, { method: 'DELETE' });
}

export async function markAllNotificationsRead(): Promise<void> {
  await apiClient.request('/api/v1/notifications/mark-all-read/', { method: 'POST' });
}
