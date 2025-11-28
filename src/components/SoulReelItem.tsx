import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Dimensions, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { followUser, unfollowUser } from '@api/users';
import { UserAvatar } from '@components/UserAvatar';
import { VideoPostPlayer } from '@components/VideoPostPlayer';
import type { Post } from '@schemas/social';
import { useAuthStore } from '@store/authStore';
import { theme } from '@theme';

import { usePressScaleAnimation } from '../styles/animations';

type Props = {
  post: Post;
  isActive: boolean;
  isScreenFocused: boolean;
  muted: boolean;
  onMuteChange: (next: boolean) => void;
  onLike?: (postId: string | number) => void;
  onComment?: (post: Post) => void;
  onShare?: (post: Post) => void;
  onProfile?: (userId: number) => void;
  index: number;
};

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const deriveFollowing = (post: Post) => {
  if ((post.author as any).is_following !== undefined) {
    return Boolean((post.author as any).is_following);
  }
  const flags = post.author.flags as Record<string, unknown> | undefined;
  if (flags) {
    if ((flags as any).following !== undefined) {
      return Boolean((flags as any).following);
    }
    if ((flags as any).is_following !== undefined) {
      return Boolean((flags as any).is_following);
    }
  }
  return false;
};

function SoulReelItemComponent({
  post,
  isActive,
  isScreenFocused,
  muted,
  onMuteChange,
  onLike,
  onComment,
  onShare,
  onProfile,
  index,
}: Props) {
  const insets = useSafeAreaInsets();
  const overlayAnim = useRef(new Animated.Value(isActive ? 1 : 0)).current;
  const infoOpacity = useRef(new Animated.Value(0)).current;
  const currentUserId = useAuthStore((state) => state.currentUser?.id);
  const [followPending, setFollowPending] = useState(false);
  const [isFollowing, setIsFollowing] = useState(() => deriveFollowing(post));
  const pressAnim = usePressScaleAnimation(0.97);
  const [showInfo, setShowInfo] = useState(false);

  useEffect(() => {
    setIsFollowing(deriveFollowing(post));
  }, [post]);

  useEffect(() => {
    Animated.timing(overlayAnim, {
      toValue: isActive ? 1 : 0,
      duration: 160,
      useNativeDriver: true,
    }).start();
  }, [isActive, overlayAnim]);

  useEffect(() => {
    Animated.timing(infoOpacity, {
      toValue: showInfo ? 1 : 0,
      duration: 180,
      useNativeDriver: true,
    }).start();
  }, [showInfo, infoOpacity]);

  useEffect(() => {
    if (!isActive) {
      setShowInfo(false);
    }
  }, [isActive]);

  const overlayStyle = useMemo(
    () => ({
      opacity: overlayAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0.2, 1],
      }),
      transform: [
        {
          scale: overlayAnim.interpolate({
            inputRange: [0, 1],
            outputRange: [0.96, 1],
          }),
        },
      ],
    }),
    [overlayAnim],
  );

  const handleLike = useCallback(() => {
    onLike?.(post.id);
  }, [onLike, post.id]);

  const handleFollowToggle = useCallback(async () => {
    if (followPending || post.author.id === currentUserId) {
      return;
    }
    const next = !isFollowing;
    setFollowPending(true);
    setIsFollowing(next);
    try {
      if (next) {
        await followUser(post.author.id);
      } else {
        await unfollowUser(post.author.id);
      }
    } catch {
      setIsFollowing(!next);
    } finally {
      setFollowPending(false);
    }
  }, [currentUserId, followPending, isFollowing, post.author.id]);

  const handleShare = useCallback(() => onShare?.(post), [onShare, post]);

  const showFollowButton = post.author.id !== currentUserId;
  const showSwipeHint = index < 2;

  const bottomOffset = Math.max(insets.bottom, 10);
  const bottomClusterOffset = useMemo(
    () => ({ paddingBottom: bottomOffset + 12, right: 16 }),
    [bottomOffset],
  );
  const infoButtonOffset = useMemo(
    () => ({ bottom: bottomOffset + 54, right: 18 }),
    [bottomOffset],
  );
  const captionOffset = useMemo(() => ({ bottom: bottomOffset + 96 }), [bottomOffset]);

  return (
    <View style={[styles.container, { height: SCREEN_HEIGHT }]}>
      <LinearGradient
        colors={[theme.reels.backgroundStart, theme.reels.backgroundEnd]}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.ring} pointerEvents="none" />

      {post.video ? (
        <View style={styles.videoShell}>
          <VideoPostPlayer
            source={post.video}
            shouldAutoplay={isActive}
            isScreenFocused={isScreenFocused}
            mode="reel"
            mutedDefault={muted}
            onMuteChange={onMuteChange}
          />
        </View>
      ) : null}

      <View style={styles.overlay} pointerEvents="box-none">
        <Animated.View
          style={[
            styles.actions,
            overlayStyle,
            { paddingBottom: Math.max(insets.bottom, 16) + 90 },
          ]}
          pointerEvents="box-none"
        >
          <AnimatedPressable
            onPress={handleLike}
            style={[styles.actionButton, pressAnim.style]}
            hitSlop={10}
            accessibilityLabel="Like reel"
          >
            <View style={styles.iconCircle}>
              <Ionicons
                name={post.liked ? 'heart' : 'heart-outline'}
                size={26}
                color={post.liked ? theme.reels.accentLike : theme.reels.accentIcon}
              />
            </View>
            <Text style={styles.actionLabel}>{post.like_count}</Text>
          </AnimatedPressable>
          <AnimatedPressable
            onPress={() => onComment?.(post)}
            style={[styles.actionButton, pressAnim.style]}
            hitSlop={10}
            accessibilityLabel="Comment reel"
          >
            <View style={styles.iconCircle}>
              <Ionicons
                name="chatbubble-ellipses"
                size={24}
                color={theme.reels.accentIcon}
              />
            </View>
            <Text style={styles.actionLabel}>{post.comment_count}</Text>
          </AnimatedPressable>
          <AnimatedPressable
            onPress={handleShare}
            style={[styles.actionButton, pressAnim.style]}
            hitSlop={10}
            accessibilityLabel="Share reel"
          >
            <View style={styles.iconCircle}>
              <Ionicons name="arrow-redo" size={24} color={theme.reels.accentIcon} />
            </View>
            <Text style={styles.actionLabel}>Share</Text>
          </AnimatedPressable>
        </Animated.View>

        <Animated.View
          style={[styles.bottomCluster, overlayStyle, bottomClusterOffset]}
          pointerEvents="box-none"
        >
          <View style={styles.metaRow}>
            <Pressable
              style={styles.authorMeta}
              onPress={() => onProfile?.(post.author.id)}
              hitSlop={10}
            >
              <UserAvatar uri={post.author.photo} label={post.author.name} size={32} />
              <Text style={styles.author} numberOfLines={1}>
                {post.author?.name ?? 'SelfLink user'}
              </Text>
              {showFollowButton ? (
                <Pressable
                  onPress={handleFollowToggle}
                  style={[styles.followBadge, isFollowing && styles.followingBadge]}
                  disabled={followPending}
                  hitSlop={6}
                >
                  <Text style={styles.followLabel}>
                    {followPending ? '…' : isFollowing ? 'Following' : 'Follow'}
                  </Text>
                </Pressable>
              ) : null}
            </Pressable>
          </View>
        </Animated.View>

        {showSwipeHint ? (
          <View
            style={[styles.swipeHint, { top: SCREEN_HEIGHT * 0.46 }]}
            pointerEvents="none"
          >
            <Ionicons name="chevron-up" size={18} color="rgba(226,232,240,0.6)" />
            <Ionicons name="chevron-down" size={18} color="rgba(226,232,240,0.6)" />
          </View>
        ) : null}

        <Pressable
          style={[styles.infoButton, infoButtonOffset]}
          onPress={() => setShowInfo((prev) => !prev)}
          hitSlop={8}
          testID="reel-info-toggle"
        >
          <Ionicons
            name={showInfo ? 'information-circle' : 'information-circle-outline'}
            size={20}
            color={theme.reels.textPrimary}
          />
        </Pressable>

        {post.text && showInfo ? (
          <Animated.View
            style={[styles.captionOverlay, captionOffset, { opacity: infoOpacity }]}
            pointerEvents="none"
          >
            <Text style={styles.captionText} numberOfLines={5} ellipsizeMode="tail">
              {post.text}
            </Text>
          </Animated.View>
        ) : null}
      </View>
    </View>
  );
}

