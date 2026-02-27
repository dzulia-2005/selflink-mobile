import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Clipboard from 'expo-clipboard';
import { LinearGradient } from 'expo-linear-gradient';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { getRecipientId, savePersonalMapProfile } from '@api/users';
import { UserAvatar } from '@components/UserAvatar';
import { useToast } from '@context/ToastContext';
import { useAvatarPicker } from '@hooks/useAvatarPicker';
import { ProfileStackParamList } from '@navigation/types';
import { useAuthStore } from '@store/authStore';
import { useTheme, type Theme, type ThemeMode } from '@theme';
// import React from 'react';

const formatAccountKey = (value: string) => {
  if (value.length <= 14) {
    return value;
  }
  return `${value.slice(0, 6)}…${value.slice(-6)}`;
};

export function ProfileScreen() {
  const { t } = useTranslation();
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
  const { theme, mode, setMode } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const handleText = currentUser?.handle ? `@${currentUser.handle}` : '';

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
  }, [currentUser, currentUser?.id]);

  const handleCopyRecipientId = useCallback(async () => {
    if (!recipientId) {
      return;
    }
    try {
      await Clipboard.setStringAsync(recipientId);
      toast.push({
        message: t('profile.actions.copiedToClipboard'),
        tone: 'info',
        duration: 1500,
      });
    } catch (error) {
      console.warn('ProfileScreen: failed to copy recipient id', error);
      toast.push({ message: t('profile.actions.copyFailed'), tone: 'error' });
    }
  }, [recipientId, t, toast]);

  const handleSelectTheme = useCallback(
    async (nextMode: ThemeMode) => {
      await setMode(nextMode);
      toast.push({
        message: t('profile.actions.themeUpdated'),
        tone: 'info',
        duration: 1200,
      });
    },
    [setMode, t, toast],
  );

  if (!currentUser) {
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyStateText}>{t('profile.empty.loadFailed')}</Text>
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
            accessibilityRole="button"
            accessibilityLabel={t('profile.accessibility.changePhoto')}
          >
            <Text style={styles.editPhotoLabel}>
              {isUpdatingPhoto
                ? t('profile.actions.updatingPhoto')
                : t('profile.actions.changePhoto')}
            </Text>
          </TouchableOpacity>
          <Text style={styles.name}>{currentUser.name}</Text>
          <Text style={styles.handle}>{handleText}</Text>
          <Text style={styles.meta}>{currentUser.email}</Text>
          {currentUser.birth_place ? (
            <Text style={styles.meta}>{currentUser.birth_place}</Text>
          ) : null}
          <View style={styles.recipientCard}>
            <View style={styles.recipientInfo}>
              <Text style={styles.recipientLabel}>{t('profile.view.recipientIdLabel')}</Text>
              <Text style={styles.recipientValue}>
                {recipientIdLoading
                  ? t('profile.loading')
                  : recipientId
                    ? formatAccountKey(recipientId)
                    : t('profile.view.notAvailable')}
              </Text>
              <Text style={styles.recipientHint}>{t('profile.view.recipientIdHint')}</Text>
            </View>
            <TouchableOpacity
              style={[
                styles.copyButton,
                (!recipientId || recipientIdLoading) && styles.copyButtonDisabled,
              ]}
              onPress={handleCopyRecipientId}
              disabled={!recipientId || recipientIdLoading}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel={t('profile.accessibility.copyRecipientId')}
            >
              <Text style={styles.copyLabel}>{t('profile.actions.copy')}</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.sectionTitle}>{t('profile.view.sections.appearance')}</Text>
          <View style={styles.appearanceCard}>
            {(['system', 'light', 'dark'] as ThemeMode[]).map((value) => {
              const selected = mode === value;
              return (
                <TouchableOpacity
                  key={value}
                  style={[
                    styles.appearanceOption,
                    selected && styles.appearanceOptionActive,
                  ]}
                  onPress={() => handleSelectTheme(value)}
                  activeOpacity={0.85}
                >
                  <Text
                  style={[
                    styles.appearanceLabel,
                    selected && styles.appearanceLabelActive,
                  ]}
                >
                    {value === 'system'
                      ? t('profile.view.theme.system')
                      : value === 'light'
                        ? t('profile.view.theme.light')
                        : t('profile.view.theme.dark')}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <Text style={styles.sectionTitle}>{t('profile.view.sections.personalMap')}</Text>
          {hasCompletedPersonalMap && personalMap ? (
            <View style={styles.mapGrid}>
              <InfoRow
                styles={styles}
                label={t('profile.view.personalMap.firstName')}
                value={personalMap.first_name}
              />
              <InfoRow
                styles={styles}
                label={t('profile.view.personalMap.lastName')}
                value={personalMap.last_name}
              />
              <InfoRow
                styles={styles}
                label={t('profile.view.personalMap.birthDate')}
                value={personalMap.birth_date ?? t('profile.view.notAvailable')}
              />
              <InfoRow
                styles={styles}
                label={t('profile.view.personalMap.birthTime')}
                value={personalMap.birth_time ?? t('profile.view.notAvailable')}
              />
              <InfoRow
                styles={styles}
                label={t('profile.view.personalMap.birthCity')}
                value={personalMap.birth_place_city}
              />
              <InfoRow
                styles={styles}
                label={t('profile.view.personalMap.country')}
                value={personalMap.birth_place_country}
              />
            </View>
          ) : (
            <Text style={styles.meta}>{t('profile.view.personalMap.emptyHint')}</Text>
          )}
          <Text style={styles.sectionTitle}>{t('profile.view.sections.billing')}</Text>
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => navigation.navigate('Payments')}
            activeOpacity={0.9}
            accessibilityRole="button"
            accessibilityLabel={t('profile.menu.payments')}
          >
            <Text style={styles.actionLabel}>{t('profile.menu.payments')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => navigation.navigate('WalletLedger')}
            activeOpacity={0.9}
            accessibilityRole="button"
            accessibilityLabel={t('profile.menu.wallet')}
          >
            <Text style={styles.actionLabel}>{t('profile.menu.wallet')}</Text>
          </TouchableOpacity>
          <Text style={styles.sectionTitle}>{t('profile.view.sections.more')}</Text>
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => navigation.navigate('Notifications')}
            activeOpacity={0.9}
            accessibilityRole="button"
            accessibilityLabel={t('profile.menu.notifications')}
          >
            <Text style={styles.actionLabel}>{t('profile.menu.notifications')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => navigation.navigate('Inbox')}
            activeOpacity={0.9}
            accessibilityRole="button"
            accessibilityLabel={t('profile.menu.inbox')}
          >
            <Text style={styles.actionLabel}>{t('profile.menu.inbox')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => navigation.navigate('Community')}
            activeOpacity={0.9}
            accessibilityRole="button"
            accessibilityLabel={t('profile.menu.community')}
          >
            <Text style={styles.actionLabel}>{t('profile.menu.community')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleLogout}
            activeOpacity={0.9}
            accessibilityRole="button"
            accessibilityLabel={t('profile.actions.signOut')}
          >
            <Text style={styles.logoutLabel}>{t('profile.actions.signOut')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => navigation.navigate('ProfileEdit')}
            activeOpacity={0.9}
            accessibilityRole="button"
            accessibilityLabel={t('profile.menu.editProfile')}
          >
            <Text style={styles.logoutLabel}>{t('profile.menu.editProfile')}</Text>
          </TouchableOpacity>
        </LinearGradient>
      </ScrollView>
    </LinearGradient>
  );
}

