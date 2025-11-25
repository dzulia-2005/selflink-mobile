import type { Identifier, Post } from './social';

export type MentorInsightCard = {
  title: string;
  subtitle?: string;
  cta?: string;
};

export type MatrixInsightCard = {
  title: string;
  subtitle?: string;
  cta?: string;
};

export type PostFeedItem = {
  type: 'post';
  id: Identifier;
  post: Post;
};

export type MentorInsightFeedItem = {
  type: 'mentor_insight';
  id: Identifier;
  mentor: MentorInsightCard;
};

export type MatrixInsightFeedItem = {
  type: 'matrix_insight';
  id: Identifier;
  matrix: MatrixInsightCard;
};

export type FeedItem = PostFeedItem | MentorInsightFeedItem | MatrixInsightFeedItem;

export interface FeedResponse {
  items: FeedItem[];
  nextUrl: string | null;
}
