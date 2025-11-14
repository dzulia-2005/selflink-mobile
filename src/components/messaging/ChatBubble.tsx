import React, { memo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import type { Message } from '@types/messaging';

type Props = {
  message: Message;
  isOwn: boolean;
  showTimestamp?: boolean;
  onLongPress?: (message: Message) => void;
  disableActions?: boolean;
};

const ChatBubbleComponent: React.FC<Props> = ({
  message,
  isOwn,
  showTimestamp = true,
  onLongPress,
  disableActions,
}) => {
  const containerStyle = isOwn
    ? [styles.bubbleContainer, styles.bubbleRight]
    : [styles.bubbleContainer, styles.bubbleLeft];
  const bubbleStyle = isOwn ? [styles.bubble, styles.bubbleOwn] : [styles.bubble, styles.bubbleOther];

  const time = new Date(message.created_at).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <View style={containerStyle}>
      <TouchableOpacity
        activeOpacity={0.85}
        style={bubbleStyle}
        delayLongPress={250}
        onLongPress={() => {
          if (!disableActions) {
            onLongPress?.(message);
          }
        }}
      >
        <Text style={isOwn ? styles.textOwn : styles.textOther}>{message.body}</Text>
      </TouchableOpacity>
      {showTimestamp ? <Text style={styles.timestamp}>{time}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  bubbleContainer: {
    marginVertical: 2,
    paddingHorizontal: 12,
  },
  bubbleLeft: {
    alignItems: 'flex-start',
  },
  bubbleRight: {
    alignItems: 'flex-end',
  },
  bubble: {
    maxWidth: '80%',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
  },
  bubbleOwn: {
    backgroundColor: '#0f766e',
    borderBottomRightRadius: 4,
  },
  bubbleOther: {
    backgroundColor: '#E5E7EB',
    borderBottomLeftRadius: 4,
  },
  textOwn: {
    color: '#ffffff',
    fontSize: 15,
  },
  textOther: {
    color: '#111827',
    fontSize: 15,
  },
  timestamp: {
    fontSize: 10,
    color: '#9CA3AF',
    marginTop: 2,
  },
});

export const ChatBubble = memo(ChatBubbleComponent);
export default ChatBubble;
