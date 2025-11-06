import { AuthUser } from '@context/AuthContext';
import { apiClient } from '@services/api/client';

export async function fetchCurrentUser(): Promise<AuthUser> {
  return apiClient.request<AuthUser>('/api/v1/users/me/', {
    method: 'GET',
  });
}

export async function updateCurrentUser(
  payload: Partial<Pick<AuthUser, 'name' | 'avatarUrl'>>,
): Promise<AuthUser> {
  return apiClient.request<AuthUser>('/api/v1/users/me/', {
    method: 'PATCH',
    body: payload,
  });
}
