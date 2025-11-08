import { StatusBar } from 'expo-status-bar';
import { useCallback } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThreadCard } from '@components/ThreadCard';
import { MetalButton } from '@components/MetalButton';
import { MetalPanel } from '@components/MetalPanel';
import { useToast } from '@context/ToastContext';
import { useThreads } from '@hooks/useThreads';
import { RootStackParamList } from '@navigation/AppNavigator';
import { theme } from '@theme/index';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useState } from 'react';

export function InboxScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const toast = useToast();
  const { threads, loading, refreshing, loadMore, hasMore, refresh, createThread } =
    useThreads();
  const [ids, setIds] = useState('');
  const [message, setMessage] = useState('');
  const [title, setTitle] = useState('');
  const [creating, setCreating] = useState(false);

  const openThread = useCallback(
    (threadId: number) => {
      navigation.navigate('Messages', { threadId });
    },
    [navigation],
  );

  const handleCreateThread = useCallback(async () => {
    if (creating) return;
    const participant_ids = ids
      .split(',')
      .map((value) => Number(value.trim()))
      .filter((value) => !Number.isNaN(value));

    if (participant_ids.length === 0) {
      toast.push({
        tone: 'error',
        message: 'Add at least one participant ID.',
      });
      return;
    }

    if (!message.trim()) {
      toast.push({
        tone: 'error',
        message: 'Add an opening message.',
      });
      return;
    }
    try {
      setCreating(true);
      const thread = await createThread({
        title: title.trim() || undefined,
        participant_ids,
        initial_message: message.trim() || undefined,
      });
      setIds('');
      setMessage('');
      setTitle('');
      openThread(thread.id);
    } catch (error) {
      // toast handled in hook
    } finally {
      setCreating(false);
    }
  }, [creating, createThread, handles, message, openThread, title, toast]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <View style={styles.hero}>
        <Text style={styles.title}>Inbox</Text>
        <Text style={styles.subtitle}>
          Choose a conversation. Each thread should feel as intentional as a Jobs keynote.
        </Text>
      </View>
      <FlatList
        contentContainerStyle={styles.list}
        data={threads}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => <ThreadCard thread={item} onPress={() => openThread(item.id)} />}
        onEndReachedThreshold={0.2}
        onEndReached={() => {
          if (hasMore && !loading && !refreshing) {
            loadMore();
          }
        }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor="#fff" />}
        ListFooterComponent={
          loading ? (
            <View style={styles.loader}>
              <ActivityIndicator color={theme.palette.platinum} />
            </View>
          ) : null
        }
        ListEmptyComponent={
          !loading && (
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>No threads yet</Text>
              <Text style={styles.emptyCopy}>
                Once conversations begin, they’ll appear right here.
              </Text>
            </View>
          )
        }
        ListHeaderComponent={
          <MetalPanel glow>
            <Text style={styles.panelTitle}>Start a Conversation</Text>
            <TextInput
              style={styles.input}
              placeholder="Title (optional)"
              placeholderTextColor={theme.palette.graphite}
              value={title}
              onChangeText={setTitle}
            />
        <TextInput
          style={styles.input}
          placeholder="Participant IDs (comma separated)"
          placeholderTextColor={theme.palette.graphite}
          value={ids}
          onChangeText={setIds}
          keyboardType="number-pad"
        />
            <TextInput
              style={[styles.input, styles.messageInput]}
              placeholder="Opening message"
              placeholderTextColor={theme.palette.graphite}
              value={message}
              onChangeText={setMessage}
              multiline
            />
            <MetalButton
              title={creating ? 'Sending…' : 'Start Thread'}
              onPress={handleCreateThread}
              disabled={creating}
            />
          </MetalPanel>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.palette.midnight,
  },
  hero: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
    gap: theme.spacing.xs,
  },
  title: {
    color: theme.palette.platinum,
    ...theme.typography.title,
  },
  subtitle: {
    color: theme.palette.silver,
    ...theme.typography.body,
  },
  list: {
    padding: theme.spacing.lg,
    gap: theme.spacing.sm,
    paddingBottom: theme.spacing.xl,
  },
  panelTitle: {
    color: theme.palette.titanium,
    ...theme.typography.subtitle,
    marginBottom: theme.spacing.sm,
  },
  input: {
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.palette.graphite,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    color: theme.palette.platinum,
    backgroundColor: theme.palette.obsidian,
    marginBottom: theme.spacing.sm,
  },
  messageInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  loader: {
    paddingVertical: theme.spacing.md,
  },
  empty: {
    alignItems: 'center',
    gap: theme.spacing.xs,
    paddingVertical: theme.spacing.xl,
  },
  emptyTitle: {
    color: theme.palette.platinum,
    ...theme.typography.subtitle,
  },
  emptyCopy: {
    color: theme.palette.silver,
    ...theme.typography.body,
    textAlign: 'center',
    maxWidth: 280,
  },
});
