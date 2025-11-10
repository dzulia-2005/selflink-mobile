import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useAuth } from '@hooks/useAuth';
import type { Message } from '@services/api/messages';
import { theme } from '@theme/index';

type Props = {
  message: Message;
};

export const MessageBubble = memo(function MessageBubble({ message }: Props) {
  const { user } = useAuth();
  const isOwn = user?.id && Number(user.id) === message.sender.id;

  return (
    <View style={[styles.container, isOwn ? styles.own : styles.other]}>
      {!isOwn && (
        <Text style={styles.sender}>{message.sender.name ?? message.sender.handle}</Text>
      )}
      <Text style={styles.body}>{message.body}</Text>
      <Text style={styles.timestamp}>
        {new Date(message.created_at).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        })}
      </Text>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    maxWidth: '80%',
    padding: theme.spacing.md,
    borderRadius: theme.radius.lg,
    marginVertical: theme.spacing.xs / 2,
  },
  own: {
    alignSelf: 'flex-end',
    backgroundColor: theme.palette.azure + '22',
    borderBottomRightRadius: theme.radius.sm,
  },
  other: {
    alignSelf: 'flex-start',
    backgroundColor: theme.palette.obsidian,
    borderBottomLeftRadius: theme.radius.sm,
  },
  sender: {
    color: theme.palette.silver,
    ...theme.typography.caption,
    marginBottom: 4,
  },
  body: {
    color: theme.palette.platinum,
    ...theme.typography.body,
  },
  timestamp: {
    color: theme.palette.graphite,
    ...theme.typography.caption,
    marginTop: 4,
  },
});