type InfoRowProps = {
  label: string;
  value: string;
  styles: ReturnType<typeof createStyles>;
};

function InfoRow({ label, value, styles }: InfoRowProps) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
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
      backgroundColor: theme.colors.surface,
      ...theme.shadows.card,
    },
    editPhotoButton: {
      marginTop: theme.spacing.xs,
      paddingVertical: theme.spacing.xs,
      paddingHorizontal: theme.spacing.md,
      borderRadius: theme.radii.pill,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surfaceAlt,
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
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surfaceAlt,
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
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
    },
    copyButtonDisabled: {
      opacity: 0.6,
    },
    copyLabel: {
      color: theme.text.primary,
      fontWeight: '600',
    },
    appearanceCard: {
      alignSelf: 'stretch',
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: theme.spacing.sm,
      padding: theme.spacing.md,
      borderRadius: theme.radii.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surfaceAlt,
    },
    appearanceOption: {
      flex: 1,
      paddingVertical: theme.spacing.sm,
      borderRadius: theme.radii.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
      alignItems: 'center',
      backgroundColor: theme.colors.surface,
    },
    appearanceOptionActive: {
      borderColor: theme.colors.primary,
      backgroundColor: theme.colors.surfaceAlt,
    },
    appearanceLabel: {
      color: theme.text.secondary,
      ...theme.typography.caption,
    },
    appearanceLabelActive: {
      color: theme.text.primary,
      fontWeight: '700',
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
      backgroundColor: theme.colors.surfaceAlt,
    },
    logoutLabel: {
      color: theme.colors.error,
      ...theme.typography.button,
    },
    actionLabel: {
      color: theme.text.primary,
      ...theme.typography.button,
    },
    editButton: {
      marginTop: theme.spacing.md,
      alignSelf: 'stretch',
      paddingVertical: theme.spacing.sm,
      borderRadius: theme.radii.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
      alignItems: 'center',
      backgroundColor: theme.colors.surface,
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
