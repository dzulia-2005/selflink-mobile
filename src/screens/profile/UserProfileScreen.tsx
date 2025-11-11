import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Button,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';

import { followUser, getUserProfile, unfollowUser } from '@api/users';
import { getOrCreateDirectThread } from '@api/messaging';
import type { UserSummary } from '@api/users';
import { useAuthStore } from '@store/authStore';
import { UserAvatar } from '@components/UserAvatar';
import { useMessagingStore } from '@store/messagingStore';

interface RouteParams {
  userId: number;
}

type ProfileRoute = RouteProp<Record<'UserProfile', RouteParams>, 'UserProfile'>;

export function UserProfileScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<ProfileRoute>();
  const [profile, setProfile] = useState<UserSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>();
  const [followPending, setFollowPending] = useState(false);
  const [messagePending, setMessagePending] = useState(false);
  const currentUserId = useAuthStore((state) => state.currentUser?.id);
  const upsertThread = useMessagingStore((state) => state.upsertThread);
  const userId = route.params.userId;

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(undefined);
    getUserProfile(userId)
      .then((data) => {
        if (!isMounted) return;
        setProfile(data);
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(err instanceof Error ? err.message : 'Unable to load user.');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, [userId]);

  const isOwnProfile = profile?.id === currentUserId;

  const handleFollowToggle = useCallback(async () => {
    if (!profile || isOwnProfile) return;
    const nextState = !profile.is_following;
    setFollowPending(true);
    setProfile((prev) =>
      prev
        ? {
            ...prev,
            is_following: nextState,
            followers_count: Math.max(
              0,
              (prev.followers_count ?? 0) + (nextState ? 1 : -1),
            ),
          }
        : prev,
    );
    try {
      if (nextState) {
        await followUser(profile.id);
      } else {
        await unfollowUser(profile.id);
      }
    } catch (err) {
      console.warn('UserProfile: follow toggle failed', err);
      setProfile((prev) =>
        prev
          ? {
              ...prev,
              is_following: !nextState,
              followers_count: Math.max(
                0,
                (prev.followers_count ?? 0) + (nextState ? -1 : 1),
              ),
            }
          : prev,
      );
    } finally {
      setFollowPending(false);
    }
  }, [isOwnProfile, profile]);

  const openChatScreen = useCallback(
    (threadId: number, otherUserId?: number) => {
      const parent = navigation.getParent?.();
      if (parent?.navigate) {
        parent.navigate(
          'Messages' as never,
          {
            screen: 'Chat',
            params: { threadId, otherUserId },
          } as never,
        );
        return;
      }
      navigation.navigate('Chat' as never, { threadId, otherUserId } as never);
    },
    [navigation],
  );

  const handleMessage = useCallback(async () => {
    if (!profile || isOwnProfile) return;
    setMessagePending(true);
    try {
      const thread = await getOrCreateDirectThread(profile.id);
      upsertThread(thread);
      openChatScreen(thread.id, profile.id);
    } catch (err) {
      console.warn('UserProfile: failed to start DM', err);
      Alert.alert('Unable to start chat', 'Please try again in a few moments.');
    } finally {
      setMessagePending(false);
    }
  }, [isOwnProfile, openChatScreen, profile, upsertThread]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator />
      </View>
    );
  }

  if (error || !profile) {
    return (
      <View style={styles.centered}>
        <Text>{error ?? 'User not found.'}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <UserAvatar uri={profile.photo} label={profile.name || profile.handle} size={72} />
        <View style={styles.headerText}>
          <Text style={styles.name}>{profile.name || profile.handle || profile.username}</Text>
          <Text style={styles.handle}>@{profile.handle || profile.username}</Text>
        </View>
      </View>
      {profile.bio ? <Text>{profile.bio}</Text> : null}
      <View style={styles.statsRow}>
        <Text>Followers: {profile.followers_count ?? 0}</Text>
        <Text>Following: {profile.following_count ?? 0}</Text>
        <Text>Posts: {profile.posts_count ?? 0}</Text>
      </View>
      {!isOwnProfile ? (
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[styles.actionButton, followPending && styles.disabledButton]}
            onPress={handleFollowToggle}
            disabled={followPending}
          >
            <Text style={styles.actionLabel}>
              {followPending
                ? 'Please wait…'
                : profile.is_following
                  ? 'Unfollow'
                  : 'Follow'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.primaryButton]}
            onPress={handleMessage}
            disabled={messagePending}
          >
            <Text style={[styles.actionLabel, styles.primaryLabel]}>
              {messagePending ? 'Opening…' : 'Message'}
            </Text>
          </TouchableOpacity>
        </View>
      ) : null}
      <View style={styles.linksRow}>
        <Button title="Followers" onPress={() => console.log('TODO: followers list')} />
        <Button title="Following" onPress={() => console.log('TODO: following list')} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 16 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  headerText: { flex: 1 },
  name: { fontSize: 20, fontWeight: '600' },
  handle: { color: '#475569' },
  statsRow: { flexDirection: 'row', gap: 16 },
  actionsRow: { flexDirection: 'row', gap: 12 },
  actionButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#CBD5F5',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  actionLabel: { fontWeight: '600' },
  primaryLabel: { color: '#fff' },
  disabledButton: { opacity: 0.7 },
  linksRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
});
