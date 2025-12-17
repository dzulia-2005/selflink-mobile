import { apiClient } from '@services/api/client';
import type { FeedPost } from '@services/api/feed';

export type Post = FeedPost;

export type PostListResponse = {
  next: string | null;
  previous: string | null;
  results: Post[];
};

export type PostQuery = {
  cursor?: string;
  ordering?: string;
  page_size?: number;
  search?: string;
};

export type PostPayload = {
  text: string;
  visibility?: 'public' | 'followers' | 'private';
  language?: string;
  media_ids?: number[];
};

export type PostPartialPayload = Partial<PostPayload>;

function buildQuery(path: string, params: PostQuery = {}): string {
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
  const qs = searchParams.toString();
  return `${path}${qs ? `?${qs}` : ''}`;
}

export async function listPosts(params: PostQuery = {}): Promise<PostListResponse> {
  return apiClient.request<PostListResponse>(buildQuery('/posts/', params), {
    method: 'GET',
  });
}

export async function createPost(payload: PostPayload): Promise<Post> {
  return apiClient.request<Post>('/posts/', {
    method: 'POST',
    body: payload,
  });
}

export async function getPost(id: number): Promise<Post> {
  return apiClient.request<Post>(`/posts/${id}/`, { method: 'GET' });
}

export async function updatePost(id: number, payload: PostPayload): Promise<Post> {
  return apiClient.request<Post>(`/posts/${id}/`, {
    method: 'PUT',
    body: payload,
  });
}

export async function patchPost(id: number, payload: PostPartialPayload): Promise<Post> {
  return apiClient.request<Post>(`/posts/${id}/`, {
    method: 'PATCH',
    body: payload,
  });
}

export async function deletePost(id: number): Promise<void> {
  await apiClient.request(`/posts/${id}/`, { method: 'DELETE' });
}

export async function likePost(id: number): Promise<void> {
  await apiClient.request(`/posts/${id}/like/`, { method: 'POST' });
}

export async function unlikePost(id: number): Promise<void> {
  await apiClient.request(`/posts/${id}/unlike/`, { method: 'POST' });
}

export type SearchPostsResponse = PostListResponse;

export async function searchPosts(
  query: string,
  params: Omit<PostQuery, 'search'> = {},
): Promise<SearchPostsResponse> {
  const searchParams = new URLSearchParams();
  searchParams.set('q', query);
  if (params.cursor) {
    searchParams.set('cursor', params.cursor);
  }
  if (params.ordering) {
    searchParams.set('ordering', params.ordering);
  }
  if (params.page_size) {
    searchParams.set('page_size', String(params.page_size));
  }
  const qs = searchParams.toString();
  return apiClient.request<SearchPostsResponse>(`/search/posts/${qs ? `?${qs}` : ''}`, {
    method: 'GET',
  });
}

export type SearchUsersResponse = {
  next: string | null;
  previous: string | null;
  results: FeedPost['author'][];
};

export async function searchUsers(
  query: string,
  params: Omit<PostQuery, 'search'> = {},
): Promise<SearchUsersResponse> {
  const searchParams = new URLSearchParams();
  searchParams.set('q', query);
  if (params.cursor) {
    searchParams.set('cursor', params.cursor);
  }
  if (params.ordering) {
    searchParams.set('ordering', params.ordering);
  }
  if (params.page_size) {
    searchParams.set('page_size', String(params.page_size));
  }
  const qs = searchParams.toString();
  return apiClient.request<SearchUsersResponse>(`/search/users/${qs ? `?${qs}` : ''}`, {
    method: 'GET',
  });
}
