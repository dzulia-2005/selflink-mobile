import { AuthUser } from '@context/AuthContext';
import { apiClient } from '@services/api/client';
import { fetchCurrentUser } from '@services/api/user';

type LoginResponse = {
  token: string;
  user: AuthUser;
};

type Credentials = {
  email: string;
  password: string;
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
    return { token: result.token, user };
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
      user: localUser,
    };
  }
}