export const SoulReelItem = memo(SoulReelItemComponent);

const styles = StyleSheet.create({
  container: {
    width: '100%',
    backgroundColor: theme.reels.backgroundEnd,
  },
  ring: {
    position: 'absolute',
    width: 360,
    height: 360,
    borderRadius: 180,
    backgroundColor: 'rgba(59,130,246,0.06)',
    top: '28%',
    left: '14%',
    transform: [{ translateX: -40 }],
  },
  videoShell: {
    flex: 1,
    backgroundColor: '#000',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    paddingHorizontal: 16,
  },
  authorMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(15,23,42,0.35)',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.35)',
    flexShrink: 1,
  },
  author: {
    color: theme.reels.textPrimary,
    fontWeight: '700',
    fontSize: 13,
  },
  followBadge: {
    marginLeft: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    borderWidth: 1,
    backgroundColor: 'rgba(34,197,94,0.25)',
    borderColor: 'rgba(34,197,94,0.7)',
  },
  followingBadge: {
    backgroundColor: 'rgba(148,163,184,0.18)',
    borderColor: 'rgba(148,163,184,0.6)',
  },
  followLabel: {
    color: theme.reels.textPrimary,
    fontWeight: '700',
    letterSpacing: 0.2,
    fontSize: 11,
  },
  actions: {
    position: 'absolute',
    right: 6,
    bottom: 0,
    alignItems: 'center',
    gap: 16,
  },
  actionButton: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  iconCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.reels.overlayGlass,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.4)',
  },
  actionLabel: {
    color: theme.reels.textPrimary,
    fontWeight: '700',
  },
  bottomCluster: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingTop: 6,
    gap: 8,
    alignItems: 'flex-end',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    justifyContent: 'space-between',
  },
  captionText: {
    color: theme.reels.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  swipeHint: {
    position: 'absolute',
    right: 12,
    gap: 4,
    opacity: 0.4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoButton: {
    position: 'absolute',
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(15,23,42,0.5)',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.45)',
  },
  captionOverlay: {
    position: 'absolute',
    left: 16,
    right: 16,
    padding: 12,
    borderRadius: 16,
    backgroundColor: 'rgba(15,23,42,0.85)',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.4)',
  },
});
