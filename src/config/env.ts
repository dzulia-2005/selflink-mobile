import Constants from 'expo-constants';

const extra = Constants?.expoConfig?.extra ?? {};

const DEFAULT_API_BASE_URL = 'https://api.self-link.com';
const DEFAULT_HEALTH_ENDPOINT = '/api/v1/health/';

const normalizeBaseUrl = (value: unknown): string => {
  if (!value) {
    return DEFAULT_API_BASE_URL;
  }
  const stringValue = String(value).trim();
  if (!stringValue) {
    return DEFAULT_API_BASE_URL;
  }
  return stringValue.replace(/\/+$/, '');
};

const rawApiBaseUrl =
  process.env.EXPO_PUBLIC_API_BASE_URL ??
  process.env.EXPO_PUBLIC_API_URL ??
  (typeof extra.backendUrl === 'string' ? extra.backendUrl : undefined) ??
  DEFAULT_API_BASE_URL;

export const API_BASE_URL = normalizeBaseUrl(rawApiBaseUrl);
export const API_HTTP_BASE_URL = `${API_BASE_URL}/api/v1`;

const normalizeHealthEndpoint = (raw: unknown): string => {
  if (typeof raw !== 'string') {
    return DEFAULT_HEALTH_ENDPOINT;
  }
  const trimmed = raw.trim();
  if (!trimmed) {
    return DEFAULT_HEALTH_ENDPOINT;
  }
  const withLeadingSlash = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  const withoutTrailing = withLeadingSlash.replace(/\/+$/, '');
  return `${withoutTrailing}/`;
};

export const HEALTH_ENDPOINT = normalizeHealthEndpoint(extra.healthEndpoint);
export const HEALTH_URL = `${API_BASE_URL}${HEALTH_ENDPOINT}`;

const resolveRealtimeUrl = () => {
  if (typeof extra.realtimeUrl === 'string') {
    try {
      return new URL(extra.realtimeUrl).toString();
    } catch {
      return extra.realtimeUrl;
    }
  }
  try {
    const url = new URL(API_BASE_URL);
    const defaultPort =
      url.port ||
      (url.protocol === 'https:' ? '443' : url.protocol === 'http:' ? '80' : '');
    const realtimePort = defaultPort === '8000' ? '8001' : defaultPort;
    url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
    url.port = realtimePort;
    url.pathname = url.pathname.replace(/\/$/, '') + '/ws';
    url.search = '';
    url.hash = '';
    return url.toString();
  } catch {
    return API_BASE_URL.replace(/^http/, 'ws').replace(/\/$/, '') + '/ws';
  }
};

const realtimeUrl = resolveRealtimeUrl();

export const env = {
  backendUrl: API_BASE_URL,
  apiBaseUrl: API_BASE_URL,
  apiHttpBaseUrl: API_HTTP_BASE_URL,
  healthEndpoint: HEALTH_ENDPOINT,
  healthUrl: HEALTH_URL,
  realtimeUrl,
};
