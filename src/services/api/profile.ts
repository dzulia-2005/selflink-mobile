import { serviceApiClient as apiClient } from '@api/client';
import { ProfileSettings } from '@schemas/profile';

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
