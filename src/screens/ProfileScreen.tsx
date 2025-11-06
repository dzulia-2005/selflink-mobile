import { StatusBar } from 'expo-status-bar';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MetalButton } from '@components/MetalButton';
import { MetalPanel } from '@components/MetalPanel';
import { MetalToast } from '@components/MetalToast';
import { AuthUser } from '@context/AuthContext';
import { useAuth } from '@hooks/useAuth';
import { theme } from '@theme/index';

export function ProfileScreen() {
  const { user, signOut, updateProfile, refreshProfile } = useAuth();
  const [name, setName] = useState(user?.name ?? '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl ?? '');
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; tone: 'info' | 'error' } | null>(
    null,
  );

  const initials = useMemo(() => {
    if (name) {
      return name[0]?.toUpperCase();
    }
    if (user?.email) {
      return user.email[0]?.toUpperCase();
    }
    return 'S';
  }, [name, user?.email]);

  const handleSignOut = useCallback(async () => {
    await signOut();
  }, [signOut]);

  const handleSave = useCallback(async () => {
    if (isSaving) {
      return;
    }
    try {
      setIsSaving(true);
      const payload: Partial<AuthUser> = {};
      if (name !== user?.name) {
        payload.name = name;
      }
      if (avatarUrl !== user?.avatarUrl) {
        payload.avatarUrl = avatarUrl;
      }
      if (Object.keys(payload).length === 0) {
        setToast({ message: 'No changes to save.', tone: 'info' });
        return;
      }
      await updateProfile(payload);
      setToast({ message: 'Profile updated successfully.', tone: 'info' });
      await refreshProfile();
    } catch (error) {
      console.error('Profile update failed', error);
      setToast({ message: 'Could not update profile. Please try again.', tone: 'error' });
    } finally {
      setIsSaving(false);
    }
  }, [
    isSaving,
    name,
    avatarUrl,
    user?.name,
    user?.avatarUrl,
    updateProfile,
    refreshProfile,
  ]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.content}>
        <MetalToast
          visible={Boolean(toast)}
          message={toast?.message ?? ''}
          tone={toast?.tone ?? 'info'}
          actionLabel="Dismiss"
          onAction={() => setToast(null)}
        />

        <MetalPanel glow>
          <View style={styles.headerRow}>
            <View style={styles.avatarWrapper}>
              {avatarUrl ? (
                <Image source={{ uri: avatarUrl }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarFallback}>
                  <Text style={styles.avatarInitials}>{initials}</Text>
                </View>
              )}
            </View>
            <View style={styles.meta}>
              <Text style={styles.label}>Display Name</Text>
              <TextInput
                value={name}
                onChangeText={setName}
                style={styles.input}
                placeholder="Add your name"
                placeholderTextColor={theme.palette.silver}
              />
              <Text style={styles.label}>Avatar URL</Text>
              <TextInput
                value={avatarUrl}
                onChangeText={setAvatarUrl}
                style={styles.input}
                placeholder="https://example.com/avatar.png"
                placeholderTextColor={theme.palette.silver}
                autoCapitalize="none"
              />
            </View>
          </View>
        </MetalPanel>

        <MetalPanel>
          <Text style={styles.emailLabel}>Email</Text>
          <Text style={styles.emailValue}>{user?.email}</Text>
        </MetalPanel>

        <MetalPanel>
          <View style={styles.actions}>
            <MetalButton
              title={isSaving ? 'Saving…' : 'Save Changes'}
              onPress={handleSave}
              icon={
                isSaving ? (
                  <ActivityIndicator color={theme.palette.titanium} />
                ) : undefined
              }
            />
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
    width: 88,
    height: 88,
    borderRadius: 44,
    overflow: 'hidden',
    backgroundColor: theme.palette.pearl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    width: 88,
    height: 88,
  },
  avatarFallback: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: theme.palette.platinum,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    fontSize: 30,
    fontWeight: '700',
    color: theme.palette.titanium,
  },
  meta: {
    flex: 1,
    gap: theme.spacing.sm,
  },
  label: {
    color: theme.palette.silver,
    ...theme.typography.subtitle,
  },
  input: {
    borderRadius: theme.radius.md,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: theme.palette.pearl,
    color: theme.palette.titanium,
  },
  emailLabel: {
    color: theme.palette.silver,
    marginBottom: theme.spacing.xs,
  },
  emailValue: {
    color: theme.palette.platinum,
    ...theme.typography.subtitle,
  },
  actions: {
    gap: theme.spacing.sm,
  },
});
