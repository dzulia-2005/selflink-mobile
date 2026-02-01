import { AxiosError } from 'axios';

import { createBtcpayCheckout, normalizeBtcpayApiError } from '@api/btcpayCheckout';
import { apiClient } from '@api/client';

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

describe('btcpay checkout api', () => {
  beforeEach(() => {
    mockPost.mockReset();
  });

  it('posts BTCPay checkout payload', async () => {
    mockPost.mockResolvedValueOnce({ data: { checkout_id: 1 } });

    await createBtcpayCheckout({ amountCents: 1200, currency: 'USD' });

    expect(mockPost).toHaveBeenCalledWith('/payments/btcpay/checkout/', {
      amount_cents: 1200,
      currency: 'USD',
    });
  });

  it('maps auth errors', () => {
    const error = createAxiosError(401, {
      detail: 'Authentication credentials were not provided.',
    });

    const parsed = normalizeBtcpayApiError(error);

    expect(parsed.status).toBe(401);
    expect(parsed.message).toBe('Please sign in to continue.');
  });

  it('maps throttling errors', () => {
    const error = createAxiosError(429, { detail: 'Request was throttled.' });

    const parsed = normalizeBtcpayApiError(error);

    expect(parsed.status).toBe(429);
    expect(parsed.message).toBe('Too many requests; try again in a moment.');
  });

  it('maps field validation errors', () => {
    const error = createAxiosError(400, {
      currency: ['Currency not supported for BTCPay.'],
    });

    const parsed = normalizeBtcpayApiError(error);

    expect(parsed.status).toBe(400);
    expect(parsed.message).toBe('Currency not supported for BTCPay.');
    expect(parsed.fields?.currency?.[0]).toBe('Currency not supported for BTCPay.');
  });
});
