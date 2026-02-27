import { NavigatorScreenParams, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
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

import { MetalButton } from '@components/MetalButton';
import { MetalPanel } from '@components/MetalPanel';
import { ThreadCard } from '@components/ThreadCard';
import { useToast } from '@context/ToastContext';
import { useAuth } from '@hooks/useAuth';
import { useThreads } from '@hooks/useThreads';
import { useUsersDirectory } from '@hooks/useUsersDirectory';
import type { MessagesStackParamList, ProfileStackParamList } from '@navigation/types';
import type { UserProfile } from '@services/api/user';
import { useTheme, type Theme } from '@theme';

type InboxNavigation = NativeStackNavigationProp<ProfileStackParamList, 'Inbox'>;

export function InboxScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<InboxNavigation>();
  const toast = useToast();
  const { theme, resolved } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
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
      const params: NavigatorScreenParams<MessagesStackParamList> = {
        screen: 'Chat',
        params: { threadId: String(threadId) },
      };
      (navigation.getParent() as any)?.navigate('Messages', params);
    },
    [navigation],
  );

  const authUserKey = useMemo(
    () =>
      authUser?.id !== undefined && authUser?.id !== null ? String(authUser.id) : null,
    [authUser?.id],
  );
  const authUserNumeric = useMemo(
    () => (authUserKey != null ? Number(authUserKey) : null),
    [authUserKey],
  );
  const filteredDirectory = useMemo(
    () =>
      directoryUsers.filter((candidate) =>
        authUserKey ? String(candidate.id) !== authUserKey : true,
      ),
    [authUserKey, directoryUsers],
  );
  const selectedIds = useMemo(
    () =>
      selectedUsers
        .map((user) => Number(user.id))
        .filter((id) => (authUserNumeric != null ? id !== authUserNumeric : true)),
    [authUserNumeric, selectedUsers],
  );

  const handleCreateThread = useCallback(async () => {
    if (creating) {
      return;
    }
    if (selectedIds.length === 0) {
      toast.push({
        tone: 'error',
        message: t('inbox.alerts.addParticipant'),
      });
      return;
    }

    if (!message.trim()) {
      toast.push({
        tone: 'error',
        message: t('inbox.alerts.addOpeningMessage'),
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
  }, [creating, createThread, selectedIds, message, openThread, t, title, toast]);

  const toggleUserSelection = useCallback(
    (user: UserProfile) => {
      const userKey = String(user.id);
      if (authUserKey && userKey === authUserKey) {
        return;
      }
      setSelectedUsers((prev) => {
        const exists = prev.some((item) => String(item.id) === userKey);
        if (exists) {
          return prev.filter((item) => String(item.id) !== userKey);
        }
        return [...prev, user];
      });
    },
    [authUserKey],
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style={resolved === 'dark' ? 'light' : 'dark'} />
      <View style={styles.hero}>
        <Text style={styles.title}>{t('inbox.title')}</Text>
        <Text style={styles.subtitle}>{t('inbox.subtitle')}</Text>
      </View>
      <FlatList
        contentContainerStyle={styles.list}
        data={threads}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <ThreadCard thread={item} onPress={() => openThread(item.id)} />
        )}
        onEndReachedThreshold={0.2}
        onEndReached={() => {
          if (hasMore && !loading && !refreshing) {
            loadMore();
          }
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refresh}
            tintColor={theme.palette.platinum}
          />
        }
        ListFooterComponent={
          loading ? (
            <View style={styles.loader}>
              <ActivityIndicator color={theme.palette.platinum} />
            </View>
          ) : null
        }
        ListEmptyComponent={
          !loading ? (
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>{t('inbox.empty.title')}</Text>
              <Text style={styles.emptyCopy}>{t('inbox.empty.body')}</Text>
            </View>
          ) : null
        }
        ListHeaderComponent={
          <MetalPanel glow>
            <Text style={styles.panelTitle}>{t('inbox.composer.title')}</Text>
            <Text style={styles.helper}>{t('inbox.composer.subtitle')}</Text>
            <TextInput
              style={styles.input}
              placeholder={t('inbox.composer.titlePlaceholder')}
              placeholderTextColor={theme.palette.graphite}
              value={title}
              onChangeText={setTitle}
              accessibilityLabel={t('inbox.accessibility.titleInput')}
            />
            <TextInput
              style={styles.input}
              placeholder={t('inbox.composer.searchPlaceholder')}
              placeholderTextColor={theme.palette.graphite}
              value={search}
              onChangeText={setSearch}
              autoCapitalize="none"
              accessibilityLabel={t('inbox.accessibility.searchInput')}
            />
            <View style={styles.selectedWrap}>
              {selectedUsers.length === 0 ? (
                <Text style={styles.helper}>{t('inbox.composer.noParticipants')}</Text>
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
                <Text style={styles.helper}>{t('inbox.composer.noMatches')}</Text>
              ) : (
                filteredDirectory.map((user) => {
                  const numericId = Number(user.id);
                  const isSelected = selectedIds.includes(numericId);
                  const handleText = ['@', user.handle ?? t('inbox.user.handleFallback')].join(
                    '',
                  );
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
                        <Text style={styles.userName}>
                          {user.name ?? t('inbox.user.unnamed')}
                        </Text>
                        <Text style={styles.userHandle}>{handleText}</Text>
                      </View>
                      <Text style={styles.userAction}>
                        {isSelected ? t('inbox.actions.remove') : t('inbox.actions.add')}
                      </Text>
                    </Pressable>
                  );
                })
              )}
            </View>
            <TextInput
              style={[styles.input, styles.messageInput]}
              placeholder={t('inbox.composer.messagePlaceholder')}
              placeholderTextColor={theme.palette.graphite}
              value={message}
              onChangeText={setMessage}
              multiline
              accessibilityLabel={t('inbox.accessibility.messageInput')}
            />
            <MetalButton
              title={
                creating ? t('inbox.actions.sending') : t('inbox.actions.startThread')
              }
              onPress={handleCreateThread}
              disabled={creating || selectedUsers.length === 0}
            />
            <Pressable
              style={styles.refreshDirectory}
              onPress={refreshDirectory}
              accessibilityRole="button"
              accessibilityLabel={t('inbox.accessibility.refreshPeopleList')}
            >
              <Text style={styles.refreshText}>{t('inbox.actions.refreshPeopleList')}</Text>
            </Pressable>
          </MetalPanel>
        }
      />
    </SafeAreaView>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
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
