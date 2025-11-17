import { User } from './user';

export type Identifier = string;

export interface MediaAsset {
  id: Identifier;
  s3_key: string;
  mime: string;
  width: number | null;
  height: number | null;
  duration: number | null;
  status: string;
  checksum: string | null;
  meta: Record<string, unknown> | null;
  created_at: string;
}

export interface Post {
  id: Identifier;
  author: User;
  text: string;
  visibility: string;
  language: string;
  media: MediaAsset[];
  like_count: number;
  comment_count: number;
  liked: boolean;
  created_at: string;
}

export interface PostInput {
  text: string;
  visibility?: string;
  language?: string;
  media_ids?: Identifier[];
}

export interface Comment {
  id: Identifier;
  post: Identifier;
  author: User;
  body: string;
  text?: string;
  image_url?: string | null;
  parent: number | null;
  created_at: string;
}

export interface CommentInput {
  post: Identifier;
  body: string;
  text?: string;
  parent?: Identifier | null;
}

export interface TimelineEntry {
  id: Identifier;
  post: Post;
  score: number;
  created_at: string;
}

export interface FeedQuery {
  since?: string;
}
