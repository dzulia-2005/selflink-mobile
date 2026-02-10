import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import * as Clipboard from 'expo-clipboard';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { getOrCreateDirectThread } from '@api/messaging';
import { followUser, getUserProfile, unfollowUser } from '@api/users';
import type { UserSummary } from '@api/users';
import { UserAvatar } from '@components/UserAvatar';
import { useToast } from '@context/ToastContext';
import { useAuthStore } from '@store/authStore';
import { useMessagingStore } from '@store/messagingStore';
import { useTheme, type Theme } from '@theme';
import React from 'react';

interface RouteParams {
  userId: number;
}

type ProfileRoute = RouteProp<Record<'UserProfile', RouteParams>, 'UserProfile'>;

const formatAccountKey = (value: string) => {
  if (value.length <= 14) {
    return value;
  }
  return `${value.slice(0, 6)}…${value.slice(-6)}`;
};

export function UserProfileScreen() {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const navigation = useNavigation<any>();
  const route = useRoute<ProfileRoute>();
  const [profile, setProfile] = useState<UserSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>();
  const [followPending, setFollowPending] = useState(false);
  const [messagePending, setMessagePending] = useState(false);
  const toast = useToast();
  const currentUserId = useAuthStore((state) => state.currentUser?.id);
  const mergeThread = useMessagingStore((state) => state.mergeThread);
  const userId = route.params.userId;

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(undefined);
    getUserProfile(userId)
      .then((data) => {
        if (!isMounted) {
          return;
        }
        setProfile(data);
      })
      .catch((err) => {
        if (!isMounted) {
          return;
        }
        setError(err instanceof Error ? err.message : 'Unable to load user.');
      })
      .finally(() => {
        if (isMounted) {
          setLoading(false);
        }
      });
    return () => {
      isMounted = false;
    };
  }, [userId]);

  const isOwnProfile = profile?.id === currentUserId;

  const handleFollowToggle = useCallback(async () => {
    if (!profile || isOwnProfile) {
      return;
    }
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
    (threadId: string, otherUserId?: number) => {
      navigation.navigate(
        'Messages' as never,
        {
          screen: 'Chat',
          params: { threadId, otherUserId },
        } as never,
      );
    },
    [navigation],
  );

  const handleMessage = useCallback(async () => {
    if (!profile || isOwnProfile) {
      return;
    }
    setMessagePending(true);
    try {
      const thread = await getOrCreateDirectThread(profile.id);
      mergeThread(thread);
      openChatScreen(thread.id, profile.id);
    } catch (err) {
      console.warn('UserProfile: failed to start DM', err);
      Alert.alert('Unable to start chat', 'Please try again in a few moments.');
    } finally {
      setMessagePending(false);
    }
  }, [isOwnProfile, mergeThread, openChatScreen, profile]);

  const handleCopyRecipientId = useCallback(async () => {
    if (!profile?.account_key) {
      return;
    }
    try {
      await Clipboard.setStringAsync(profile.account_key);
      toast.push({ message: 'Copied to clipboard', tone: 'info', duration: 1500 });
    } catch (err) {
      console.warn('UserProfile: failed to copy recipient id', err);
      toast.push({ message: 'Unable to copy right now.', tone: 'error' });
    }
  }, [profile?.account_key, toast]);

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

  const hasRecipientId = Boolean(profile.account_key);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <UserAvatar
          uri={profile.photo}
          label={profile.name || profile.handle}
          size={72}
        />
        <View style={styles.headerText}>
          <Text style={styles.name}>
            {profile.name || profile.handle || profile.username}
          </Text>
          <Text style={styles.handle}>@{profile.handle || profile.username}</Text>
          {profile.bio ? <Text style={styles.bio}>{profile.bio}</Text> : null}
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Text style={styles.statLabel}>Followers</Text>
              <Text style={styles.statValue}>{profile.followers_count ?? 0}</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statLabel}>Following</Text>
              <Text style={styles.statValue}>{profile.following_count ?? 0}</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statLabel}>Posts</Text>
              <Text style={styles.statValue}>{profile.posts_count ?? 0}</Text>
            </View>
          </View>
        </View>
      </View>
      <View style={styles.recipientCard}>
        <View style={styles.recipientInfo}>
          <Text style={styles.recipientLabel}>Recipient ID (SLC)</Text>
          <Text style={styles.recipientValue}>
            {hasRecipientId
              ? formatAccountKey(profile.account_key as string)
              : 'Not available'}
          </Text>
          {hasRecipientId ? (
            <Text style={styles.recipientHint}>Share this ID to receive SLC.</Text>
          ) : null}
        </View>
        {hasRecipientId ? (
          <TouchableOpacity
            style={styles.copyButton}
            onPress={handleCopyRecipientId}
            activeOpacity={0.85}
          >
            <Text style={styles.copyLabel}>Copy</Text>
          </TouchableOpacity>
        ) : null}
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
                  ? 'Following'
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
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      padding: 16,
      gap: 16,
      backgroundColor: theme.feed.backgroundEnd,
    },
    centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
      backgroundColor: theme.feed.cardBackground,
      borderRadius: 18,
      padding: 14,
      borderWidth: 1,
      borderColor: theme.feed.cardBorder,
    },
    headerText: { flex: 1, gap: 6 },
    name: { fontSize: 20, fontWeight: '800', color: theme.feed.textPrimary },
    handle: { color: theme.feed.textSecondary },
    bio: { color: theme.feed.textMuted },
    statsRow: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 6,
    },
    stat: {
      paddingVertical: 6,
      paddingHorizontal: 10,
      borderRadius: 12,
      backgroundColor: theme.feed.glass,
      borderWidth: 1,
      borderColor: theme.feed.border,
    },
    statLabel: {
      color: theme.feed.textSecondary,
      fontSize: 12,
      fontWeight: '700',
    },
    statValue: {
      color: theme.feed.textPrimary,
      fontSize: 15,
      fontWeight: '800',
      marginTop: 2,
    },
    recipientCard: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 16,
      backgroundColor: theme.feed.cardBackground,
      borderRadius: 18,
      padding: 14,
      borderWidth: 1,
      borderColor: theme.feed.cardBorder,
    },
    recipientInfo: {
      flex: 1,
      gap: 4,
    },
    recipientLabel: {
      color: theme.feed.textSecondary,
      fontSize: 12,
      fontWeight: '700',
    },
    recipientValue: {
      color: theme.feed.textPrimary,
      fontSize: 15,
      fontWeight: '800',
    },
    recipientHint: {
      color: theme.feed.textMuted,
      fontSize: 12,
    },
    copyButton: {
      paddingVertical: 6,
      paddingHorizontal: 12,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: theme.feed.border,
      backgroundColor: theme.feed.glass,
    },
    copyLabel: { fontWeight: '700', color: theme.feed.textPrimary },
    actionsRow: { flexDirection: 'row', gap: 12 },
    actionButton: {
      flex: 1,
      borderWidth: 1,
      borderColor: theme.feed.border,
      borderRadius: 16,
      paddingVertical: 12,
      alignItems: 'center',
      backgroundColor: theme.feed.glass,
    },
    primaryButton: {
      backgroundColor: theme.feed.accentBlue,
      borderColor: theme.feed.accentBlue,
    },
    actionLabel: { fontWeight: '700', color: theme.feed.textPrimary },
    primaryLabel: { color: '#0B1120' },
    disabledButton: { opacity: 0.7 },
  });
