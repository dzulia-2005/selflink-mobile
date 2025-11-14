import { Ionicons } from '@expo/vector-icons';
import type { Thread } from '@schemas/messaging';
import React, { memo, useMemo } from 'react';
import {
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  TouchableOpacityProps,
} from 'react-native';

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

  const displayName =
    otherMember?.user?.name ||
    otherMember?.user?.handle ||
    thread.title ||
    'Unknown user';
  const avatarUrl = otherMember?.user?.photo || '';
  const lastMessage = thread.last_message?.body || 'No messages yet';
  const timeLabel = formatTime(thread.updated_at || thread.created_at);

  const touchableProps: TouchableOpacityProps = {};
  if (onLongPress) {
    touchableProps.onLongPress = () => onLongPress(thread);
    touchableProps.delayLongPress = 250;
  }

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={() => onPress(thread)}
      activeOpacity={0.85}
      {...touchableProps}
    >
      <View style={styles.avatarContainer}>
        {avatarUrl ? (
          <Image source={{ uri: avatarUrl }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarFallback}>
            <Ionicons name="person" size={20} color="#0F172A" />
          </View>
        )}
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
  container: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  avatarContainer: {
    marginRight: 12,
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
  content: {
    flex: 1,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  name: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
  },
  nameUnread: {
    color: '#0f766e',
  },
  time: {
    marginLeft: 8,
    fontSize: 12,
    color: '#64748B',
  },
  bottomRow: {
    marginTop: 2,
    flexDirection: 'row',
    alignItems: 'center',
  },
  preview: {
    flex: 1,
    fontSize: 14,
    color: '#64748B',
  },
  previewUnread: {
    color: '#0F172A',
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
