import { StatusBar } from 'expo-status-bar';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
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
import { useAuth } from '@hooks/useAuth';
import { useUsersDirectory } from '@hooks/useUsersDirectory';
import { useThreads } from '@hooks/useThreads';
import { RootStackParamList } from '@navigation/AppNavigator';
import { theme } from '@theme/index';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { UserProfile } from '@services/api/user';

export function InboxScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const toast = useToast();
  const { user: authUser } = useAuth();
  const { threads, loading, refreshing, loadMore, hasMore, refresh, createThread } =
    useThreads();
  const {
    users: directoryUsers,
    search,
    setSearch,
    loading: loadingDirectory,
    refresh: refreshDirectory,
  } = useUsersDirectory({ pageSize: 20 });
  const [selectedUsers, setSelectedUsers] = useState<UserProfile[]>([]);
  const [message, setMessage] = useState('');
  const [title, setTitle] = useState('');
  const [creating, setCreating] = useState(false);

  const openThread = useCallback(
    (threadId: number) => {
      navigation.navigate('Messages', { threadId });
    },
    [navigation],
  );

  const authUserId = useMemo(() => Number(authUser?.id) || null, [authUser?.id]);
  const filteredDirectory = useMemo(
    () =>
      directoryUsers.filter((candidate) =>
        authUserId ? candidate.id !== authUserId : true,
      ),
    [authUserId, directoryUsers],
  );
  const selectedIds = useMemo(
    () =>
      selectedUsers
        .map((user) => user.id)
        .filter((id) => (authUserId ? id !== authUserId : true)),
    [authUserId, selectedUsers],
  );

  const handleCreateThread = useCallback(async () => {
    if (creating) return;
    if (selectedIds.length === 0) {
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
        participant_ids: selectedIds,
        initial_message: message.trim() || undefined,
      });
      setSelectedUsers([]);
      setMessage('');
      setTitle('');
      openThread(thread.id);
    } catch (error) {
      // toast handled in hook
    } finally {
      setCreating(false);
    }
  }, [creating, createThread, selectedIds, message, openThread, title, toast]);

  const toggleUserSelection = useCallback(
    (user: UserProfile) => {
      if (authUserId && user.id === authUserId) {
        return;
      }
      setSelectedUsers((prev) => {
        const exists = prev.some((item) => item.id === user.id);
        if (exists) {
          return prev.filter((item) => item.id !== user.id);
        }
        return [...prev, user];
      });
    },
    [authUserId],
  );

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
            <Text style={styles.helper}>
              Pick participants from your community and drop them a message.
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Title (optional)"
              placeholderTextColor={theme.palette.graphite}
              value={title}
              onChangeText={setTitle}
            />
            <TextInput
              style={styles.input}
              placeholder="Search people by name or handle"
              placeholderTextColor={theme.palette.graphite}
              value={search}
              onChangeText={setSearch}
              autoCapitalize="none"
            />
            <View style={styles.selectedWrap}>
              {selectedUsers.length === 0 ? (
                <Text style={styles.helper}>No participants selected yet.</Text>
              ) : (
                selectedUsers.map((user) => (
                  <Pressable
                    key={user.id}
                    style={styles.selectedChip}
                    onPress={() => toggleUserSelection(user)}
                  >
                    <Text style={styles.selectedChipText}>
                      {user.name ?? user.handle ?? user.email}
                    </Text>
                  </Pressable>
                ))
              )}
            </View>
            <View style={styles.directoryList}>
              {loadingDirectory ? (
                <ActivityIndicator color={theme.palette.platinum} />
              ) : filteredDirectory.length === 0 ? (
                <Text style={styles.helper}>No matches found.</Text>
              ) : (
                filteredDirectory.map((user) => {
                  const isSelected = selectedIds.includes(user.id);
                  const initials =
                    user.name
                      ?.split(' ')
                      .map((part) => part[0])
                      .join('')
                      .slice(0, 2)
                      .toUpperCase() ??
                    user.handle?.slice(0, 2).toUpperCase() ??
                    'U';
                  return (
                    <Pressable
                      key={user.id}
                      style={[styles.userRow, isSelected && styles.userRowSelected]}
                      onPress={() => toggleUserSelection(user)}
                    >
                      <View style={styles.userAvatar}>
                        <Text style={styles.userAvatarText}>{initials}</Text>
                      </View>
                      <View style={styles.userCopy}>
                        <Text style={styles.userName}>{user.name ?? 'Unnamed'}</Text>
                        <Text style={styles.userHandle}>@{user.handle ?? 'handle'}</Text>
                      </View>
                      <Text style={styles.userAction}>{isSelected ? 'Remove' : 'Add'}</Text>
                    </Pressable>
                  );
                })
              )}
            </View>
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
              disabled={creating || selectedUsers.length === 0}
            />
            <Pressable style={styles.refreshDirectory} onPress={refreshDirectory}>
              <Text style={styles.refreshText}>Refresh people list</Text>
            </Pressable>
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
  helper: {
    color: theme.palette.silver,
    ...theme.typography.caption,
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
  selectedWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.xs,
    marginBottom: theme.spacing.sm,
  },
  selectedChip: {
    backgroundColor: theme.palette.obsidian,
    borderRadius: theme.radius.pill,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderWidth: 1,
    borderColor: theme.palette.graphite,
  },
  selectedChipText: {
    color: theme.palette.platinum,
    ...theme.typography.caption,
  },
  directoryList: {
    gap: theme.spacing.xs,
    marginBottom: theme.spacing.md,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.palette.graphite,
    padding: theme.spacing.sm,
    backgroundColor: theme.palette.obsidian,
    gap: theme.spacing.sm,
  },
  userRowSelected: {
    borderColor: theme.palette.azure,
  },
  userAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.palette.graphite,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userAvatarText: {
    color: theme.palette.platinum,
    ...theme.typography.caption,
  },
  userCopy: {
    flex: 1,
  },
  userName: {
    color: theme.palette.platinum,
    ...theme.typography.subtitle,
  },
  userHandle: {
    color: theme.palette.silver,
    ...theme.typography.caption,
  },
  userAction: {
    color: theme.palette.azure,
    ...theme.typography.caption,
  },
  refreshDirectory: {
    alignSelf: 'flex-start',
    marginTop: theme.spacing.xs,
  },
  refreshText: {
    color: theme.palette.azure,
    ...theme.typography.caption,
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
