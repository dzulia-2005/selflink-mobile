import { apiClient } from '@api/client';
import { listGiftTypes, sendCommentGift, sendPostGift } from '@api/gifts';

jest.mock('@api/client', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));

const mockGet = jest.mocked(apiClient.get);
const mockPost = jest.mocked(apiClient.post);

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
      '/feed/posts/10/gifts/',
      { gift_type_id: 1, quantity: 2 },
      { headers: { 'Idempotency-Key': 'idem-1' } },
    );
  });

  it('posts a gift to a comment', async () => {
    mockPost.mockResolvedValueOnce({ data: { ok: true } });

    await sendCommentGift(7, { gift_type_id: 2, quantity: 1 });

    expect(mockPost).toHaveBeenCalledWith(
      '/feed/comments/7/gifts/',
      { gift_type_id: 2, quantity: 1 },
      undefined,
    );
  });
});
