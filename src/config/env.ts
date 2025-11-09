import Constants from 'expo-constants';

const extra = Constants?.expoConfig?.extra ?? {};

const backendUrl =
  typeof extra.backendUrl === 'string' ? extra.backendUrl : 'http://192.168.0.104:8000/';
const healthEndpoint =
  typeof extra.healthEndpoint === 'string' ? extra.healthEndpoint : '/api/health/';
const realtimeUrl =
  typeof extra.realtimeUrl === 'string'
    ? extra.realtimeUrl
    : backendUrl.replace(/^http/, 'ws').replace(/\/$/, '') + '/ws';

export const env = {
  backendUrl,
  healthEndpoint,
  realtimeUrl,
};
