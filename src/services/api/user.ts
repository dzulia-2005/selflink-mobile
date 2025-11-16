import { AuthUser } from '@context/AuthContext';
import { apiClient } from '@services/api/client';
import type { FeedPostAuthor } from '@services/api/feed';

export type UserProfile = FeedPostAuthor;

export type UsersListResponse = {
  next: string | null;
  previous: string | null;
  results: UserProfile[];
};

export type UsersQuery = {
  cursor?: string;
  ordering?: string;
  page_size?: number;
  search?: string;
};

function buildQuery(path: string, params: UsersQuery = {}): string {
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
  return `${path}${qs ? `?${qs}` : ''}`;
}

export async function listUsers(params: UsersQuery = {}): Promise<UsersListResponse> {
  return apiClient.request<UsersListResponse>(buildQuery('/api/v1/users/', params), {
    method: 'GET',
  });
}

export async function getUser(id: number): Promise<UserProfile> {
  return apiClient.request<UserProfile>(`/api/v1/users/${id}/`, { method: 'GET' });
}

export async function followUser(id: number): Promise<UserProfile> {
  return apiClient.request<UserProfile>(`/api/v1/users/${id}/follow/`, {
    method: 'POST',
    body: {},
  });
}

export async function unfollowUser(id: number): Promise<void> {
  await apiClient.request(`/api/v1/users/${id}/follow/`, { method: 'DELETE' });
}

export async function listFollowers(
  id: number,
  params: UsersQuery = {},
): Promise<UsersListResponse> {
  return apiClient.request<UsersListResponse>(
    buildQuery(`/api/v1/users/${id}/followers/`, params),
    { method: 'GET' },
  );
}

export async function listFollowing(
  id: number,
  params: UsersQuery = {},
): Promise<UsersListResponse> {
  return apiClient.request<UsersListResponse>(
    buildQuery(`/api/v1/users/${id}/following/`, params),
    { method: 'GET' },
  );
}

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

export type AvatarUploadPayload = {
  uri: string;
  name?: string;
  type?: string;
};

export async function uploadPersonalMapAvatar(
  payload: AvatarUploadPayload,
): Promise<AuthUser> {
  const form = new FormData();
  form.append('avatar_image', {
    uri: payload.uri,
    name: payload.name ?? 'avatar.jpg',
    type: payload.type ?? 'image/jpeg',
  } as any);

  await apiClient.request('/me/profile/', {
    method: 'PATCH',
    body: form,
  });

  const user = await fetchCurrentUser();
  if (__DEV__) {
    console.debug('userApi: /users/me/ response', { photo: user?.avatarUrl, raw: user });
  }
  return user;
}
