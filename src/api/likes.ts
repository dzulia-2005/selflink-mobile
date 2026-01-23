import { apiClient } from '@api/client';

export type LikeResponse = {
  liked: boolean;
  like_count: number;
};

export type NormalizedLikeError = {
  message: string;
  status?: number;
  code?: string;
};

const normalizeLikeError = (
  error: unknown,
  fallbackMessage = 'Unable to update like.',
): NormalizedLikeError => {
  if (!error || typeof error !== 'object') {
    return { message: fallbackMessage };
  }
  const err = error as { response?: { status?: number; data?: any }; message?: string };
  const status = err.response?.status;
  const data = err.response?.data ?? {};
  const detail =
    typeof data === 'string'
      ? data
      : typeof data?.detail === 'string'
        ? data.detail
        : err.message;
  let message = detail || fallbackMessage;

  if (status === 401) {
    message = 'Please sign in to continue.';
  } else if (status === 403) {
    message = 'You do not have permission to perform this action.';
  } else if (status === 429) {
    message = 'Too many requests; try again in a moment.';
  }

  const code = typeof data?.code === 'string' ? data.code : undefined;
  return { message, status, code };
};

export const normalizeLikesApiError = normalizeLikeError;

export async function likePost(postId: string | number): Promise<LikeResponse> {
  const { data } = await apiClient.post<LikeResponse>(
    `/feed/posts/${postId}/like/`,
    {},
  );
  return data;
}

export async function unlikePost(postId: string | number): Promise<LikeResponse> {
  const { data } = await apiClient.delete<LikeResponse>(
    `/feed/posts/${postId}/like/`,
  );
  return data;
}

export async function likeComment(
  commentId: string | number,
): Promise<LikeResponse> {
  const { data } = await apiClient.post<LikeResponse>(
    `/feed/comments/${commentId}/like/`,
    {},
  );
  return data;
}

export async function unlikeComment(
  commentId: string | number,
): Promise<LikeResponse> {
  const { data } = await apiClient.delete<LikeResponse>(
    `/feed/comments/${commentId}/like/`,
  );
  return data;
}
