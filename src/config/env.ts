import Constants from 'expo-constants';

const extra = Constants?.expoConfig?.extra ?? {};

const DEFAULT_BACKEND = 'http://192.168.0.104:8000/';
const DEFAULT_HEALTH_ENDPOINT = 'api/v1/health/';

const backendUrl =
  typeof extra.backendUrl === 'string' ? extra.backendUrl : DEFAULT_BACKEND;
const normalizeHealthEndpoint = (raw: unknown): string => {
  if (typeof raw !== 'string') {
    return DEFAULT_HEALTH_ENDPOINT;
  }
  const trimmed = raw.trim();
  if (!trimmed) {
    return DEFAULT_HEALTH_ENDPOINT;
  }
  const withoutSlashes = trimmed.replace(/^\/+/, '').replace(/\/+$/, '');
  if (!withoutSlashes || /^[0-9]+$/.test(withoutSlashes)) {
    return DEFAULT_HEALTH_ENDPOINT;
  }
  return `${withoutSlashes}/`;
};
const healthEndpoint = normalizeHealthEndpoint(extra.healthEndpoint);
const resolveRealtimeUrl = () => {
  if (typeof extra.realtimeUrl === 'string') {
    return extra.realtimeUrl;
  }
  try {
    const url = new URL(backendUrl);
    const defaultPort =
      url.port ||
      (url.protocol === 'https:' ? '443' : url.protocol === 'http:' ? '80' : '');
    const realtimePort = defaultPort === '8000' ? '8001' : defaultPort;
    url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
    url.port = realtimePort;
    url.pathname = url.pathname.replace(/\/$/, '') + '/ws';
    return url.toString();
  } catch {
    return backendUrl.replace(/^http/, 'ws').replace(/\/$/, '') + '/ws';
  }
};

const realtimeUrl = resolveRealtimeUrl();

export const env = {
  backendUrl,
  healthEndpoint,
  realtimeUrl,
};
