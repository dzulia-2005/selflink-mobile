import { serviceApiClient as apiClient } from '@api/client';

type Device = {
  id: number;
  device_type: string;
  push_token: string;
  last_seen: string;
  created_at: string;
};

type DevicesResponse = {
  next: string | null;
  previous: string | null;
  results: Device[];
};

type DeviceQuery = {
  cursor?: string;
  ordering?: string;
  page_size?: number;
  search?: string;
};

export async function fetchDevices(params: DeviceQuery = {}): Promise<DevicesResponse> {
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
  const path = `/devices/${qs ? `?${qs}` : ''}`;
  return apiClient.request<DevicesResponse>(path, { method: 'GET' });
}

type DevicePayload = {
  device_type: string;
  push_token: string;
  last_seen?: string;
};

export async function createDevice(payload: DevicePayload): Promise<Device> {
  return apiClient.request<Device>('/devices/', {
    method: 'POST',
    body: payload,
  });
}

export async function fetchDevice(id: number): Promise<Device> {
  return apiClient.request<Device>(`/devices/${id}/`, {
    method: 'GET',
  });
}

export async function updateDevice(id: number, payload: DevicePayload): Promise<Device> {
  return apiClient.request<Device>(`/devices/${id}/`, {
    method: 'PUT',
    body: payload,
  });
}

export async function patchDevice(
  id: number,
  payload: Partial<DevicePayload>,
): Promise<Device> {
  return apiClient.request<Device>(`/devices/${id}/`, {
    method: 'PATCH',
    body: payload,
  });
}

export async function deleteDevice(id: number): Promise<void> {
  await apiClient.request(`/devices/${id}/`, {
    method: 'DELETE',
  });
}
