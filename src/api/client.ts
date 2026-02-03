import axios, { AxiosError, AxiosRequestConfig } from 'axios';

import { forceLogout } from '@auth/forceLogout';
import { API_HTTP_BASE_URL } from '@config/env';
import { parseJsonPreservingLargeInts } from '@utils/json';

type TokenProvider = () => string | null;
type RefreshHandler = () => Promise<string | null>;

let getAccessToken: TokenProvider = () => null;
let refreshHandler: RefreshHandler | null = null;
let pendingRefresh: Promise<string | null> | null = null;

export const apiClient = axios.create({
  baseURL: API_HTTP_BASE_URL,
  headers: {
    Accept: 'application/json',
  },
});

apiClient.defaults.transformResponse = [
  (data: unknown, headers?: Record<string, string>) => {
    if (typeof data !== 'string') {
      return data;
    }
    const trimmed = data.trim();
    if (!trimmed) {
      return null;
    }
    const contentType = headers?.['content-type'] ?? headers?.['Content-Type'] ?? '';
    const looksJson = contentType.includes('application/json') || /^[[{]/.test(trimmed);
    if (!looksJson) {
      return data;
    }
    try {
      return parseJsonPreservingLargeInts(trimmed);
    } catch (error) {
      console.warn('apiClient: failed to parse JSON response', error);
      return JSON.parse(trimmed);
    }
  },
];

export function setAuthTokenProvider(provider: TokenProvider) {
  getAccessToken = provider;
}

export function setRefreshHandler(handler: RefreshHandler | null) {
  refreshHandler = handler;
}

apiClient.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const { response, config } = error;
    if (!response || !config || response.status !== 401) {
      throw error;
    }
    const retryConfig = config as AxiosRequestConfig & { _retry?: boolean };
    const isRefreshRequest =
      typeof retryConfig.url === 'string' && retryConfig.url.includes('/auth/refresh/');
    const hasToken = Boolean(getAccessToken());
    if (isRefreshRequest) {
      if (hasToken) {
        await forceLogout('expired');
      }
      throw error;
    }
    if (!refreshHandler || retryConfig._retry) {
      if (hasToken) {
        await forceLogout('expired');
      }
      throw error;
    }

    if (!pendingRefresh) {
      pendingRefresh = refreshHandler().finally(() => {
        pendingRefresh = null;
      });
    }

    const newToken = await pendingRefresh;
    if (!newToken) {
      if (hasToken) {
        await forceLogout('expired');
      }
      throw error;
    }

    retryConfig._retry = true;
    retryConfig.headers = retryConfig.headers ?? {};
    retryConfig.headers.Authorization = `Bearer ${newToken}`;
    return apiClient(retryConfig);
  },
);
