import { ProfileSettings } from '@schemas/profile';
import { apiClient } from '@services/api/client';

export async function fetchProfileSettings(): Promise<ProfileSettings> {
  return apiClient.request<ProfileSettings>('/profile/me/', { method: 'GET' });
}

export async function updateProfileSettings(
  payload: ProfileSettings,
): Promise<ProfileSettings> {
  return apiClient.request<ProfileSettings>('/profile/me/', {
    method: 'PATCH',
    body: payload,
  });
}
