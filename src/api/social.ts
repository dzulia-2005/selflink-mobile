import { isAxiosError } from 'axios';

import type { FeedItem, FeedResponse } from '@schemas/feed';
import type { Comment, Post } from '@schemas/social';

import { apiClient } from './client';

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

const asIdentifier = (value: unknown): string | null => {
  if (typeof value === 'string' && value.length > 0) {
    return value;
  }
  if (typeof value === 'number') {
    return String(value);
  }
  return null;
};

const normalizeInsight = (input: any): { title: string; subtitle?: string; cta?: string } | null => {
  if (!input || typeof input !== 'object') {
    return null;
  }
  const title = 'title' in input && typeof (input as any).title === 'string'
    ? (input as any).title
    : null;
  const subtitle =
    'subtitle' in input && typeof (input as any).subtitle === 'string'
      ? (input as any).subtitle
      : undefined;
  const cta =
    'cta' in input && typeof (input as any).cta === 'string'
      ? (input as any).cta
      : undefined;
  if (!title) {
    return null;
  }
  return { title, subtitle, cta };
};

const toPostItem = (entry: any, index: number): FeedItem | null => {
  const post = entry?.post ?? entry;
  if (!post || typeof post !== 'object') {
    return null;
  }
  const id = asIdentifier(entry?.id ?? post?.id ?? index);
  if (!id) {
    return null;
  }
  return {
    type: 'post',
    id,
    post,
  };
};

const toFeedItem = (entry: any, index: number): FeedItem | null => {
  if (!entry || typeof entry !== 'object') {
    return null;
  }
  const type = (entry as any).type;
  if (type === 'mentor_insight') {
    const mentor = normalizeInsight((entry as any).mentor);
    if (!mentor) {
      return null;
    }
    const id = asIdentifier((entry as any).id) ?? `mentor_${index}`;
    return { type: 'mentor_insight', id, mentor };
  }
  if (type === 'matrix_insight') {
    const matrix = normalizeInsight((entry as any).matrix);
    if (!matrix) {
      return null;
    }
    const id = asIdentifier((entry as any).id) ?? `matrix_${index}`;
    return { type: 'matrix_insight', id, matrix };
  }
  if (type === 'post') {
    return toPostItem(entry, index);
  }
  if ('post' in entry) {
    return toPostItem(entry, index);
  }
  if ('text' in entry || 'author' in entry) {
    return toPostItem(entry, index);
  }
  return null;
};

const extractItems = (data: unknown): FeedItem[] => {
  let candidates: any[] = [];
  if (Array.isArray(data)) {
    candidates = data;
  } else if (data && typeof data === 'object') {
    const payload = data as any;
    if (Array.isArray(payload.items)) {
      candidates = payload.items;
    } else if (Array.isArray(payload.results)) {
      candidates = payload.results;
    }
  }
  return candidates
    .map((entry, index) => toFeedItem(entry, index))
    .filter((item): item is FeedItem => Boolean(item));
};

const extractNext = (data: unknown): string | null => {
  if (data && typeof data === 'object' && 'next' in data) {
    const next = (data as any).next;
    if (typeof next === 'string' || next === null) {
      return next;
    }
  }
  return null;
};

export async function getFeed(nextUrl?: string): Promise<FeedResponse> {
  const url = nextUrl ?? FEED_ENDPOINT;
  const { data } = await apiClient.get<unknown>(url);

  return {
    items: extractItems(data),
    nextUrl: extractNext(data),
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

export type CommentImageAttachment = {
  uri: string;
  name?: string;
  type?: string;
};

export type AddCommentPayload = {
  body?: string;
  image?: CommentImageAttachment | null;
  images?: CommentImageAttachment[] | null;
};

const logApiError = (error: unknown, context: string) => {
  if (__DEV__ && isAxiosError(error)) {
    console.warn(`${context} failed`, error.response?.data ?? error.message);
  }
};

type RawComment = Omit<Comment, 'body' | 'image_url' | 'image_urls' | 'images'> & {
  body?: string | null;
  text?: string | null;
  image_url?: string | null;
  image?: string | null;
  image_urls?: Array<string | null> | null;
  images?: Array<string | { url?: string | null; uri?: string | null }> | null;
};

const normalizeComment = (comment: RawComment): Comment => {
  const body =
    typeof comment.body === 'string' && comment.body.length > 0
      ? comment.body
      : typeof comment.text === 'string'
        ? comment.text
        : '';
  const imageUrl =
    comment.image_url ??
    (typeof comment.image === 'string' && comment.image.length > 0
      ? comment.image
      : null);
  const imageUrls = Array.isArray(comment.image_urls)
    ? comment.image_urls.filter(
        (url): url is string => typeof url === 'string' && url.length > 0,
      )
    : null;
  const images = Array.isArray(comment.images)
    ? comment.images
        .map((item) => {
          if (typeof item === 'string') {
            return item;
          }
          if (item && typeof item === 'object') {
            if (typeof item.url === 'string') {
              return item.url;
            }
            if (typeof item.uri === 'string') {
              return item.uri;
            }
          }
          return undefined;
        })
        .filter((url): url is string => typeof url === 'string' && url.length > 0)
    : null;
  return {
    ...comment,
    body,
    image_url: imageUrl ?? null,
    image_urls: imageUrls,
    images,
  };
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

export async function addComment(
  postId: string,
  payload: AddCommentPayload,
): Promise<Comment> {
  const trimmed = payload.body?.trim() ?? '';
  const attachments: CommentImageAttachment[] = [];
  if (payload.images && payload.images.length > 0) {
    attachments.push(...payload.images);
  } else if (payload.image) {
    attachments.push(payload.image);
  }
  const hasImage = attachments.length > 0;
  if (!trimmed && !hasImage) {
    throw new Error('Write a comment or attach a photo.');
  }
  try {
    const endpoint = '/comments/';
    if (hasImage) {
      const formData = new FormData();
      formData.append('post', String(postId));
      formData.append('body', trimmed);
      formData.append('text', trimmed);
      attachments.forEach((attachment, index) => {
        formData.append('images', {
          uri: attachment.uri,
          name: attachment.name ?? `comment-photo-${index + 1}.jpg`,
          type: attachment.type ?? 'image/jpeg',
        } as unknown as Blob);
      });

      const { data } = await apiClient.post<RawComment>(endpoint, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return normalizeComment(data);
    }

    const { data } = await apiClient.post<RawComment>(endpoint, {
      post: String(postId),
      body: trimmed,
      text: trimmed,
    });
    return normalizeComment(data);
  } catch (error) {
    logApiError(error, 'addComment');
    throw error;
  }
}

export async function getPostComments(
  postId: string | number,
  page?: number,
): Promise<Comment[]> {
  const url = buildQuery('/comments/', {
    post: String(postId),
    page,
  });
  const { data } = await apiClient.get<unknown>(url);
  if (Array.isArray(data)) {
    return (data as RawComment[]).map(normalizeComment);
  }
  if (data && typeof data === 'object' && Array.isArray((data as any).results)) {
    const results = (data as { results: RawComment[] }).results ?? [];
    return results.map(normalizeComment);
  }
  return [];
}
