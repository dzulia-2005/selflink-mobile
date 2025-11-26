import { Ionicons } from '@expo/vector-icons';
import { memo } from 'react';
import { Dimensions, Pressable, StyleSheet, Text, View } from 'react-native';

import { VideoPostPlayer } from '@components/VideoPostPlayer';
import { UserAvatar } from '@components/UserAvatar';
import type { Post } from '@schemas/social';
import { usePressScaleAnimation } from '@styles/animations';

type Props = {
  post: Post;
  isActive: boolean;
  muted: boolean;
  onToggleMute: () => void;
  onLike?: (postId: string | number) => void;
  onComment?: (postId: string | number) => void;
  onProfile?: (userId: number) => void;
};

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

function SoulReelItemComponent({
  post,
  isActive,
  muted,
  onToggleMute,
  onLike,
  onComment,
  onProfile,
}: Props) {
  const pressAnim = usePressScaleAnimation(0.95);
  const likeAnim = usePressScaleAnimation(1.12);

  const handleLike = () => {
    likeAnim.onPressIn();
    onLike?.(post.id);
  };

  return (
    <View style={[styles.container, { height: SCREEN_HEIGHT }]}>
      {post.video ? (
        <VideoPostPlayer source={post.video} shouldPlay={isActive} mode="reel" muted={muted} />
      ) : null}

      <View style={styles.overlay}>
        <Pressable
          style={styles.authorRow}
          onPress={() => onProfile?.(post.author.id)}
          hitSlop={12}
        >
          <UserAvatar uri={post.author.photo} label={post.author.name} size={40} />
          <View style={styles.authorMeta}>
            <Text style={styles.author}>{post.author?.name ?? 'SelfLink user'}</Text>
            <Text style={styles.handle}>@{post.author?.handle ?? 'creator'}</Text>
          </View>
        </Pressable>

        <View style={styles.caption}>
          {post.text ? (
            <Text style={styles.text} numberOfLines={2}>
              {post.text}
            </Text>
          ) : null}
        </View>

        <View style={styles.actions}>
          <Pressable
            onPress={handleLike}
            style={[styles.actionButton, pressAnim.style]}
            onPressIn={likeAnim.onPressIn}
            onPressOut={likeAnim.onPressOut}
            accessibilityLabel="Like reel"
            hitSlop={10}
          >
            <Ionicons
              name={post.liked ? 'heart' : 'heart-outline'}
              size={30}
              color={post.liked ? '#F472B6' : '#E2E8F0'}
            />
            <Text style={styles.actionLabel}>{post.like_count}</Text>
          </Pressable>
          <Pressable
            onPress={() => onComment?.(post.id)}
            style={[styles.actionButton, pressAnim.style]}
            accessibilityLabel="Comment reel"
            hitSlop={10}
          >
            <Ionicons name="chatbubble-ellipses" size={28} color="#E2E8F0" />
            <Text style={styles.actionLabel}>{post.comment_count}</Text>
          </Pressable>
          <Pressable
            onPress={onToggleMute}
            style={[styles.actionButton, pressAnim.style]}
            accessibilityLabel="Toggle sound"
            hitSlop={10}
          >
            <Ionicons
              name={muted ? 'volume-mute' : 'volume-high'}
              size={26}
              color="#E2E8F0"
            />
            <Text style={styles.actionLabel}>{muted ? 'Mute' : 'Sound'}</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

export const SoulReelItem = memo(SoulReelItemComponent);

const styles = StyleSheet.create({
  container: {
    width: '100%',
    backgroundColor: '#000',
  },
  overlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: 16,
    gap: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  caption: {
    flex: 1,
    paddingRight: 12,
    gap: 4,
  },
  authorRow: {
    position: 'absolute',
    left: 16,
    top: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(0,0,0,0.35)',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 14,
  },
  authorMeta: {
    flexDirection: 'column',
    gap: 2,
  },
  author: {
    color: '#F8FAFC',
    fontWeight: '700',
    fontSize: 16,
  },
  handle: {
    color: '#CBD5E1',
    fontSize: 12,
  },
  text: {
    color: '#E2E8F0',
    fontSize: 14,
  },
  actions: {
    gap: 18,
    alignItems: 'center',
  },
  actionButton: {
    alignItems: 'center',
    gap: 4,
  },
  actionLabel: {
    color: '#E2E8F0',
    fontWeight: '700',
  },
});
