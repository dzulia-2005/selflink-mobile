import { Ionicons } from '@expo/vector-icons';
import { memo } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '@hooks/useAuth';
import type { Message } from '@services/api/messages';
import { theme } from '@theme/index';

type Props = {
  message: Message;
};

export const MessageBubble = memo(function MessageBubble({ message }: Props) {
  const { user } = useAuth();
  const isOwn = user?.id && Number(user.id) === message.sender.id;
  const attachments = Array.isArray(message.attachments) ? message.attachments : [];
  const images = attachments.filter(
    (att) =>
      (att.type ?? att.mimeType ?? (att as any).mime_type ?? '').startsWith('image') ||
      att.type === 'image',
  );
  const videos = attachments.filter(
    (att) =>
      (att.type ?? att.mimeType ?? (att as any).mime_type ?? '').startsWith('video') ||
      att.type === 'video',
  );

  return (
    <View style={[styles.container, isOwn ? styles.own : styles.other]}>
      {!isOwn && (
        <Text style={styles.sender}>{message.sender.name ?? message.sender.handle}</Text>
      )}
      <Text style={styles.body}>{message.body}</Text>
      {images.length ? (
        <View style={styles.attachmentsRow}>
          {images.map((att, index) => (
            <Image
              key={`${att.url ?? att.file ?? index}`}
              source={{ uri: att.url ?? (att.file as string) }}
              style={styles.imageThumb}
            />
          ))}
        </View>
      ) : null}
      {videos.length ? (
        <View style={styles.attachmentsRow}>
          {videos.map((att, index) => (
            <View key={`${att.url ?? att.file ?? index}`} style={styles.videoChip}>
              <Ionicons name="videocam" size={14} color="#0f172a" />
              <Text style={styles.videoLabel}>Video</Text>
            </View>
          ))}
        </View>
      ) : null}
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
  attachmentsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 6,
  },
  imageThumb: {
    width: 140,
    height: 140,
    borderRadius: 12,
    backgroundColor: '#1f2937',
  },
  videoChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: '#e5e7eb',
    alignSelf: 'flex-start',
  },
  videoLabel: {
    marginLeft: 6,
    color: '#0f172a',
    fontWeight: '600',
    fontSize: 12,
  },
});
