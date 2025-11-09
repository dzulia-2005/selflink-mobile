import * as SecureStore from 'expo-secure-store';
import {
  ReactNode,
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { apiClient } from '@services/api/client';
import { refreshSession } from '@services/api/auth';
import { fetchCurrentUser, updateCurrentUser } from '@services/api/user';

const TOKEN_KEY = 'selflink.auth.token';
const REFRESH_TOKEN_KEY = 'selflink.auth.refresh';

export type AuthUser = {
  id: string;
  email: string;
  name?: string;
  avatarUrl?: string;
};

type AuthState = {
  token: string | null;
  refreshToken: string | null;
  user: AuthUser | null;
};

type SignInPayload = {
  token: string;
  refreshToken?: string | null;
  user?: AuthUser;
};

type AuthContextValue = {
  token: string | null;
  user: AuthUser | null;
  loading: boolean;
  profileError: string | null;
  isAuthenticated: boolean;
  signIn: (payload: SignInPayload) => Promise<void>;
  signOut: () => Promise<void>;
  setUser: (user: AuthUser | null) => void;
  refreshProfile: () => Promise<void>;
  updateProfile: (input: Partial<AuthUser>) => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

type Props = {
  children: ReactNode;
};

async function persistTokens(token: string | null, refreshToken: string | null) {
  try {
    if (token) {
      await SecureStore.setItemAsync(TOKEN_KEY, token);
    } else {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
    }

    if (refreshToken) {
      await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
    } else {
      await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
    }
  } catch (error) {
    console.warn('AuthContext: failed to persist tokens', error);
  }
}

export function AuthProvider({ children }: Props) {
  const [state, setState] = useState<AuthState>({
    token: null,
    refreshToken: null,
    user: null,
  });
  const [loading, setLoading] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [refreshingProfile, setRefreshingProfile] = useState(false);
  const refreshTokenRef = useRef<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const storedToken = await SecureStore.getItemAsync(TOKEN_KEY);
        const storedRefresh = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
        if (storedToken && isMounted) {
          apiClient.setToken(storedToken);
          refreshTokenRef.current = storedRefresh;
          try {
            const profile = await fetchCurrentUser();
            if (isMounted) {
              setState({
                token: storedToken,
                refreshToken: storedRefresh,
                user: profile,
              });
              setProfileError(null);
            }
          } catch (error) {
            console.warn('AuthContext: failed to fetch profile', error);
            if (isMounted) {
              setState({
                token: storedToken,
                refreshToken: storedRefresh,
                user: null,
              });
              setProfileError('Unable to load profile. Tap to retry.');
            }
          }
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

  const applyAuth = useCallback(
    async (token: string | null, refreshToken: string | null, user?: AuthUser | null) => {
      setState((prev) => ({
        token,
        refreshToken,
        user: user === undefined ? prev.user : user,
      }));
      apiClient.setToken(token);
      refreshTokenRef.current = refreshToken;
      await persistTokens(token, refreshToken);
      if (token) {
        setProfileError(null);
      }
    },
    [],
  );

  useEffect(() => {
    apiClient.setRefreshHandler(async () => {
      if (!refreshTokenRef.current) {
        return null;
      }
      try {
        const result = await refreshSession(refreshTokenRef.current);
        const nextRefresh = result.refreshToken ?? refreshTokenRef.current;
        await applyAuth(result.token, nextRefresh, result.user);
        return result.token;
      } catch (error) {
        console.warn('AuthContext: token refresh failed', error);
        await applyAuth(null, null, null);
        return null;
      }
    });

    return () => {
      apiClient.setRefreshHandler(undefined);
    };
  }, [applyAuth]);

  const signIn = useCallback(
    async ({ token, refreshToken, user }: SignInPayload) => {
      await applyAuth(token, refreshToken ?? null, user ?? null);
    },
    [applyAuth],
  );

  const signOut = useCallback(async () => {
    await applyAuth(null, null, null);
    setProfileError(null);
  }, [applyAuth]);

  const setUser = useCallback((user: AuthUser | null) => {
    setState((prev) => ({ ...prev, user }));
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!state.token || refreshingProfile) {
      return;
    }
    try {
      setRefreshingProfile(true);
      const profile = await fetchCurrentUser();
      setState((prev) => ({ ...prev, user: profile }));
      setProfileError(null);
    } catch (error) {
      console.warn('AuthContext: refresh profile failed', error);
      setProfileError('Unable to refresh profile. Please try again.');
    } finally {
      setRefreshingProfile(false);
    }
  }, [state.token, refreshingProfile]);

  const value = useMemo<AuthContextValue>(
    () => ({
      token: state.token,
      user: state.user,
      loading,
      profileError,
      isAuthenticated: Boolean(state.token),
      signIn,
      signOut,
      setUser,
      refreshProfile,
      updateProfile: async (input: Partial<AuthUser>) => {
        if (!state.token) {
          return;
        }
        try {
          const updated = await updateCurrentUser(input);
          setState((prev) => ({ ...prev, user: updated }));
          setProfileError(null);
        } catch (error) {
          console.warn('AuthContext: profile update failed', error);
          throw error;
        }
      },
    }),
    [
      state.token,
      state.user,
      loading,
      profileError,
      signIn,
      signOut,
      setUser,
      refreshProfile,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
