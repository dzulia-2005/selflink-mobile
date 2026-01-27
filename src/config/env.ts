import Constants from 'expo-constants';

const extra = Constants?.expoConfig?.extra ?? {};

// FOR LOCAL TESTING PURPOSES ONLY:
// const DEFAULT_API_BASE_URL = 'http://localhost:8000';
// const API_VERSION_PATH = '/api/v1';
// const DEFAULT_HEALTH_ENDPOINT = '/api/v1/health/';
// const DEFAULT_REALTIME_URL = 'ws://localhost:8001/ws';

// FOR GLOBAL PRODUCTION USE:
const DEFAULT_API_BASE_URL = 'https://api.self-link.com';
const API_VERSION_PATH = '/api/v1';
const DEFAULT_HEALTH_ENDPOINT = '/api/v1/health/';
const DEFAULT_REALTIME_URL = 'wss://api.self-link.com/ws';

const trimTrailingSlash = (value: string) => value.replace(/\/+$/, '');

const normalizeBaseUrl = (value: unknown): string => {
  if (!value) {
    return DEFAULT_API_BASE_URL;
  }
  const stringValue = String(value).trim();
  if (!stringValue) {
    return DEFAULT_API_BASE_URL;
  }
  return trimTrailingSlash(stringValue);
};

const rawApiBaseUrl =
  process.env.EXPO_PUBLIC_API_BASE_URL ??
  process.env.EXPO_PUBLIC_API_URL ??
  (typeof extra.backendUrl === 'string' ? extra.backendUrl : undefined) ??
  DEFAULT_API_BASE_URL;

const deriveApiUrls = (value: unknown) => {
  const normalized = normalizeBaseUrl(value);
  const trimmed = trimTrailingSlash(normalized);
  if (trimmed.endsWith(API_VERSION_PATH)) {
    const apiHttpBaseUrl = trimmed;
    const baseCandidate = trimTrailingSlash(trimmed.slice(0, -API_VERSION_PATH.length));
    return {
      apiBaseUrl: baseCandidate || DEFAULT_API_BASE_URL,
      apiHttpBaseUrl,
    };
  }
  return {
    apiBaseUrl: trimmed,
    apiHttpBaseUrl: `${trimmed}${API_VERSION_PATH}`,
  };
};

const { apiBaseUrl, apiHttpBaseUrl } = deriveApiUrls(rawApiBaseUrl);

export const API_BASE_URL = apiBaseUrl;
export const API_HTTP_BASE_URL = apiHttpBaseUrl;

const rawIpayBaseUrl =
  process.env.EXPO_PUBLIC_IPAY_BASE_URL ??
  (typeof extra.ipayBaseUrl === 'string' ? extra.ipayBaseUrl : undefined);
const ipayBaseUrl = rawIpayBaseUrl ? trimTrailingSlash(String(rawIpayBaseUrl).trim()) : '';

const parseEnvList = (raw: unknown): string[] | undefined => {
  if (typeof raw !== 'string') {
    return undefined;
  }
  const items = raw
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  return items.length > 0 ? items : undefined;
};

const rawHealthEndpoint =
  process.env.EXPO_PUBLIC_HEALTH_ENDPOINT ??
  (typeof extra.healthEndpoint === 'string' ? extra.healthEndpoint : undefined);

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

export const HEALTH_ENDPOINT = normalizeHealthEndpoint(rawHealthEndpoint);
export const HEALTH_URL = `${API_BASE_URL}${HEALTH_ENDPOINT}`;

const normalizeRealtimeUrl = (raw: string) => {
  const trimmed = raw.trim();
  if (!trimmed) {
    return DEFAULT_REALTIME_URL;
  }
  try {
    const url = new URL(trimmed);
    url.pathname = url.pathname.replace(/\/+$/, '');
    return url.toString();
  } catch {
    return trimmed.replace(/\/+$/, '');
  }
};

const resolveRealtimeUrl = () => {
  const envRealtime =
    process.env.EXPO_PUBLIC_REALTIME_URL ??
    process.env.EXPO_PUBLIC_WS_URL ??
    (typeof extra.realtimeUrl === 'string' ? extra.realtimeUrl : undefined);
  if (typeof envRealtime === 'string') {
    const trimmed = envRealtime.trim();
    if (trimmed) {
      return normalizeRealtimeUrl(trimmed);
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
    url.pathname = url.pathname.replace(/\/+$/, '') + '/ws';
    url.search = '';
    url.hash = '';
    return normalizeRealtimeUrl(url.toString());
  } catch {
    return normalizeRealtimeUrl(DEFAULT_REALTIME_URL);
  }
};

const realtimeUrl = resolveRealtimeUrl();

const rawBtcpayBaseUrl =
  process.env.EXPO_PUBLIC_BTCPAY_BASE_URL ??
  (typeof extra.btcpayBaseUrl === 'string' ? extra.btcpayBaseUrl : undefined);
const btcpayBaseUrl = rawBtcpayBaseUrl
  ? trimTrailingSlash(String(rawBtcpayBaseUrl).trim())
  : '';

const stripePublishableKey =
  process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY ??
  (typeof extra.stripePublishableKey === 'string' ? extra.stripePublishableKey : '');

const googleMapsApiKey =
  process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ??
  (typeof extra.googleMapsApiKey === 'string' ? extra.googleMapsApiKey : '');

const rawIapSkus =
  process.env.EXPO_PUBLIC_IAP_SKUS ??
  (typeof extra.iapSkus === 'string' ? extra.iapSkus : undefined);
const iapSkus = parseEnvList(rawIapSkus);

const rawGiftEffectsDebug =
  process.env.EXPO_PUBLIC_GIFT_EFFECTS_DEBUG ??
  (typeof extra.giftEffectsDebug === 'string' ? extra.giftEffectsDebug : undefined);
const giftEffectsDebug =
  typeof rawGiftEffectsDebug === 'string'
    ? ['1', 'true', 'yes', 'on'].includes(rawGiftEffectsDebug.trim().toLowerCase())
    : false;

export const env = {
  backendUrl: API_BASE_URL,
  apiBaseUrl: API_BASE_URL,
  apiHttpBaseUrl: API_HTTP_BASE_URL,
  healthEndpoint: HEALTH_ENDPOINT,
  healthUrl: HEALTH_URL,
  realtimeUrl,
  ipayBaseUrl,
  btcpayBaseUrl,
  stripePublishableKey,
  googleMapsApiKey,
  iapSkus,
  giftEffectsDebug,
};
