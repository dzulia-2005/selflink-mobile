import Constants from 'expo-constants';

const extra = Constants?.expoConfig?.extra ?? {};

const backendUrl =
  typeof extra.backendUrl === 'string' ? extra.backendUrl : 'http://localhost:8000';
const healthEndpoint =
  typeof extra.healthEndpoint === 'string' ? extra.healthEndpoint : '/api/health/';

export const env = {
  backendUrl,
  healthEndpoint,
};
