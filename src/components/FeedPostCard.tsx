import { memo, useCallback, useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import { followUser, unfollowUser } from '@api/users';
import { useFeedStore } from '@store/feedStore';
import { useAuthStore } from '@store/authStore';
import type { Post } from '@schemas/social';

import { UserAvatar } from './UserAvatar';

interface Props {
  post: Post;
}

function FeedPostCardComponent({ post }: Props) {
  const navigation = useNavigation<any>();
  const currentUserId = useAuthStore((state) => state.currentUser?.id);
  const likePost = useFeedStore((state) => state.likePost);
  const unlikePost = useFeedStore((state) => state.unlikePost);
  const [followPending, setFollowPending] = useState(false);
  const [likePending, setLikePending] = useState(false);
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

  const handleOpenDetails = useCallback(() => {
    navigation.navigate('PostDetails', { postId: post.id, post });
  }, [navigation, post]);

  const handleOpenProfile = useCallback(() => {
    navigation.navigate('UserProfile', { userId: post.author.id });
  }, [navigation, post.author.id]);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleOpenProfile}>
          <UserAvatar uri={post.author.photo} label={post.author.name} size={40} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.meta} onPress={handleOpenProfile}>
          <Text style={styles.author}>{post.author.name}</Text>
          <Text style={styles.handle}>@{post.author.handle}</Text>
          <Text style={styles.timestamp}>{new Date(post.created_at).toLocaleString()}</Text>
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

      <TouchableOpacity onPress={handleOpenDetails} activeOpacity={0.7}>
        <Text style={styles.content}>{post.text}</Text>
      </TouchableOpacity>

      <View style={styles.footer}>
        <TouchableOpacity
          onPress={handleLikeToggle}
          accessibilityRole="button"
          disabled={likePending}
          style={likePending ? styles.likeDisabled : undefined}
        >
          <Text style={styles.actionText}>
            {post.liked ? 'Unlike' : 'Like'} • {post.like_count}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleOpenDetails} accessibilityRole="button">
          <Text style={styles.actionText}>Comments • {post.comment_count}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export const FeedPostCard = memo(FeedPostCardComponent);

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#101828',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    gap: 12,
  },
  meta: {
    flex: 1,
  },
  author: {
    fontWeight: '600',
    color: '#F8FAFC',
  },
  handle: {
    color: '#94A3B8',
    fontSize: 12,
  },
  timestamp: {
    color: '#94A3B8',
    fontSize: 12,
  },
  followButton: {
    borderWidth: 1,
    borderColor: '#475569',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'center',
  },
  followButtonText: {
    color: '#E2E8F0',
    fontSize: 12,
  },
  content: {
    marginTop: 12,
    color: '#E2E8F0',
  },
  footer: {
    marginTop: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionText: {
    color: '#60A5FA',
    fontWeight: '500',
  },
  likeDisabled: {
    opacity: 0.6,
  },
});
