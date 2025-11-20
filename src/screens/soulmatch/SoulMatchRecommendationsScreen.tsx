import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCallback, useState } from 'react';
import {
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { EmptyState } from '@components/EmptyState';
import { LoadingOverlay } from '@components/LoadingOverlay';
import { MetalPanel } from '@components/MetalPanel';
import { UserAvatar } from '@components/UserAvatar';
import { useToast } from '@context/ToastContext';
import { SoulMatchStackParamList } from '@navigation/types';
import { SoulmatchResult } from '@schemas/soulmatch';
import { fetchRecommendations } from '@services/api/soulmatch';
import { theme } from '@theme/index';

type Nav = NativeStackNavigationProp<SoulMatchStackParamList>;

export function SoulMatchRecommendationsScreen() {
  const navigation = useNavigation<Nav>();
  const toast = useToast();
  const [items, setItems] = useState<SoulmatchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchRecommendations();
      setItems(data);
    } catch (error) {
      console.error('SoulMatch recommendations failed', error);
      toast.push({
        message: 'Unable to load recommendations.',
        tone: 'error',
        duration: 4000,
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useFocusEffect(
    useCallback(() => {
      load().catch(() => undefined);
    }, [load]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const renderItem = ({ item }: { item: SoulmatchResult }) => {
    const target = item.user;
    return (
      <TouchableOpacity
        onPress={() =>
          navigation.navigate('SoulMatchDetail', {
            userId: target.id,
            displayName: target.name || target.handle,
          })
        }
      >
        <MetalPanel style={styles.card}>
          <View style={styles.cardHeader}>
            <UserAvatar size={48} uri={target.photo ?? undefined} label={target.name} />
            <View style={styles.cardTitleBlock}>
              <Text style={styles.cardName}>{target.name || target.handle}</Text>
              <Text style={styles.cardHandle}>@{target.handle}</Text>
            </View>
            <View style={styles.score}>
              <Text style={styles.scoreValue}>{item.score}</Text>
              <Text style={styles.scoreLabel}>/100</Text>
            </View>
          </View>
          <View style={styles.tags}>
            {item.tags?.slice(0, 3).map((tag) => (
              <View key={tag} style={styles.tagPill}>
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ))}
          </View>
        </MetalPanel>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return <LoadingOverlay label="Finding your SoulMatches…" />;
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={items}
        keyExtractor={(item) => String(item.user?.id ?? item.user_id ?? Math.random())}
        contentContainerStyle={styles.listContent}
        renderItem={renderItem}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#fff"
          />
        }
        ListEmptyComponent={
          <EmptyState
            title="No matches yet"
            description="Once your chart and profile are complete, recommendations will appear here."
            actionLabel="Refresh"
            onAction={load}
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.palette.midnight,
  },
  listContent: {
    padding: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  card: {
    padding: theme.spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  cardTitleBlock: {
    flex: 1,
  },
  cardName: {
    color: theme.palette.platinum,
    ...theme.typography.subtitle,
  },
  cardHandle: {
    color: theme.palette.silver,
    ...theme.typography.caption,
  },
  score: {
    alignItems: 'flex-end',
  },
  scoreValue: {
    color: theme.palette.platinum,
    fontSize: 22,
    fontWeight: '700',
  },
  scoreLabel: {
    color: theme.palette.silver,
    fontSize: 12,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.xs,
    marginTop: theme.spacing.sm,
  },
  tagPill: {
    backgroundColor: theme.palette.titanium,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.radii.pill,
  },
  tagText: {
    color: theme.palette.pearl,
    fontSize: 12,
    fontWeight: '600',
  },
});
