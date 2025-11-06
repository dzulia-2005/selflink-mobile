import * as SecureStore from 'expo-secure-store';
import {
  ReactNode,
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { apiClient } from '@services/api/client';
import { fetchCurrentUser } from '@services/api/user';

const TOKEN_KEY = 'selflink.auth.token';

export type AuthUser = {
  id: string;
  email: string;
  name?: string;
  avatarUrl?: string;
};

type AuthState = {
  token: string | null;
  user: AuthUser | null;
};

type SignInPayload = {
  token: string;
  user?: AuthUser;
};

type AuthContextValue = {
  token: string | null;
  user: AuthUser | null;
  loading: boolean;
  isAuthenticated: boolean;
  signIn: (payload: SignInPayload) => Promise<void>;
  signOut: () => Promise<void>;
  setUser: (user: AuthUser | null) => void;
};

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

type Props = {
  children: ReactNode;
};

async function persistToken(token: string | null) {
  try {
    if (token) {
      await SecureStore.setItemAsync(TOKEN_KEY, token);
    } else {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
    }
  } catch (error) {
    console.warn('AuthContext: failed to persist token', error);
  }
}

export function AuthProvider({ children }: Props) {
  const [state, setState] = useState<AuthState>({ token: null, user: null });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const storedToken = await SecureStore.getItemAsync(TOKEN_KEY);
        if (storedToken && isMounted) {
          apiClient.setToken(storedToken);
          const profile = await fetchCurrentUser();
          setState({ token: storedToken, user: profile });
        }
      } catch (error) {
        console.warn('AuthContext: failed to load token', error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  const applyAuth = useCallback(async (token: string | null, user: AuthUser | null) => {
    setState({ token, user });
    apiClient.setToken(token);
    await persistToken(token);
  }, []);

  const signIn = useCallback(
    async ({ token, user }: SignInPayload) => {
      await applyAuth(token, user ?? null);
    },
    [applyAuth],
  );

  const signOut = useCallback(async () => {
    await applyAuth(null, null);
  }, [applyAuth]);

  const setUser = useCallback((user: AuthUser | null) => {
    setState((prev) => ({ ...prev, user }));
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      token: state.token,
      user: state.user,
      loading,
      isAuthenticated: Boolean(state.token),
      signIn,
      signOut,
      setUser,
    }),
    [state.token, state.user, loading, signIn, signOut, setUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
