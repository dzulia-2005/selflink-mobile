import { apiClient } from '@api/client';
import {
  likeComment,
  likePost,
  normalizeLikesApiError,
  unlikeComment,
  unlikePost,
} from '@api/likes';

jest.mock('@api/client', () => ({
  apiClient: {
    post: jest.fn(),
    delete: jest.fn(),
  },
}));

const mockPost = jest.mocked(apiClient.post);
const mockDelete = jest.mocked(apiClient.delete);

describe('likes api', () => {
  beforeEach(() => {
    mockPost.mockReset();
    mockDelete.mockReset();
  });

  it('likes a post', async () => {
    mockPost.mockResolvedValueOnce({ data: { liked: true, like_count: 10 } });

    await likePost(12);

    expect(mockPost).toHaveBeenCalledWith('/posts/12/like/', {});
  });

  it('unlikes a post', async () => {
    mockDelete.mockResolvedValueOnce({ data: { liked: false, like_count: 9 } });

    await unlikePost(12);

    expect(mockDelete).toHaveBeenCalledWith('/posts/12/unlike/');
  });

  it('likes a comment', async () => {
    mockPost.mockResolvedValueOnce({ data: { liked: true, like_count: 2 } });

    await likeComment(44);

    expect(mockPost).toHaveBeenCalledWith('/comments/44/like/', {});
  });

  it('unlikes a comment', async () => {
    mockDelete.mockResolvedValueOnce({ data: { liked: false, like_count: 1 } });

    await unlikeComment(44);

    expect(mockDelete).toHaveBeenCalledWith('/comments/44/unlike/');
  });

  it('normalizes auth errors', () => {
    const error = {
      response: { status: 401, data: { detail: 'Auth required.' } },
    };

    const parsed = normalizeLikesApiError(error);

    expect(parsed.status).toBe(401);
    expect(parsed.message).toBe('Please sign in to continue.');
  });
});
