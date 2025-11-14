import {
  PersonalMapInput,
  PersonalMapProfile,
  ProfileUpdateInput,
  User,
} from '@schemas/user';

import { apiClient } from './client';

export interface UserSummary {
  id: number;
  handle?: string;
  username?: string;
  name?: string;
  first_name?: string;
  last_name?: string;
  photo?: string;
  avatar_url?: string;
  bio?: string;
  is_following?: boolean;
  followers_count?: number;
  following_count?: number;
  posts_count?: number;
}

export async function listUsers(query?: string): Promise<User[]> {
  const url = query ? `/users/?q=${encodeURIComponent(query)}` : '/users/';
  const { data } = await apiClient.get<User[]>(url);
  return data;
}

const mapUser = (user: User | UserSummary): UserSummary => {
  const summaryLike = user as UserSummary;
  const fullUser = user as User;
  return {
    id: user.id,
    handle: fullUser.handle ?? summaryLike.handle,
    username: summaryLike.username ?? fullUser.handle,
    name: fullUser.name ?? summaryLike.name,
    first_name: summaryLike.first_name,
    last_name: summaryLike.last_name,
    photo: fullUser.photo ?? summaryLike.photo ?? summaryLike.avatar_url,
    avatar_url: summaryLike.avatar_url ?? fullUser.photo ?? summaryLike.photo,
    bio: fullUser.bio ?? summaryLike.bio,
    is_following: Boolean((summaryLike as any).is_following),
    followers_count: (summaryLike as any).followers_count ?? 0,
    following_count: (summaryLike as any).following_count ?? 0,
    posts_count: (summaryLike as any).posts_count ?? 0,
  };
};

export async function getUserProfile(id: number | string): Promise<UserSummary> {
  const { data } = await apiClient.get<User>(`/users/${id}/`);
  return mapUser(data);
}

export async function getUserById(id: number): Promise<User> {
  const { data } = await apiClient.get<User>(`/users/${id}/`);
  return data;
}

export async function getCurrentUser(): Promise<User> {
  const { data } = await apiClient.get<User>('/users/me/');
  return data;
}

export async function updateCurrentUser(payload: ProfileUpdateInput): Promise<User> {
  const { data } = await apiClient.patch<User>('/users/me/', payload);
  return data;
}

export type PersonalMapPayload = PersonalMapInput & {
  avatarFile?: {
    uri: string;
    name: string;
    type: string;
  };
};

export async function getPersonalMapProfile(): Promise<PersonalMapProfile> {
  const { data } = await apiClient.get<PersonalMapProfile>('/me/profile/');
  return data;
}

export async function savePersonalMapProfile(
  payload: PersonalMapPayload,
): Promise<PersonalMapProfile> {
  const { avatarFile, ...rest } = payload;
  if (avatarFile) {
    const formData = new FormData();
    Object.entries(rest).forEach(([key, value]) => {
      if (value === undefined || value === null) {
        return;
      }
      formData.append(key, String(value));
    });
    formData.append('avatar_image', {
      uri: avatarFile.uri,
      name: avatarFile.name,
      type: avatarFile.type,
    } as any);
    const { data } = await apiClient.patch<PersonalMapProfile>('/me/profile/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  }
  const { data } = await apiClient.patch<PersonalMapProfile>('/me/profile/', rest);
  return data;
}

export async function followUser(userId: number | string): Promise<void> {
  await apiClient.post(`/users/${userId}/follow/`, {});
}

export async function unfollowUser(userId: number | string): Promise<void> {
  await apiClient.delete(`/users/${userId}/follow/`);
}

export async function getUserFollowers(userId: number | string): Promise<UserSummary[]> {
  const { data } = await apiClient.get<User[]>(`/users/${userId}/followers/`);
  return data.map(mapUser);
}

export async function getUserFollowing(userId: number | string): Promise<UserSummary[]> {
  const { data } = await apiClient.get<User[]>(`/users/${userId}/following/`);
  return data.map(mapUser);
}

export async function searchUsers(query: string): Promise<UserSummary[]> {
  if (!query.trim()) {
    return [];
  }
  const normalized = query.trim().replace(/^@+/, '') || query.trim();
  // Endpoint powered by apps/search/urls.py -> /search/users/
  const { data } = await apiClient.get<UserSummary[]>(
    `/search/users/?q=${encodeURIComponent(normalized)}`,
  );
  return data.map(mapUser);
}
