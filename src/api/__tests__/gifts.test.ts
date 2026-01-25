import { apiClient } from '@api/client';
import { AxiosError } from 'axios';

import { listGiftTypes, normalizeGiftApiError, sendCommentGift, sendPostGift } from '@api/gifts';

jest.mock('@api/client', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));

const mockGet = jest.mocked(apiClient.get);
const mockPost = jest.mocked(apiClient.post);
const createAxiosError = (status: number, data: unknown) =>
  ({
    isAxiosError: true,
    response: { status, data },
    message: 'Request failed',
  }) as AxiosError;

describe('gifts api', () => {
  beforeEach(() => {
    mockGet.mockReset();
    mockPost.mockReset();
  });

  it('fetches gift catalog', async () => {
    mockGet.mockResolvedValueOnce({ data: [] });

    await listGiftTypes();

    expect(mockGet).toHaveBeenCalledWith('/payments/gifts/');
  });

  it('posts a gift to a post', async () => {
    mockPost.mockResolvedValueOnce({ data: { ok: true } });

    await sendPostGift(10, { gift_type_id: 1, quantity: 2 }, 'idem-1');

    expect(mockPost).toHaveBeenCalledWith(
      '/posts/10/gifts/',
      { gift_type_id: 1, quantity: 2 },
      { headers: { 'Idempotency-Key': 'idem-1' } },
    );
  });

  it('posts a gift to a comment', async () => {
    mockPost.mockResolvedValueOnce({ data: { ok: true } });

    await sendCommentGift(7, { gift_type_id: 2, quantity: 1 }, 'idem-2');

    expect(mockPost).toHaveBeenCalledWith(
      '/comments/7/gifts/',
      { gift_type_id: 2, quantity: 1 },
      { headers: { 'Idempotency-Key': 'idem-2' } },
    );
  });

  it('maps insufficient funds error', () => {
    const error = createAxiosError(400, { detail: 'insufficient_funds', code: 'insufficient_funds' });
    const parsed = normalizeGiftApiError(error);

    expect(parsed.message).toBe('Not enough SLC.');
  });

  it('maps gift inactive error', () => {
    const error = createAxiosError(400, { detail: 'gift_inactive', code: 'gift_inactive' });
    const parsed = normalizeGiftApiError(error);

    expect(parsed.message).toBe('Gift not available.');
  });

  it('maps idempotency conflict error', () => {
    const error = createAxiosError(400, { detail: 'idempotency_conflict', code: 'idempotency_conflict' });
    const parsed = normalizeGiftApiError(error);

    expect(parsed.message).toBe('This gift request is already being processed.');
  });
});
