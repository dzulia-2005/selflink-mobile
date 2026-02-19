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
  const { email, password, handle, username, name, intention } = payload;
  const body = {
    email,
    password,
    handle,
    username: username ?? handle,
    name,
    intention,
  };
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

export type SocialProvider = 'google' | 'facebook' | 'github';

export type SocialLoginPayload = {
  idToken?: string;
  accessToken?: string;
  code?: string;
};

export async function socialLogin(
  provider: SocialProvider,
  payload: SocialLoginPayload,
): Promise<AuthResponse> {
  const body: Record<string, string> = {};
  if (payload.idToken) {
    body.id_token = payload.idToken;
  }
  if (payload.accessToken) {
    body.access_token = payload.accessToken;
  }
  if (payload.code) {
    body.code = payload.code;
  }
  if (!body.id_token && !body.access_token && !body.code) {
    throw new Error('Provide id token, access token, or OAuth code.');
  }
  const { data } = await apiClient.post<AuthResponse>(
    `/auth/social/${provider}/callback/`,
    body,
  );
  return data;
}
