import { Ionicons } from '@expo/vector-icons';
import { memo, useMemo } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { UserAvatar } from '@components/UserAvatar';
import { CommentContent } from '@components/comments/CommentContent';
import type { CommentWithOptimistic } from '@components/comments/types';
import { GiftMedia } from '@components/gifts/GiftMedia';
import { useReactionPulse } from '@hooks/useReactionPulse';
import { theme } from '@theme';
import type { GiftPreview } from '@utils/gifts';
import type { GiftCardEffects } from '@utils/giftEffects';

type Props = {
  comment: CommentWithOptimistic;
  liked?: boolean;
  likeCount?: number;
  giftCount?: number;
  giftSyncing?: boolean;
  giftPreviews?: GiftPreview[];
  giftEffects?: GiftCardEffects | null;
  onLikePress?: () => void;
  onGiftPress?: () => void;
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

function CommentItemComponent({
  comment,
  liked,
  likeCount = 0,
  giftCount = 0,
  giftSyncing = false,
  giftPreviews = [],
  giftEffects = null,
  onLikePress,
  onGiftPress,
}: Props) {
  const timestamp = useMemo(
    () => formatTimestamp(comment.created_at),
    [comment.created_at],
  );
  const giftPulse = useReactionPulse(giftCount);
  const showGiftPreview = giftPreviews.length > 0;
  const badge = giftEffects?.badge;
  const rowEffectStyle = useMemo(() => {
    if (!giftEffects) {
      return null;
    }
    const border = giftEffects.borderGlow;
    const highlight = giftEffects.highlight;
    const style: Record<string, unknown> = {};
    if (border?.color) {
      style.borderColor = border.color;
      style.borderWidth = Math.max(1, border.thickness ?? 1.5);
      style.shadowColor = border.color;
      style.shadowOpacity = 0.2;
      style.shadowRadius = 10;
    }
    if (highlight?.color) {
      style.backgroundColor = highlight.color;
    } else if (highlight) {
      style.backgroundColor = 'rgba(56, 189, 248, 0.08)';
    }
    return Object.keys(style).length ? style : null;
  }, [giftEffects]);

  return (
    <View
      style={[
        styles.row,
        comment.__optimistic ? styles.rowOptimistic : null,
        rowEffectStyle,
      ]}
    >
      <UserAvatar uri={comment.author.photo} label={comment.author.name} size={34} />
      <View style={styles.body}>
        <View style={styles.header}>
          <Text style={styles.author}>{comment.author.name}</Text>
          {timestamp ? <Text style={styles.meta}>{timestamp}</Text> : null}
          {badge?.text ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText} numberOfLines={1}>
                {badge.text}
              </Text>
            </View>
          ) : null}
        </View>
        <CommentContent
          text={comment.body}
          media={comment.media}
          legacySources={(comment as any)?.images}
        />
        {showGiftPreview ? (
          <View style={styles.giftPreviewRow}>
            {giftPreviews.map((gift, index) => (
              <GiftMedia
                key={`${gift.id ?? gift.name ?? 'gift'}-${index}`}
                gift={gift}
                size="sm"
                style={styles.giftPreviewItem}
              />
            ))}
          </View>
        ) : null}
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={onLikePress}
            disabled={!onLikePress}
          >
            <Ionicons
              name={liked ? 'heart' : 'heart-outline'}
              size={14}
              color={liked ? theme.reels.accentLike : theme.reels.textSecondary}
            />
            <Text style={styles.actionText}>{likeCount}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={onGiftPress}
            disabled={!onGiftPress}
          >
            <Animated.View style={giftPulse.animatedStyle}>
              <Ionicons
                name="gift-outline"
                size={14}
                color={theme.reels.textSecondary}
              />
            </Animated.View>
            <Animated.Text style={[styles.actionText, giftPulse.animatedStyle]}>
              {giftCount > 0 ? giftCount : ''}
            </Animated.Text>
            {giftSyncing ? <Text style={styles.syncText}>Syncing…</Text> : null}
          </TouchableOpacity>
        </View>
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
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: 'rgba(56,189,248,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(56,189,248,0.4)',
    marginLeft: 6,
    maxWidth: 120,
  },
  badgeText: {
    fontSize: 10,
    color: theme.reels.textPrimary,
    fontWeight: '700',
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
  actions: {
    flexDirection: 'row',
    gap: 16,
    alignItems: 'center',
    marginTop: 6,
  },
  giftPreviewRow: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  giftPreviewItem: {
    padding: 3,
    borderRadius: 10,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionText: {
    color: theme.reels.textSecondary,
    fontSize: 12,
  },
  syncText: {
    color: theme.reels.textSecondary,
    fontSize: 10,
  },
});
