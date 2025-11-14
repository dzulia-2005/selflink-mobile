import { LinearGradient } from 'expo-linear-gradient';
import { useCallback } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { UserAvatar } from '@components/UserAvatar';
import { useAuthStore } from '@store/authStore';
import { theme } from '@theme';

export function ProfileScreen() {
  const currentUser = useAuthStore((state) => state.currentUser);
  const personalMap = useAuthStore((state) => state.personalMap);
  const hasCompletedPersonalMap = useAuthStore((state) => state.hasCompletedPersonalMap);
  const logout = useAuthStore((state) => state.logout);

  const handleLogout = useCallback(async () => {
    await logout();
  }, [logout]);

  if (!currentUser) {
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyStateText}>We could not load your profile.</Text>
      </View>
    );
  }

  return (
    <LinearGradient colors={theme.gradients.appBackground} style={styles.screen}>
      <ScrollView contentContainerStyle={styles.container}>
        <LinearGradient colors={theme.gradients.card} style={styles.card}>
          <UserAvatar uri={currentUser.photo} label={currentUser.name} size={80} />
          <Text style={styles.name}>{currentUser.name}</Text>
          <Text style={styles.handle}>@{currentUser.handle}</Text>
          <Text style={styles.meta}>{currentUser.email}</Text>
          {currentUser.birth_place ? (
            <Text style={styles.meta}>{currentUser.birth_place}</Text>
          ) : null}
          <Text style={styles.sectionTitle}>Personal map</Text>
          {hasCompletedPersonalMap && personalMap ? (
            <View style={styles.mapGrid}>
              <InfoRow label="First name" value={personalMap.first_name} />
              <InfoRow label="Last name" value={personalMap.last_name} />
              <InfoRow label="Birth date" value={personalMap.birth_date ?? 'N/A'} />
              <InfoRow label="Birth time" value={personalMap.birth_time ?? 'N/A'} />
              <InfoRow label="Birth city" value={personalMap.birth_place_city} />
              <InfoRow label="Country" value={personalMap.birth_place_country} />
            </View>
          ) : (
            <Text style={styles.meta}>
              Complete your personal map to unlock mentor, matrix, and soul match
              insights.
            </Text>
          )}
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleLogout}
            activeOpacity={0.9}
          >
            <Text style={styles.logoutLabel}>Sign out</Text>
          </TouchableOpacity>
        </LinearGradient>
      </ScrollView>
    </LinearGradient>
  );
}

type InfoRowProps = {
  label: string;
  value: string;
};

function InfoRow({ label, value }: InfoRowProps) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  container: {
    padding: theme.spacing.xl,
    gap: theme.spacing.lg,
  },
  card: {
    borderRadius: theme.radii.lg,
    padding: theme.spacing.xl,
    alignItems: 'center',
    gap: theme.spacing.md,
    ...theme.shadows.card,
  },
  name: {
    ...theme.typography.headingL,
    color: theme.text.primary,
  },
  handle: {
    color: theme.text.secondary,
  },
  meta: {
    color: theme.text.secondary,
    textAlign: 'center',
  },
  sectionTitle: {
    alignSelf: 'flex-start',
    marginTop: theme.spacing.lg,
    color: theme.text.primary,
    ...theme.typography.headingM,
  },
  mapGrid: {
    alignSelf: 'stretch',
    gap: theme.spacing.sm,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  infoLabel: {
    color: theme.text.muted,
  },
  infoValue: {
    color: theme.text.primary,
    fontWeight: '600',
  },
  logoutButton: {
    marginTop: theme.spacing.xl,
    alignSelf: 'stretch',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.md,
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  logoutLabel: {
    color: theme.colors.error,
    ...theme.typography.button,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.background,
  },
  emptyStateText: {
    color: theme.text.secondary,
  },
});
