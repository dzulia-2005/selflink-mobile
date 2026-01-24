import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Clipboard from 'expo-clipboard';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { getRecipientId, savePersonalMapProfile } from '@api/users';
import { UserAvatar } from '@components/UserAvatar';
import { useToast } from '@context/ToastContext';
import { useAvatarPicker } from '@hooks/useAvatarPicker';
import { ProfileStackParamList } from '@navigation/types';
import { useAuthStore } from '@store/authStore';
import { theme } from '@theme';

const formatAccountKey = (value: string) => {
  if (value.length <= 14) {
    return value;
  }
  return `${value.slice(0, 6)}…${value.slice(-6)}`;
};

export function ProfileScreen() {
  const currentUser = useAuthStore((state) => state.currentUser);
  const personalMap = useAuthStore((state) => state.personalMap);
  const hasCompletedPersonalMap = useAuthStore((state) => state.hasCompletedPersonalMap);
  const logout = useAuthStore((state) => state.logout);
  const toast = useToast();
  const [isUpdatingPhoto, setIsUpdatingPhoto] = useState(false);
  const [recipientId, setRecipientId] = useState<string | null>(null);
  const [recipientIdLoading, setRecipientIdLoading] = useState(false);
  const { pickImage, isPicking } = useAvatarPicker();
  const fetchProfile = useAuthStore((state) => state.fetchProfile);
  const navigation =
    useNavigation<NativeStackNavigationProp<ProfileStackParamList, 'ProfileHome'>>();

  const handleLogout = useCallback(async () => {
    await logout();
  }, [logout]);

  const handleChangePhoto = useCallback(async () => {
    if (isUpdatingPhoto || isPicking) {
      return;
    }
    console.debug('[ProfileHome] change avatar: opening picker');
    const asset = await pickImage();
    if (!asset) {
      console.debug('[ProfileHome] change avatar: picker cancelled');
      return;
    }
    setIsUpdatingPhoto(true);
    try {
      console.debug('[ProfileHome] change avatar: uploading asset', asset.uri);
      await savePersonalMapProfile({
        avatarFile: {
          uri: asset.uri,
          name: asset.name ?? 'avatar.jpg',
          type: asset.type ?? 'image/jpeg',
        },
      });
      console.debug('[ProfileHome] change avatar: upload success');
      await fetchProfile();
      if (__DEV__) {
        const refreshed = useAuthStore.getState().currentUser;
        console.debug('[ProfileHome] change avatar: store refreshed', {
          photo: refreshed?.photo,
        });
      }
      console.debug('[ProfileHome] change avatar: profile refreshed');
    } catch (error) {
      console.warn('ProfileScreen: failed to upload avatar', error);
    } finally {
      setIsUpdatingPhoto(false);
    }
  }, [fetchProfile, isPicking, isUpdatingPhoto, pickImage]);

  useEffect(() => {
    if (!currentUser) {
      return;
    }
    let isMounted = true;
    setRecipientIdLoading(true);
    getRecipientId()
      .then((data) => {
        if (isMounted) {
          setRecipientId(data.account_key);
        }
      })
      .catch((error) => {
        console.warn('ProfileScreen: failed to load recipient id', error);
        if (isMounted) {
          setRecipientId(null);
        }
      })
      .finally(() => {
        if (isMounted) {
          setRecipientIdLoading(false);
        }
      });
    return () => {
      isMounted = false;
    };
  }, [currentUser?.id]);

  const handleCopyRecipientId = useCallback(async () => {
    if (!recipientId) {
      return;
    }
    try {
      await Clipboard.setStringAsync(recipientId);
      toast.push({ message: 'Copied to clipboard', tone: 'info', duration: 1500 });
    } catch (error) {
      console.warn('ProfileScreen: failed to copy recipient id', error);
      toast.push({ message: 'Unable to copy right now.', tone: 'error' });
    }
  }, [recipientId, toast]);

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
          <TouchableOpacity
            style={[
              styles.editPhotoButton,
              (isUpdatingPhoto || isPicking) && styles.editPhotoButtonDisabled,
            ]}
            onPress={handleChangePhoto}
            disabled={isUpdatingPhoto || isPicking}
            activeOpacity={0.85}
          >
            <Text style={styles.editPhotoLabel}>
              {isUpdatingPhoto ? 'Updating photo…' : 'Change photo'}
            </Text>
          </TouchableOpacity>
          <Text style={styles.name}>{currentUser.name}</Text>
          <Text style={styles.handle}>@{currentUser.handle}</Text>
          <Text style={styles.meta}>{currentUser.email}</Text>
          {currentUser.birth_place ? (
            <Text style={styles.meta}>{currentUser.birth_place}</Text>
          ) : null}
          <View style={styles.recipientCard}>
            <View style={styles.recipientInfo}>
              <Text style={styles.recipientLabel}>Recipient ID (SLC)</Text>
              <Text style={styles.recipientValue}>
                {recipientIdLoading
                  ? 'Loading…'
                  : recipientId
                    ? formatAccountKey(recipientId)
                    : 'Not available'}
              </Text>
              <Text style={styles.recipientHint}>Share this ID to receive SLC.</Text>
            </View>
            <TouchableOpacity
              style={[
                styles.copyButton,
                (!recipientId || recipientIdLoading) && styles.copyButtonDisabled,
              ]}
              onPress={handleCopyRecipientId}
              disabled={!recipientId || recipientIdLoading}
              activeOpacity={0.85}
            >
              <Text style={styles.copyLabel}>Copy</Text>
            </TouchableOpacity>
          </View>
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
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => navigation.navigate('ProfileEdit')}
            activeOpacity={0.9}
          >
            <Text style={styles.logoutLabel}>Edit profile</Text>
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
  editPhotoButton: {
    marginTop: theme.spacing.xs,
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radii.pill,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
  },
  editPhotoButtonDisabled: {
    opacity: 0.6,
  },
  editPhotoLabel: {
    color: theme.text.primary,
    fontWeight: '600',
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
  recipientCard: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.md,
    marginTop: theme.spacing.sm,
    padding: theme.spacing.md,
    borderRadius: theme.radii.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    backgroundColor: 'rgba(15, 23, 42, 0.35)',
  },
  recipientInfo: {
    flex: 1,
    gap: theme.spacing.xs,
  },
  recipientLabel: {
    color: theme.text.muted,
    ...theme.typography.caption,
  },
  recipientValue: {
    color: theme.text.primary,
    fontWeight: '700',
  },
  recipientHint: {
    color: theme.text.secondary,
    ...theme.typography.caption,
  },
  copyButton: {
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radii.pill,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  copyButtonDisabled: {
    opacity: 0.6,
  },
  copyLabel: {
    color: theme.text.primary,
    fontWeight: '600',
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
  editButton: {
    marginTop: theme.spacing.md,
    alignSelf: 'stretch',
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radii.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
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
