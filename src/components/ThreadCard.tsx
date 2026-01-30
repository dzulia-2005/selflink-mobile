import { memo, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { Thread } from '@services/api/threads';
import { useTheme } from '@theme';

type Props = {
  thread: Thread;
  onPress: (thread: Thread) => void;
};

export const ThreadCard = memo(function ThreadCard({ thread, onPress }: Props) {
  const { theme } = useTheme();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        card: {
          borderRadius: theme.radius.md,
          borderWidth: 1,
          borderColor: theme.colors.border,
          padding: theme.spacing.md,
          gap: theme.spacing.xs,
          backgroundColor: theme.colors.surface,
        },
        header: {
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
        },
        title: {
          color: theme.text.primary,
          ...theme.typography.subtitle,
          flex: 1,
        },
        badge: {
          minWidth: 24,
          paddingHorizontal: theme.spacing.xs,
          borderRadius: theme.radius.full,
          backgroundColor: theme.palette.azure,
          alignItems: 'center',
        },
        badgeText: {
          color: theme.text.inverted,
          ...theme.typography.caption,
        },
        preview: {
          color: theme.text.muted,
          ...theme.typography.body,
        },
        timestamp: {
          color: theme.palette.graphite,
          ...theme.typography.caption,
        },
      }),
    [theme],
  );
  const participants =
    thread.participants?.map((participant) => participant.name || participant.handle) ??
    [];
  const title = thread.title || participants.join(', ');

  return (
    <Pressable style={styles.card} onPress={() => onPress(thread)}>
      <View style={styles.header}>
        <Text style={styles.title}>{title || 'Conversation'}</Text>
        {thread.unread_count ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{thread.unread_count}</Text>
          </View>
        ) : null}
      </View>
      {thread.last_message ? (
        <Text style={styles.preview} numberOfLines={2}>
          {thread.last_message.body}
        </Text>
      ) : (
        <Text style={styles.preview}>No messages yet.</Text>
      )}
      <Text style={styles.timestamp}>
        Updated {new Date(thread.updated_at).toLocaleString()}
      </Text>
    </Pressable>
  );
});
