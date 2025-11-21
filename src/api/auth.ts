import {
  AuthResponse,
  LoginPayload,
  RefreshResponse,
  RegisterPayload,
} from '@schemas/auth';
import { User } from '@schemas/user';

import { apiClient } from './client';

export async function login(payload: LoginPayload): Promise<AuthResponse> {
  const { data } = await apiClient.post<AuthResponse>('/auth/login/', payload);
  return data;
}

export async function register(payload: RegisterPayload): Promise<AuthResponse> {
  const { email, password, handle, name, intention } = payload;
  const body = { email, password, handle, name, intention };
  const { data } = await apiClient.post<AuthResponse>('/auth/register/', body);
  return data;
}

export async function me(): Promise<User> {
  const { data } = await apiClient.get<User>('/users/me/');
  return data;
}

export async function refresh(refreshToken: string): Promise<RefreshResponse> {
  const { data } = await apiClient.post<RefreshResponse>('/auth/refresh/', {
    refresh: refreshToken,
  });
  return data;
}
