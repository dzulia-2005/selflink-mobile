import { apiClient } from '@services/api/client';

export type FeedPostAuthor = {
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
  followers_count?: number;
  following_count?: number;
  posts_count?: number;
  is_following?: boolean;
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

export type FeedPostMedia = {
  id: number;
  s3_key: string;
  mime: string;
  width: number;
  height: number;
  duration: number;
  status: string;
  checksum: string;
  meta: Record<string, unknown> | string;
  created_at: string;
};

export type FeedPost = {
  id: number;
  author: FeedPostAuthor;
  text: string;
  visibility: string;
  language: string;
  media: FeedPostMedia[];
  like_count: number;
  comment_count: number;
  liked: boolean;
  created_at: string;
};

export type FeedItem = {
  id: number;
  post: FeedPost;
  score: number;
  created_at: string;
};

export type FeedResponse = {
  next: string | null;
  previous: string | null;
  results: FeedItem[];
};

export type HomeHighlight = {
  id: number;
  post: FeedPost;
  score: number;
  created_at: string;
};

export type HomeHighlightsResponse = {
  results: HomeHighlight[];
};

export type FeedQuery = {
  cursor?: string;
  ordering?: string;
  page_size?: number;
  search?: string;
};

export async function fetchHomeFeed(params: FeedQuery = {}): Promise<FeedResponse> {
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
  const path = `/api/v1/feed/home/${qs ? `?${qs}` : ''}`;
  return apiClient.request<FeedResponse>(path, { method: 'GET' });
}

export async function fetchHomeHighlights(): Promise<HomeHighlightsResponse> {
  return apiClient.request<HomeHighlightsResponse>('/api/v1/home/highlights/', {
    method: 'GET',
  });
}
