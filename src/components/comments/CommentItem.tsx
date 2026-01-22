import { memo, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { UserAvatar } from '@components/UserAvatar';
import { CommentContent } from '@components/comments/CommentContent';
import type { CommentWithOptimistic } from '@components/comments/types';
import { theme } from '@theme';

type Props = {
  comment: CommentWithOptimistic;
};

const formatTimestamp = (value: string | undefined) => {
  if (!value) {
    return '';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString();
};

function CommentItemComponent({ comment }: Props) {
  const timestamp = useMemo(
    () => formatTimestamp(comment.created_at),
    [comment.created_at],
  );
  return (
    <View
      style={[styles.row, comment.__optimistic ? styles.rowOptimistic : null]}
    >
      <UserAvatar uri={comment.author.photo} label={comment.author.name} size={34} />
      <View style={styles.body}>
        <View style={styles.header}>
          <Text style={styles.author}>{comment.author.name}</Text>
          {timestamp ? <Text style={styles.meta}>{timestamp}</Text> : null}
        </View>
        <CommentContent
          text={comment.body}
          media={comment.media}
          legacySources={(comment as any)?.images}
        />
      </View>
    </View>
  );
}

export const CommentItem = memo(CommentItemComponent);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 10,
  },
  rowOptimistic: {
    opacity: 0.6,
  },
  body: {
    flex: 1,
    gap: 6,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    alignItems: 'center',
  },
  author: {
    color: theme.reels.textPrimary,
    fontWeight: '700',
    flexShrink: 1,
  },
  meta: {
    color: theme.reels.textSecondary,
    fontSize: 12,
  },
});
