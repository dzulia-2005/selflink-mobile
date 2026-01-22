import type { Comment } from '@schemas/social';

export type CommentTargetType = 'post' | 'reel';

export type CommentWithOptimistic = Comment & {
  __optimistic?: boolean;
};
