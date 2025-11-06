import { StatusBar } from 'expo-status-bar';
import { useCallback } from 'react';
import { Alert, Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MetalButton } from '@components/MetalButton';
import { MetalPanel } from '@components/MetalPanel';
import { useAuth } from '@hooks/useAuth';
import { theme } from '@theme/index';

export function ProfileScreen() {
  const { user, signOut } = useAuth();

  const handleSignOut = useCallback(async () => {
    await signOut();
  }, [signOut]);

  const handleEditProfile = useCallback(() => {
    Alert.alert('Coming soon', 'Profile editing will arrive in the next iteration.');
  }, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.content}>
        <MetalPanel glow>
          <View style={styles.headerRow}>
            <View style={styles.avatarWrapper}>
              {user?.avatarUrl ? (
                <Image source={{ uri: user.avatarUrl }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarFallback}>
                  <Text style={styles.avatarInitials}>
                    {user?.name?.[0]?.toUpperCase() ??
                      user?.email?.[0]?.toUpperCase() ??
                      'S'}
                  </Text>
                </View>
              )}
            </View>
            <View style={styles.meta}>
              <Text style={styles.name}>{user?.name ?? 'Selflink Explorer'}</Text>
              <Text style={styles.email}>{user?.email}</Text>
            </View>
          </View>
          <View style={styles.actions}>
            <MetalButton title="Edit Profile" onPress={handleEditProfile} />
            <MetalButton title="Sign Out" onPress={handleSignOut} />
          </View>
        </MetalPanel>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.palette.midnight,
  },
  content: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.xl,
    paddingBottom: theme.spacing.xl,
    gap: theme.spacing.lg,
  },
  headerRow: {
    flexDirection: 'row',
    gap: theme.spacing.lg,
    alignItems: 'center',
  },
  avatarWrapper: {
    width: 80,
    height: 80,
    borderRadius: 40,
    overflow: 'hidden',
    backgroundColor: theme.palette.pearl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    width: 80,
    height: 80,
  },
  avatarFallback: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: theme.palette.platinum,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    fontSize: 28,
    fontWeight: '700',
    color: theme.palette.titanium,
  },
  meta: {
    flex: 1,
    gap: theme.spacing.xs,
  },
  name: {
    color: theme.palette.platinum,
    ...theme.typography.title,
    fontSize: 24,
  },
  email: {
    color: theme.palette.silver,
  },
  actions: {
    marginTop: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
});
