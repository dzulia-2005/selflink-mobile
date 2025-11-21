import { User } from './user';

export interface AuthTokens {
  token: string;
  refreshToken?: string | null;
  message?: string;
}

export interface AuthResponse extends AuthTokens {
  user: User;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  email: string;
  password: string;
  name: string;
  handle?: string;
  intention?: string;
}

export interface RefreshResponse {
  token: string;
  refreshToken?: string | null;
  message?: string;
}
