import { Ionicons } from '@expo/vector-icons';
import React, { memo } from 'react';
import { Animated, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { useBubbleAnimation } from '@hooks/useBubbleAnimation';
import type { Message } from '@schemas/messaging';
import { theme } from '@theme';

type Props = {
  message: Message;
  isOwn: boolean;
  isFirstInGroup: boolean;
  isLastInGroup: boolean;
  showTimestamp?: boolean;
  status?: 'queued' | 'pending' | 'sent' | 'delivered' | 'read' | 'failed';
  onLongPress?: (message: Message) => void;
  disableActions?: boolean;
  onRetry?: (message: Message) => void;
};

const ChatBubbleComponent: React.FC<Props> = ({
  message,
  isOwn,
  isFirstInGroup,
  isLastInGroup,
  showTimestamp = false,
  status,
  onLongPress,
  disableActions,
  onRetry,
}) => {
  const radius = getRadius(isOwn, isFirstInGroup, isLastInGroup);
  const { animatedStyle } = useBubbleAnimation(isOwn);

  const time = new Date(message.created_at).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  const renderReplyPreview = () => {
    if (!message.replyTo) {
      return null;
    }
    const preview =
      message.replyTo.textPreview ??
      (message.replyTo.hasAttachments ? 'Attachment' : 'Message');
    return (
      <View
        style={[
          styles.replyPreview,
          isOwn ? styles.replyPreviewOwn : styles.replyPreviewOther,
        ]}
      >
        <Text style={styles.replySender} numberOfLines={1}>
          {message.replyTo.senderName ?? 'Reply'}
        </Text>
        <Text style={styles.replySnippet} numberOfLines={1}>
          {preview}
        </Text>
      </View>
    );
  };

  const renderAttachments = () => {
    const attachments = Array.isArray(message.attachments) ? message.attachments : [];
    if (!attachments.length) {
      return null;
    }
    const images = attachments.filter((att) => att.type === 'image' && att.url);
    const videos = attachments.filter((att) => att.type === 'video' && att.url);
    return (
      <View style={styles.attachmentsContainer}>
        {images.length ? (
          <View style={styles.imageGrid}>
            {images.map((att) => (
              <Image
                key={att.id ?? att.url}
                source={{ uri: att.url }}
                style={styles.imageThumb}
                resizeMode="cover"
              />
            ))}
          </View>
        ) : null}
        {videos.map((att) => (
          <View key={att.id ?? att.url} style={styles.videoChip}>
            <Ionicons name="videocam" size={14} color="#E2E8F0" />
            <Text style={styles.videoLabel}>Video</Text>
          </View>
        ))}
      </View>
    );
  };

  const renderReactions = () => {
    if (!message.reactions || message.reactions.length === 0) {
      return null;
    }
    return (
      <View
        style={[
          styles.reactionsRow,
          isOwn ? styles.reactionsRowOwn : styles.reactionsRowOther,
        ]}
      >
        {message.reactions.map((reaction) => (
          <View
            key={reaction.emoji}
            style={[
              styles.reactionChip,
              reaction.reactedByCurrentUser ? styles.reactionChipActive : null,
            ]}
          >
            <Text style={styles.reactionText}>{reaction.emoji}</Text>
            <Text style={styles.reactionCount}>{reaction.count}</Text>
          </View>
        ))}
      </View>
    );
  };

  const renderStatusIcon = () => {
    if (!status) {
      return null;
    }
    const baseProps = { size: 14, style: styles.statusIcon } as const;
    switch (status) {
      case 'queued':
      case 'pending':
        return (
          <Ionicons name="time-outline" color="rgba(15,23,42,0.45)" {...baseProps} />
        );
      case 'sent':
        return <Ionicons name="checkmark" color="rgba(15,23,42,0.45)" {...baseProps} />;
      case 'delivered':
        return (
          <Ionicons name="checkmark-done" color="rgba(15,23,42,0.55)" {...baseProps} />
        );
      case 'read':
        return <Ionicons name="checkmark-done" color="#2DD4BF" {...baseProps} />;
      case 'failed':
        return (
          <TouchableOpacity
            disabled={!onRetry}
            onPress={onRetry ? () => onRetry(message) : undefined}
            style={styles.retryWrapper}
          >
            <Ionicons name="alert-circle" color="#f87171" {...baseProps} />
          </TouchableOpacity>
        );
      default:
        return null;
    }
  };

  const renderErrorChip = () => {
    if (status !== 'failed') {
      return null;
    }
    return (
      <TouchableOpacity
        disabled={!onRetry}
        onPress={onRetry ? () => onRetry(message) : undefined}
        style={styles.errorChip}
      >
        <Ionicons name="warning" size={12} color="#DC2626" style={styles.errorIcon} />
        <Text style={styles.errorText}>Tap to retry</Text>
      </TouchableOpacity>
    );
  };

  const content = (
    <View style={styles.bubbleContent}>
      {renderReplyPreview()}
      {renderAttachments()}
      {message.body ? (
        <Text style={isOwn ? styles.textOwn : styles.textOther}>{message.body}</Text>
      ) : null}
      {renderReactions()}
      {renderErrorChip()}
      <View style={styles.metaRow}>
        {showTimestamp ? <Text style={styles.timestamp}>{time}</Text> : null}
        {isOwn ? renderStatusIcon() : null}
      </View>
    </View>
  );

  return (
    <Animated.View
      style={[
        styles.container,
        isOwn ? styles.containerRight : styles.containerLeft,
        animatedStyle,
      ]}
    >
      <TouchableOpacity
        activeOpacity={0.85}
        delayLongPress={250}
        onLongPress={
          onLongPress && !disableActions ? () => onLongPress(message) : undefined
        }
      >
        <View
          style={[styles.bubble, isOwn ? styles.bubbleOwn : styles.bubbleOther, radius]}
        >
          <View style={[styles.innerTile, isOwn ? styles.innerOwn : styles.innerOther]}>
            {content}
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const getRadius = (isOwn: boolean, isFirst: boolean, isLast: boolean) => {
  const base = {
    borderRadius: 18,
    borderBottomRightRadius: isOwn ? 4 : 18,
    borderBottomLeftRadius: isOwn ? 18 : 4,
  };

  if (!isFirst && !isLast) {
    return {
      ...base,
      borderTopLeftRadius: isOwn ? 18 : 6,
      borderTopRightRadius: isOwn ? 6 : 18,
      borderBottomLeftRadius: isOwn ? 18 : 6,
      borderBottomRightRadius: isOwn ? 6 : 18,
    };
  }

  if (!isFirst && isLast) {
    return {
      ...base,
      borderTopLeftRadius: isOwn ? 18 : 6,
      borderTopRightRadius: isOwn ? 6 : 18,
    };
  }

  if (isFirst && !isLast) {
    return {
      ...base,
      borderBottomLeftRadius: isOwn ? 18 : 6,
      borderBottomRightRadius: isOwn ? 6 : 18,
    };
  }

  return base;
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 12,
    marginVertical: 4,
  },
  containerLeft: {
    alignItems: 'flex-start',
  },
  containerRight: {
    alignItems: 'flex-end',
  },
  bubble: {
    maxWidth: '82%',
    borderWidth: 1,
    borderRadius: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  bubbleOwn: {
    borderColor: theme.messaging.outgoingBorder,
    backgroundColor: theme.messaging.outgoingTile,
  },
  bubbleOther: {
    borderColor: theme.messaging.incomingBorder,
    backgroundColor: theme.messaging.incomingTile,
  },
  innerTile: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 20,
  },
  innerOwn: {
    backgroundColor: theme.messaging.outgoingInner,
  },
  innerOther: {
    backgroundColor: 'rgba(255,255,255,0.85)',
  },
  bubbleContent: {
    flexShrink: 1,
    gap: 6,
  },
  textOwn: {
    color: theme.messaging.ink,
    fontSize: 15,
    fontWeight: '600',
  },
  textOther: {
    color: theme.messaging.ink,
    fontSize: 15,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    marginTop: 4,
    gap: 6,
  },
  timestamp: {
    fontSize: 11,
    color: theme.messaging.subduedInk,
  },
  statusIcon: {
    marginLeft: 4,
  },
  retryWrapper: {
    marginLeft: 2,
  },
  attachmentsContainer: {
    marginBottom: 2,
    gap: 8,
  },
  imageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  imageThumb: {
    width: 160,
    height: 160,
    borderRadius: 16,
    backgroundColor: theme.messaging.placeholder,
  },
  videoChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: 'rgba(15,23,42,0.4)',
    alignSelf: 'flex-start',
  },
  videoLabel: {
    marginLeft: 8,
    color: '#E2E8F0',
    fontWeight: '700',
    fontSize: 13,
  },
  replyPreview: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 12,
    marginBottom: 6,
  },
  replyPreviewOwn: {
    backgroundColor: 'rgba(16,185,129,0.12)',
  },
  replyPreviewOther: {
    backgroundColor: 'rgba(15,23,42,0.07)',
  },
  replySender: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.messaging.ink,
    marginBottom: 2,
  },
  replySnippet: {
    fontSize: 12,
    color: theme.messaging.subduedInk,
  },
  reactionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 6,
  },
  reactionsRowOwn: {
    justifyContent: 'flex-end',
  },
  reactionsRowOther: {
    justifyContent: 'flex-start',
  },
  reactionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    backgroundColor: '#0f172a14',
    marginRight: 6,
    marginTop: 4,
  },
  reactionChipActive: {
    backgroundColor: '#0ea5e933',
  },
  reactionText: {
    fontSize: 12,
    marginRight: 4,
  },
  reactionCount: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0f172a',
  },
  errorChip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.messaging.errorBorder,
    backgroundColor: theme.messaging.errorBg,
    marginTop: 4,
  },
  errorText: {
    color: '#B91C1C',
    fontSize: 12,
    fontWeight: '600',
  },
  errorIcon: {
    marginRight: 6,
  },
});

export const ChatBubble = memo(ChatBubbleComponent);
export default ChatBubble;
