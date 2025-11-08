import { apiClient } from '@services/api/client';

export type CommentAuthor = {
  id: number;
  email: string;
  handle: string;
  name: string;
  bio: string;
  photo: string;
  birth_date: string | null;
  birth_time: string | null;
  birth_place: string;
  locale: string;
  flags: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  settings: {
    privacy: string;
    dm_policy: string;
    language: string;
    quiet_hours: Record<string, unknown>;
    push_enabled: boolean;
    email_enabled: boolean;
    digest_enabled: boolean;
  };
};

export type Comment = {
  id: number;
  post: number;
  author: CommentAuthor;
  text: string;
  parent: number | null;
  created_at: string;
};

export type CommentsResponse = {
  next: string | null;
  previous: string | null;
  results: Comment[];
};

export type CommentsQuery = {
  cursor?: string;
  ordering?: string;
  page_size?: number;
  search?: string;
};

export async function fetchComments(
  params: CommentsQuery = {},
): Promise<CommentsResponse> {
  const searchParams = new URLSearchParams();
  if (params.cursor) {
    searchParams.set('cursor', params.cursor);
  }
  if (params.ordering) {
    searchParams.set('ordering', params.ordering);
  }
  if (params.page_size) {
    searchParams.set('page_size', String(params.page_size));
  }
  if (params.search) {
    searchParams.set('search', params.search);
  }

  const queryString = searchParams.toString();
  const path = `/api/v1/comments/${queryString ? `?${queryString}` : ''}`;

  return apiClient.request<CommentsResponse>(path, { method: 'GET' });
}

export type CreateCommentPayload = {
  post: number;
  text: string;
  parent?: number | null;
};

export async function createComment(payload: CreateCommentPayload): Promise<Comment> {
  return apiClient.request<Comment>('/api/v1/comments/', {
    method: 'POST',
    body: payload,
  });
}
