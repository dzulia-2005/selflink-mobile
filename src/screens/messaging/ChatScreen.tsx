import { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';

import { connectWebSocket } from '@lib/websocket';
import { useAuthStore } from '@store/authStore';
import { useMessagingStore } from '@store/messagingStore';
import type { Message } from '@schemas/messaging';

interface RouteParams {
  threadId: number;
  otherUserId?: number;
}

type ChatRoute = RouteProp<Record<'Chat', RouteParams>, 'Chat'>;

export function ChatScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<ChatRoute>();
  const threadId = route.params.threadId;
  const otherUserId = route.params.otherUserId;
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const loadThreadMessages = useMessagingStore((state) => state.loadThreadMessages);
  const sendMessage = useMessagingStore((state) => state.sendMessage);
  const handleIncomingMessage = useMessagingStore((state) => state.handleIncomingMessage);
  const messages = useMessagingStore((state) => state.messagesByThread[String(threadId)] ?? []);
  const isLoading = useMessagingStore((state) => state.isLoadingMessages);
  const token = useAuthStore((state) => state.accessToken);
  const currentUserId = useAuthStore((state) => state.currentUser?.id);

  useEffect(() => {
    loadThreadMessages(threadId).catch(() => undefined);
  }, [loadThreadMessages, threadId]);

  useLayoutEffect(() => {
    if (!otherUserId) {
      navigation.setOptions({ headerRight: undefined });
      return;
    }
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity onPress={() => navigation.navigate('UserProfile', { userId: otherUserId })}>
          <Text style={{ color: '#2563EB', fontWeight: '600' }}>Profile</Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation, otherUserId]);

  useEffect(() => {
    if (!token) {
      return;
    }
    const disconnect = connectWebSocket(token, {
      onMessage: (payload) => {
        if (payload?.type === 'message' && String(payload.thread) === String(threadId)) {
          handleIncomingMessage(payload.message ?? (payload as Message));
        }
      },
    });
    return disconnect;
  }, [token, threadId, handleIncomingMessage]);

  const handleSend = useCallback(async () => {
    if (!input.trim() || isSending) {
      return;
    }
    setIsSending(true);
    try {
      await sendMessage(threadId, input.trim());
      setInput('');
    } catch (error) {
      console.warn('ChatScreen: failed to send message', error);
      Alert.alert('Unable to send message', 'Please try again.');
    } finally {
      setIsSending(false);
    }
  }, [input, isSending, sendMessage, threadId]);

  if (isLoading && messages.length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={messages}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => <MessageBubble message={item} currentUserId={currentUserId} />}
        contentContainerStyle={styles.listContent}
        inverted
      />
      <View style={styles.composer}>
        <TextInput
          style={styles.input}
          placeholder="Message"
          value={input}
          onChangeText={setInput}
        />
        <TouchableOpacity
          onPress={handleSend}
          style={[styles.sendButton, isSending && styles.sendButtonDisabled]}
          disabled={isSending}
        >
          <Text style={styles.sendButtonText}>{isSending ? 'Sending…' : 'Send'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const MessageBubble = ({ message, currentUserId }: { message: Message; currentUserId?: number }) => {
  const isOwn = currentUserId === message.sender.id;
  return (
    <View style={[styles.messageBubble, isOwn ? styles.bubbleOwn : styles.bubbleOther]}>
      {!isOwn && <Text style={styles.sender}>{message.sender.name}</Text>}
      <Text>{message.body}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    padding: 16,
  },
  composer: {
    flexDirection: 'row',
    padding: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: '#E2E8F0',
    gap: 8,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#CBD5F5',
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  sendButton: {
    paddingHorizontal: 16,
    justifyContent: 'center',
    backgroundColor: '#2563EB',
    borderRadius: 8,
  },
  sendButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  sendButtonDisabled: {
    opacity: 0.7,
  },
  messageBubble: {
    padding: 12,
    borderRadius: 10,
    marginBottom: 10,
    maxWidth: '80%',
  },
  bubbleOwn: {
    backgroundColor: '#DBEAFE',
    alignSelf: 'flex-end',
  },
  bubbleOther: {
    backgroundColor: '#F1F5F9',
    alignSelf: 'flex-start',
  },
  sender: {
    fontWeight: '600',
    marginBottom: 4,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
