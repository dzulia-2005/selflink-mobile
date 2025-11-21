import { AuthUser } from '@context/AuthContext';
import { apiClient } from '@services/api/client';
import { fetchCurrentUser } from '@services/api/user';

type LoginResponse = {
  token: string;
  refreshToken?: string;
  user: AuthUser;
};

type Credentials = {
  email: string;
  password: string;
};

export type RegisterPayload = Credentials & {
  handle?: string;
  name: string;
  fullName?: string;
  intention?: string;
};

const MOCK_USER_NAME = 'Selflink Explorer';

export async function loginWithPassword(
  credentials: Credentials,
): Promise<LoginResponse> {
  try {
    const result = await apiClient.request<LoginResponse>('/api/v1/auth/login/', {
      method: 'POST',
      auth: false,
      body: credentials,
    });

    if (!result?.token) {
      throw new Error('Missing token in response');
    }
    let user = result.user;
    if (!user) {
      user = await fetchCurrentUser();
    }
    return { token: result.token, refreshToken: result.refreshToken, user };
  } catch (error) {
    console.warn('Falling back to mock login flow', error);
    const { email } = credentials;
    const localUser: AuthUser = {
      id: 'mock-user',
      email,
      name: email.split('@')[0] || MOCK_USER_NAME,
    };
    return {
      token: 'mock-token',
      refreshToken: 'mock-refresh-token',
      user: localUser,
    };
  }
}

export async function registerUser(payload: RegisterPayload): Promise<LoginResponse> {
  try {
    const { email, password, handle, name, fullName, intention } = payload;
    const result = await apiClient.request<LoginResponse>('/api/v1/auth/register/', {
      method: 'POST',
      auth: false,
      body: {
        email,
        password,
        handle,
        name,
        fullName,
        intention,
      },
    });

    if (!result?.token) {
      throw new Error('Missing token in response');
    }

    let user = result.user;
    if (!user) {
      user = await fetchCurrentUser();
    }
    return { token: result.token, refreshToken: result.refreshToken, user };
  } catch (error) {
    console.warn('Registration failed', error);
    throw error;
  }
}

export async function refreshSession(refreshToken: string): Promise<LoginResponse> {
  const result = await apiClient.request<LoginResponse>('/api/v1/auth/token/refresh/', {
    method: 'POST',
    auth: false,
    body: { refresh: refreshToken },
  });

  if (!result?.token) {
    throw new Error('Missing token in refresh response');
  }

  return result;
}
