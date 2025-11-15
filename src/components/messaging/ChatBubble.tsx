import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { memo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import type { Message } from '@schemas/messaging';

type Props = {
  message: Message;
  isOwn: boolean;
  isFirstInGroup: boolean;
  isLastInGroup: boolean;
  showTimestamp?: boolean;
  status?: 'sent' | 'delivered' | 'read';
  onLongPress?: (message: Message) => void;
  disableActions?: boolean;
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
}) => {
  const radius = getRadius(isOwn, isFirstInGroup, isLastInGroup);

  const time = new Date(message.created_at).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  const content = (
    <View style={styles.bubbleContent}>
      <Text style={isOwn ? styles.textOwn : styles.textOther}>{message.body}</Text>
      <View style={styles.metaRow}>
        {showTimestamp ? <Text style={styles.timestamp}>{time}</Text> : null}
        {isOwn && status ? (
          <Ionicons
            name={status === 'read' ? 'checkmark-done' : 'checkmark'}
            size={14}
            color={status === 'read' ? '#a7f3d0' : '#bae6fd'}
            style={styles.statusIcon}
          />
        ) : null}
      </View>
    </View>
  );

  return (
    <View
      style={[styles.container, isOwn ? styles.containerRight : styles.containerLeft]}
    >
      <TouchableOpacity
        activeOpacity={0.85}
        delayLongPress={250}
        onLongPress={
          onLongPress && !disableActions ? () => onLongPress(message) : undefined
        }
      >
        {isOwn ? (
          <LinearGradient
            colors={['#0f766e', '#22c55e']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.gradientBubble, radius]}
          >
            {content}
          </LinearGradient>
        ) : (
          <View style={[styles.otherBubble, radius]}>{content}</View>
        )}
      </TouchableOpacity>
    </View>
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
    marginVertical: 2,
  },
  containerLeft: {
    alignItems: 'flex-start',
  },
  containerRight: {
    alignItems: 'flex-end',
  },
  gradientBubble: {
    maxWidth: '80%',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  otherBubble: {
    maxWidth: '80%',
    backgroundColor: '#E5E7EB',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  bubbleContent: {
    flexShrink: 1,
  },
  textOwn: {
    color: '#F9FAFB',
    fontSize: 15,
  },
  textOther: {
    color: '#111827',
    fontSize: 15,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    marginTop: 2,
  },
  timestamp: {
    fontSize: 10,
    color: '#d1d5db',
  },
  statusIcon: {
    marginLeft: 4,
  },
});

export const ChatBubble = memo(ChatBubbleComponent);
export default ChatBubble;
