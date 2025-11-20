import { apiClient } from '@services/api/client';
import { ProfileSettings } from '@schemas/profile';

export async function fetchProfileSettings(): Promise<ProfileSettings> {
  return apiClient.request<ProfileSettings>('/api/v1/profile/me/', { method: 'GET' });
}

export async function updateProfileSettings(
  payload: ProfileSettings,
): Promise<ProfileSettings> {
  return apiClient.request<ProfileSettings>('/api/v1/profile/me/', {
    method: 'PATCH',
    body: payload,
  });
}
