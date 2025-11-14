import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import * as authApi from '@api/auth';
import { apiClient, setAuthTokenProvider, setRefreshHandler } from '@api/client';
import * as usersApi from '@api/users';
import type { PersonalMapPayload } from '@api/users';
import { LoginPayload, RegisterPayload } from '@schemas/auth';
import { PersonalMapProfile, User } from '@schemas/user';
import { useMessagingStore } from '@store/messagingStore';

export type AuthStore = {
  accessToken: string | null;
  refreshToken: string | null;
  currentUser: User | null;
  personalMap: PersonalMapProfile | null;
  hasCompletedPersonalMap: boolean;
  isAuthenticating: boolean;
  error: string | null;
  login: (payload: LoginPayload) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<string | null>;
  fetchProfile: () => Promise<void>;
  savePersonalMap: (payload: PersonalMapPayload) => Promise<PersonalMapProfile>;
  setError: (message: string | null) => void;
  applySession: (token: string | null, refreshToken: string | null) => Promise<void>;
};

const resetMessagingStore = () => {
  try {
    useMessagingStore.getState().reset();
  } catch (error) {
    console.warn('authStore: failed to reset messaging store', error);
  }
};

const setMessagingSessionUser = (userId: number | null) => {
  try {
    useMessagingStore.getState().setSessionUserId(userId);
  } catch (error) {
    console.warn('authStore: failed to update messaging session user', error);
  }
};

const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => {
      return {
        accessToken: null,
        refreshToken: null,
        currentUser: null,
        personalMap: null,
        hasCompletedPersonalMap: false,
        isAuthenticating: false,
        error: null,
        async login(payload) {
          set({ isAuthenticating: true, error: null });
          try {
            const authResponse = await authApi.login(payload);
            await get().applySession(
              authResponse.token,
              authResponse.refreshToken ?? null,
            );
            await get().fetchProfile();
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Unable to login';
            set({ error: message });
            throw error;
          } finally {
            set({ isAuthenticating: false });
          }
        },
        async register(payload) {
          set({ isAuthenticating: true, error: null });
          try {
            const authResponse = await authApi.register(payload);
            await get().applySession(
              authResponse.token,
              authResponse.refreshToken ?? null,
            );
            await get().fetchProfile();
          } catch (error) {
            const message = error instanceof Error ? error.message : 'Unable to register';
            set({ error: message });
            throw error;
          } finally {
            set({ isAuthenticating: false });
          }
        },
        async logout() {
          set({
            accessToken: null,
            refreshToken: null,
            currentUser: null,
            personalMap: null,
            hasCompletedPersonalMap: false,
            error: null,
          });
          delete apiClient.defaults.headers.common.Authorization;
          resetMessagingStore();
          setMessagingSessionUser(null);
        },
        async refreshSession() {
          const refreshToken = get().refreshToken;
          if (!refreshToken) {
            return null;
          }
          try {
            const response = await authApi.refresh(refreshToken);
            const nextRefresh = response.refreshToken ?? refreshToken;
            await get().applySession(response.token, nextRefresh);
            try {
              await get().fetchProfile();
            } catch (profileError) {
              console.warn('authStore: profile refresh failed', profileError);
            }
            return response.token;
          } catch (error) {
            await get().logout();
            return null;
          }
        },
        async fetchProfile() {
          const token = get().accessToken;
          if (!token) {
            return;
          }
          try {
            const [user, personalMap] = await Promise.all([
              authApi.me(),
              usersApi.getPersonalMapProfile().catch(() => null),
            ]);
            set({
              currentUser: user,
              personalMap,
              hasCompletedPersonalMap: Boolean(personalMap?.is_complete),
            });
            setMessagingSessionUser(user?.id ?? null);
          } catch (error) {
            const message =
              error instanceof Error ? error.message : 'Unable to load profile';
            set({ error: message });
            throw error;
          }
        },
        async savePersonalMap(payload) {
          const profile = await usersApi.savePersonalMapProfile(payload);
          set({ personalMap: profile, hasCompletedPersonalMap: profile.is_complete });
          await get().fetchProfile();
          return profile;
        },
        setError(message) {
          set({ error: message });
        },
        async applySession(token: string | null, refreshToken: string | null) {
          set({ accessToken: token, refreshToken });
          if (token) {
            apiClient.defaults.headers.common.Authorization = `Bearer ${token}`;
          } else {
            delete apiClient.defaults.headers.common.Authorization;
            resetMessagingStore();
            setMessagingSessionUser(null);
          }
        },
      };
    },
    {
      name: 'selflink-auth-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        currentUser: state.currentUser,
        personalMap: state.personalMap,
        hasCompletedPersonalMap: state.hasCompletedPersonalMap,
      }),
    },
  ),
);

const persistApi = useAuthStore.persist;
type HydrationCallback = (state?: AuthStore, error?: unknown) => void;

const runHydrationSideEffects = (state?: AuthStore) => {
  const snapshot = state ?? useAuthStore.getState();
  if (snapshot.accessToken) {
    apiClient.defaults.headers.common.Authorization = `Bearer ${snapshot.accessToken}`;
  } else {
    delete apiClient.defaults.headers.common.Authorization;
  }
  if (snapshot.accessToken && !snapshot.currentUser) {
    useAuthStore
      .getState()
      .fetchProfile()
      .catch(() => undefined);
  }
};

if (persistApi?.hasHydrated?.()) {
  runHydrationSideEffects();
} else {
  persistApi?.onFinishHydration?.(runHydrationSideEffects);
}

export const hasAuthStoreHydrated = () => persistApi?.hasHydrated?.() ?? true;
export const subscribeToAuthHydration:
  | ((callback: HydrationCallback) => void | (() => void))
  | undefined = persistApi?.onFinishHydration
  ? (callback) => persistApi.onFinishHydration(callback)
  : undefined;

setAuthTokenProvider(() => useAuthStore.getState().accessToken);
setRefreshHandler(() => useAuthStore.getState().refreshSession());

export { useAuthStore };
