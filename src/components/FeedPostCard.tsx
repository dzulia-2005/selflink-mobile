import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { memo, useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Pressable as RNPressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { followUser, unfollowUser } from '@api/users';
import { PostContent } from '@components/PostContent';
import { usePulseAnimation } from '@hooks/usePulseAnimation';
import type { Post } from '@schemas/social';
import { useAuthStore } from '@store/authStore';
import { useFeedStore } from '@store/feedStore';
import { theme } from '@theme';

import { UserAvatar } from './UserAvatar';
import { useEntranceAnimation, usePressScaleAnimation } from '../styles/animations';

interface Props {
  post: Post;
  shouldPlayVideo?: boolean;
  isFeedFocused?: boolean;
}

const AnimatedPressable = Animated.createAnimatedComponent(RNPressable);

function FeedPostCardComponent({ post, shouldPlayVideo = false, isFeedFocused }: Props) {
  const navigation = useNavigation<any>();
  const currentUserId = useAuthStore((state) => state.currentUser?.id);
  const likePost = useFeedStore((state) => state.likePost);
  const unlikePost = useFeedStore((state) => state.unlikePost);
  const entrance = useEntranceAnimation();
  const pressAnim = usePressScaleAnimation(0.985);
  const likePress = usePressScaleAnimation(0.96);
  const commentPress = usePressScaleAnimation(0.96);
  const heartScale = useRef(new Animated.Value(0)).current;
  const [pulseKey, setPulseKey] = useState(0);
  const [followPending, setFollowPending] = useState(false);
  const [likePending, setLikePending] = useState(false);
  const pulse = usePulseAnimation(pulseKey);
  const [isFollowing, setIsFollowing] = useState(() => {
    if ((post.author as any).is_following !== undefined) {
      return Boolean((post.author as any).is_following);
    }
    const flags = post.author.flags as Record<string, unknown> | undefined;
    if (!flags) {
      return false;
    }
    return Boolean(flags.following || flags.is_following);
  });

  const handleLikeToggle = useCallback(async () => {
    if (likePending) {
      return;
    }
    setLikePending(true);
    try {
      if (post.liked) {
        await unlikePost(post.id);
      } else {
        await likePost(post.id);
        setPulseKey((k) => k + 1);
      }
    } catch (error) {
      console.warn('FeedPostCard: like toggle failed', error);
      Alert.alert('Unable to update like', 'Please try again.');
    } finally {
      setLikePending(false);
    }
  }, [likePending, likePost, unlikePost, post.id, post.liked]);

  const handleFollowToggle = useCallback(async () => {
    if (followPending || post.author.id === currentUserId) {
      return;
    }
    setFollowPending(true);
    try {
      if (isFollowing) {
        await unfollowUser(post.author.id);
        setIsFollowing(false);
      } else {
        await followUser(post.author.id);
        setIsFollowing(true);
      }
    } catch (error) {
      console.warn('FeedPostCard: follow toggle failed', error);
    } finally {
      setFollowPending(false);
    }
  }, [currentUserId, isFollowing, post.author.id, followPending]);

  const lastTap = useRef(0);
  const previousLikedRef = useRef(post.liked);
  useEffect(() => {
    if (!previousLikedRef.current && post.liked) {
      setPulseKey((k) => k + 1);
    }
    previousLikedRef.current = post.liked;
  }, [post.liked]);

  const triggerHeart = useCallback(() => {
    heartScale.setValue(0);
    Animated.spring(heartScale, {
      toValue: 1,
      useNativeDriver: true,
      friction: 4,
      tension: 90,
    }).start(() => heartScale.setValue(0));
  }, [heartScale]);

  const handleOpenDetails = useCallback(() => {
    navigation.navigate('PostDetails', { postId: post.id, post });
  }, [navigation, post]);

  const handleBodyPress = useCallback(() => {
    const now = Date.now();
    if (now - lastTap.current < 300) {
      triggerHeart();
      if (!post.liked) {
        handleLikeToggle().catch(() => undefined);
      }
    } else {
      handleOpenDetails();
    }
    lastTap.current = now;
  }, [handleLikeToggle, handleOpenDetails, post.liked, triggerHeart]);

  const handleOpenProfile = useCallback(() => {
    navigation.navigate('UserProfile', { userId: post.author.id });
  }, [navigation, post.author.id]);

  return (
    <Animated.View style={[styles.wrapper, entrance.style]}>
      <AnimatedPressable
        onPressIn={pressAnim.onPressIn}
        onPressOut={pressAnim.onPressOut}
        style={[styles.card, pressAnim.style]}
      >
        <LinearGradient
          colors={[theme.feed.accentBlue, theme.feed.accentCyan]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.cardGradient}
        >
          <View style={styles.cardInner}>
            <View style={styles.header}>
              <TouchableOpacity onPress={handleOpenProfile} activeOpacity={0.9}>
                <View style={styles.avatarWrap}>
                  <UserAvatar
                    uri={post.author.photo}
                    label={post.author.name}
                    size={42}
                  />
                </View>
              </TouchableOpacity>
              <TouchableOpacity style={styles.meta} onPress={handleOpenProfile}>
                <Text style={styles.author}>{post.author.name}</Text>
                <Text style={styles.handle}>@{post.author.handle}</Text>
                <Text style={styles.timestamp}>
                  {new Date(post.created_at).toLocaleString()}
                </Text>
              </TouchableOpacity>
              {post.author.id !== currentUserId && (
                <TouchableOpacity
                  style={styles.followButton}
                  onPress={handleFollowToggle}
                  disabled={followPending}
                >
                  <Text style={styles.followButtonText}>
                    {followPending ? '…' : isFollowing ? 'Following' : 'Follow'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            <TouchableOpacity onPress={handleBodyPress} activeOpacity={0.92}>
              <View style={styles.body}>
                <PostContent
                  text={post.text}
                  media={post.media}
                  video={post.video}
                  shouldAutoplay={shouldPlayVideo}
                  isScreenFocused={isFeedFocused}
                  legacySources={[
                    post.images,
                    post.image_urls,
                    post.image_url,
                    (post as any)?.image,
                    (post as any)?.photo,
                    (post as any)?.photos,
                  ]}
                />
              </View>
            </TouchableOpacity>

            <View style={styles.divider} />

            <View style={styles.footer}>
              <TouchableOpacity
                onPress={handleLikeToggle}
                accessibilityRole="button"
                disabled={likePending}
                onPressIn={likePress.onPressIn}
                onPressOut={likePress.onPressOut}
                style={[
                  styles.actionPill,
                  likePending && styles.likeDisabled,
                  likePress.style,
                ]}
                activeOpacity={0.9}
              >
                <LinearGradient
                  colors={
                    post.liked
                      ? [
                          theme.feed.actionLikedBackground,
                          theme.feed.actionLikedBackground,
                        ]
                      : ['rgba(15,23,42,0.85)', 'rgba(15,23,42,0.85)']
                  }
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[
                    styles.actionGradient,
                    post.liked && styles.actionGradientLiked,
                  ]}
                >
                  <Animated.View style={[styles.actionContent, pulse.animatedStyle]}>
                    <Ionicons
                      name={post.liked ? 'heart' : 'heart-outline'}
                      size={16}
                      color={
                        post.liked
                          ? '#FCA5A5'
                          : (theme.feed.textSecondary as unknown as string)
                      }
                      style={styles.actionIcon}
                    />
                    <Text
                      style={[styles.actionText, post.liked && styles.actionTextActive]}
                    >
                      {post.liked ? 'Unlike' : 'Like'} • {post.like_count}
                    </Text>
                  </Animated.View>
                </LinearGradient>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleOpenDetails}
                accessibilityRole="button"
                style={[styles.actionPill, commentPress.style]}
                activeOpacity={0.85}
                onPressIn={commentPress.onPressIn}
                onPressOut={commentPress.onPressOut}
              >
                <LinearGradient
                  colors={['rgba(15,23,42,0.85)', 'rgba(15,23,42,0.85)']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.actionGradient}
                >
                  <View style={styles.actionContent}>
                    <Ionicons
                      name="chatbubble-ellipses-outline"
                      size={16}
                      color={theme.feed.textSecondary as unknown as string}
                      style={styles.actionIcon}
                    />
                    <Text style={styles.actionText}>Comments • {post.comment_count}</Text>
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </LinearGradient>
        <Animated.View
          pointerEvents="none"
          style={[
            styles.heartBurst,
            {
              transform: [{ scale: heartScale }],
              opacity: heartScale,
            },
          ]}
        >
          <Text style={styles.heartIcon}>♥</Text>
        </Animated.View>
      </AnimatedPressable>
    </Animated.View>
  );
}

export const FeedPostCard = memo(FeedPostCardComponent);

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 14,
  },
  card: {
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  cardGradient: {
    padding: 1.5,
    borderRadius: 24,
  },
  cardInner: {
    backgroundColor: theme.feed.cardBackground,
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.feed.cardBorder,
  },
  header: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  avatarWrap: {
    padding: 2,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.4)',
    backgroundColor: 'rgba(15,23,42,0.6)',
  },
  meta: {
    flex: 1,
  },
  author: {
    fontWeight: '800',
    color: theme.feed.textPrimary,
    fontSize: 16,
    letterSpacing: 0.2,
  },
  handle: {
    color: theme.feed.textSecondary,
    fontSize: 13,
    marginTop: 2,
  },
  timestamp: {
    color: 'rgba(148,163,184,0.7)',
    fontSize: 12,
    marginTop: 2,
  },
  followButton: {
    borderWidth: 1,
    borderColor: 'rgba(56,189,248,0.75)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
    alignSelf: 'center',
    backgroundColor: 'rgba(15,23,42,0.8)',
  },
  followButtonText: {
    color: '#E0F2FE',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  body: {
    marginTop: 14,
  },
  divider: {
    height: 1,
    backgroundColor: theme.feed.glow,
    marginTop: 16,
  },
  footer: {
    marginTop: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  actionPill: {
    flex: 1,
    borderRadius: 999,
    overflow: 'hidden',
  },
  actionGradient: {
    width: '100%',
    height: 40,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.feed.actionBorder,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  actionGradientLiked: {
    borderColor: theme.feed.actionLikedBorder,
    backgroundColor: theme.feed.actionLikedBackground,
  },
  actionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: {
    color: 'rgba(226,232,240,0.8)',
    fontWeight: '700',
    fontSize: 14,
    textAlign: 'center',
  },
  actionTextActive: {
    color: '#FCA5A5',
  },
  actionIcon: {
    marginRight: 8,
  },
  likeDisabled: {
    opacity: 0.6,
  },
  heartBurst: {
    position: 'absolute',
    right: 18,
    bottom: 36,
  },
  heartIcon: {
    fontSize: 28,
    color: '#F472B6',
    textShadowColor: 'rgba(244,114,182,0.5)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 12,
  },
});
