import { API_BASE_URL } from '@config/env';

export const normalizeAssetUrl = (value: unknown): string => {
  if (typeof value !== 'string') {
    return '';
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return '';
  }
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }
  if (trimmed.startsWith('/')) {
    return `${API_BASE_URL.replace(/\/+$/, '')}${trimmed}`;
  }
  return trimmed;
};
