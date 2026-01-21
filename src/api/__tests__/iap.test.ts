import { AxiosError } from 'axios';

import { apiClient } from '@api/client';
import { normalizeIapApiError, verifyIapPurchase } from '@api/iap';

jest.mock('@api/client', () => ({
  apiClient: {
    post: jest.fn(),
  },
}));

const mockPost = jest.mocked(apiClient.post);

const createAxiosError = (status: number, data: unknown) =>
  ({
    isAxiosError: true,
    response: { status, data },
    message: 'Request failed',
  }) as AxiosError;

describe('iap verify api', () => {
  beforeEach(() => {
    mockPost.mockReset();
  });

  it('posts iap verify payload', async () => {
    mockPost.mockResolvedValueOnce({ data: { received: true } });

    await verifyIapPurchase({
      platform: 'ios',
      product_id: 'com.selflink.slc.499',
      transaction_id: 'tx_1',
      receipt: 'base64',
    });

    expect(mockPost).toHaveBeenCalledWith('/payments/iap/verify/', {
      platform: 'ios',
      product_id: 'com.selflink.slc.499',
      transaction_id: 'tx_1',
      receipt: 'base64',
    });
  });

  it('maps auth errors', () => {
    const error = createAxiosError(401, {
      detail: 'Authentication credentials were not provided.',
    });

    const parsed = normalizeIapApiError(error);

    expect(parsed.status).toBe(401);
    expect(parsed.message).toBe('Please sign in to continue.');
  });

  it('maps throttling errors', () => {
    const error = createAxiosError(429, { detail: 'Request was throttled.' });

    const parsed = normalizeIapApiError(error);

    expect(parsed.status).toBe(429);
    expect(parsed.message).toBe('Too many requests; try again in a moment.');
  });

  it('maps validation errors', () => {
    const error = createAxiosError(400, { detail: 'Unknown product_id.' });

    const parsed = normalizeIapApiError(error);

    expect(parsed.status).toBe(400);
    expect(parsed.message).toBe('Unknown product_id.');
  });
});
