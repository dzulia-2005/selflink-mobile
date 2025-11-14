import axios, { AxiosError, AxiosRequestConfig } from 'axios';

import { env } from '@config/env';
import { parseJsonPreservingLargeInts } from '@utils/json';

const rawBaseUrl = (
  process.env.EXPO_PUBLIC_API_URL ||
  env.backendUrl ||
  'http://localhost:8000'
).replace(/\/$/, '');
export const API_BASE_URL = `${rawBaseUrl}/api/v1`;

type TokenProvider = () => string | null;
type RefreshHandler = () => Promise<string | null>;

let getAccessToken: TokenProvider = () => null;
let refreshHandler: RefreshHandler | null = null;
let pendingRefresh: Promise<string | null> | null = null;

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
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
    if (!refreshHandler || retryConfig._retry) {
      throw error;
    }

    if (!pendingRefresh) {
      pendingRefresh = refreshHandler().finally(() => {
        pendingRefresh = null;
      });
    }

    const newToken = await pendingRefresh;
    if (!newToken) {
      throw error;
    }

    retryConfig._retry = true;
    retryConfig.headers = retryConfig.headers ?? {};
    retryConfig.headers.Authorization = `Bearer ${newToken}`;
    return apiClient(retryConfig);
  },
);
