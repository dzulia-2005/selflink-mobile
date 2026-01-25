import { normalizeApiError, parseApiError } from '@utils/apiErrors';

describe('apiErrors', () => {
  it('parses status and message from apiClient error string', () => {
    const error = new Error('Request failed (401): {"detail":"Token invalid"}');
    const parsed = parseApiError(error);
    expect(parsed.status).toBe(401);
    expect(parsed.message).toBe('Token invalid');
  });

  it('normalizes auth errors', () => {
    const error = new Error('Request failed (403): {"detail":"Forbidden"}');
    const normalized = normalizeApiError(error, 'Fallback');
    expect(normalized.status).toBe(403);
    expect(normalized.message).toBe('Please sign in to continue.');
  });

  it('normalizes throttling errors', () => {
    const error = new Error('Request failed (429): {"detail":"Too many"}');
    const normalized = normalizeApiError(error, 'Fallback');
    expect(normalized.status).toBe(429);
    expect(normalized.message).toBe('Too many requests; try again in a moment.');
  });

  it('normalizes network errors without status', () => {
    const error = new Error('Network request failed');
    const normalized = normalizeApiError(error, 'Fallback');
    expect(normalized.status).toBeUndefined();
    expect(normalized.message).toBe('Unable to reach the server. Please try again.');
  });
});
