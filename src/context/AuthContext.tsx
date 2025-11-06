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
import { fetchCurrentUser, updateCurrentUser } from '@services/api/user';

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
  const [profileError, setProfileError] = useState<string | null>(null);
  const [refreshingProfile, setRefreshingProfile] = useState(false);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const storedToken = await SecureStore.getItemAsync(TOKEN_KEY);
        if (storedToken && isMounted) {
          apiClient.setToken(storedToken);
          try {
            const profile = await fetchCurrentUser();
            if (isMounted) {
              setState({ token: storedToken, user: profile });
              setProfileError(null);
            }
          } catch (error) {
            console.warn('AuthContext: failed to fetch profile', error);
            if (isMounted) {
              setState({ token: storedToken, user: null });
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

  const applyAuth = useCallback(async (token: string | null, user: AuthUser | null) => {
    setState({ token, user });
    apiClient.setToken(token);
    await persistToken(token);
    if (token) {
      setProfileError(null);
    }
  }, []);

  const signIn = useCallback(
    async ({ token, user }: SignInPayload) => {
      await applyAuth(token, user ?? null);
    },
    [applyAuth],
  );

  const signOut = useCallback(async () => {
    await applyAuth(null, null);
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
