import { Ionicons } from '@expo/vector-icons';
import React, { memo, useMemo } from 'react';
import { Image, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import type { Thread } from '@schemas/messaging';
import { normalizeAvatarUrl } from '@utils/avatar';

type Props = {
  thread: Thread;
  currentUserId: string | number | null;
  onPress: (thread: Thread) => void;
  onLongPress?: (thread: Thread) => void;
};

const ThreadListItemComponent: React.FC<Props> = ({
  thread,
  currentUserId,
  onPress,
  onLongPress,
}) => {
  const unread = thread.unread_count ?? 0;
  const hasUnread = unread > 0;

  const otherMember = useMemo(() => {
    const members = Array.isArray(thread.members) ? thread.members : [];
    const sessionKey = currentUserId != null ? String(currentUserId) : null;
    if (!sessionKey) {
      return members[0];
    }
    return (
      members.find((member: Thread['members'][number]) => {
        const memberId = member?.user?.id;
        return memberId != null && String(memberId) !== sessionKey;
      }) ?? members[0]
    );
  }, [currentUserId, thread.members]);

  const user = otherMember?.user;
  const displayName = user?.name || user?.handle || thread.title || 'Unknown user';
  const avatarUrl = normalizeAvatarUrl(user?.photo || undefined);
  const isOnline = Boolean(user?.flags?.online);
  const lastMessage = thread.last_message?.body || 'No messages yet';
  const timeLabel = formatTime(thread.updated_at || thread.created_at);

  return (
    <TouchableOpacity
      style={styles.wrapper}
      onPress={() => onPress(thread)}
      onLongPress={onLongPress ? () => onLongPress(thread) : undefined}
      delayLongPress={onLongPress ? 250 : undefined}
      activeOpacity={0.85}
    >
      <View style={styles.card}>
        <View style={styles.avatarContainer}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarFallback}>
              <Ionicons name="person" size={20} color="#1f2937" />
            </View>
          )}
          <View
            style={[
              styles.statusDot,
              isOnline ? styles.statusOnline : styles.statusOffline,
            ]}
          />
        </View>
        <View style={styles.content}>
          <View style={styles.topRow}>
            <Text style={[styles.name, hasUnread && styles.nameUnread]} numberOfLines={1}>
              {displayName}
            </Text>
            <Text style={styles.time}>{timeLabel}</Text>
          </View>
          <View style={styles.bottomRow}>
            <Text
              style={[styles.preview, hasUnread && styles.previewUnread]}
              numberOfLines={1}
            >
              {lastMessage}
            </Text>
            {hasUnread ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unread > 99 ? '99+' : unread}</Text>
              </View>
            ) : null}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

function formatTime(iso?: string | null): string {
  if (!iso) {
    return '';
  }
  const d = new Date(iso);
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();

  if (sameDay) {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  card: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    ...(Platform.OS === 'ios'
      ? {
          shadowColor: '#000',
          shadowOpacity: 0.06,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 3 },
        }
      : { elevation: 2 }),
  },
  avatarContainer: {
    marginRight: 12,
    position: 'relative',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  avatarFallback: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E2E8F0',
  },
  statusDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  statusOnline: {
    backgroundColor: '#22c55e',
  },
  statusOffline: {
    backgroundColor: '#9CA3AF',
  },
  content: {
    flex: 1,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  name: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
  },
  nameUnread: {
    color: '#0f766e',
  },
  time: {
    marginLeft: 8,
    fontSize: 11,
    color: '#9CA3AF',
  },
  bottomRow: {
    marginTop: 2,
    flexDirection: 'row',
    alignItems: 'center',
  },
  preview: {
    flex: 1,
    fontSize: 13,
    color: '#6B7280',
  },
  previewUnread: {
    color: '#111827',
    fontWeight: '500',
  },
  badge: {
    marginLeft: 8,
    minWidth: 20,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: '#0f766e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: 11,
    color: '#ffffff',
    fontWeight: '700',
  },
});

export const ThreadListItem = memo(ThreadListItemComponent);
export default ThreadListItem;
