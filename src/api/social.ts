import { isAxiosError } from 'axios';

import { apiClient } from './client';
import type { Comment, Post, TimelineEntry } from '@schemas/social';

type QueryParams = Record<string, string | number | undefined>;

const FEED_ENDPOINT = '/feed/home/';

const buildQuery = (path: string, params?: QueryParams) => {
  if (!params) {
    return path;
  }
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null) {
      return;
    }
    search.append(key, String(value));
  });
  const query = search.toString();
  return query ? `${path}?${query}` : path;
};

export interface FeedResponse {
  results: TimelineEntry[];
  nextUrl: string | null;
}

export async function getFeed(nextUrl?: string): Promise<FeedResponse> {
  const url = nextUrl ?? FEED_ENDPOINT;
  const { data } = await apiClient.get<unknown>(url);

  const entries: TimelineEntry[] = Array.isArray(data)
    ? data
    : Array.isArray((data as any)?.results)
      ? ((data as { results: TimelineEntry[] }).results ?? [])
      : [];

  const next =
    (typeof data === 'object' && data !== null && 'next' in data
      ? (data as { next?: string | null }).next
      : null) ?? null;

  return {
    results: entries,
    nextUrl: next,
  };
}

export async function getPost(postId: string | number): Promise<Post> {
  const { data } = await apiClient.get<Post>(`/posts/${postId}/`);
  return data;
}

export interface CreatePostPayload {
  content: string;
  imageUris?: string[];
  visibility?: string;
  language?: string;
}

export async function createPost(payload: CreatePostPayload): Promise<Post> {
  if (payload.imageUris && payload.imageUris.length > 0) {
    const formData = new FormData();
    formData.append('text', payload.content);
    if (payload.visibility) {
      formData.append('visibility', payload.visibility);
    }
    if (payload.language) {
      formData.append('language', payload.language);
    }
    payload.imageUris.forEach((uri, index) => {
      formData.append('images', {
        uri,
        name: `upload-${index}.jpg`,
        type: 'image/jpeg',
      } as unknown as Blob);
    });
    const { data } = await apiClient.post<Post>('/posts/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  }
  const { data } = await apiClient.post<Post>('/posts/', {
    text: payload.content,
    visibility: payload.visibility,
    language: payload.language,
  });
  return data;
}

const logApiError = (error: unknown, context: string) => {
  if (__DEV__ && isAxiosError(error)) {
    console.warn(`${context} failed`, error.response?.data ?? error.message);
  }
};

export async function likePost(postId: string): Promise<void> {
  try {
    await apiClient.post(`/posts/${postId}/like/`, {});
  } catch (error) {
    logApiError(error, 'likePost');
    throw error;
  }
}

export async function unlikePost(postId: string): Promise<void> {
  try {
    await apiClient.post(`/posts/${postId}/unlike/`, {});
  } catch (error) {
    logApiError(error, 'unlikePost');
    throw error;
  }
}

export async function addComment(postId: string, text: string): Promise<Comment> {
  const trimmed = text.trim();
  if (!trimmed) {
    throw new Error('Comment text is required.');
  }
  try {
    const { data } = await apiClient.post<Comment>('/comments/', {
      post: postId,
      text: trimmed,
    });
    return data;
  } catch (error) {
    logApiError(error, 'addComment');
    throw error;
  }
}

export async function getPostComments(postId: string | number, page?: number): Promise<Comment[]> {
  const url = buildQuery('/comments/', {
    post: String(postId),
    page,
  });
  const { data } = await apiClient.get<Comment[]>(url);
  return data;
}
