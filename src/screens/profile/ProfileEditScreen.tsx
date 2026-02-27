import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { updateMyProfile } from '@api/users';
import { MetalButton } from '@components/MetalButton';
import { MetalPanel } from '@components/MetalPanel';
import { useToast } from '@context/ToastContext';
import {
  type AppLanguage,
  getCanonicalLocale,
} from '@i18n/language';
import { useAppLanguage } from '@i18n/useAppLanguage';
import { ProfileStackParamList } from '@navigation/types';
import { ProfileSettings } from '@schemas/profile';
import { fetchProfileSettings, updateProfileSettings } from '@services/api/profile';
import { useAuthStore } from '@store/authStore';
import { useTheme, type Theme } from '@theme';

type Nav = NativeStackNavigationProp<ProfileStackParamList, 'ProfileEdit'>;

type OptionGroup =
  | 'gender'
  | 'orientation'
  | 'relationshipGoal'
  | 'attachmentStyle'
  | 'values'
  | 'preferredLifestyle'
  | 'loveLanguage';

const GENDERS = ['male', 'female', 'non_binary', 'other', 'prefer_not_to_say'];
const ORIENTATIONS = [
  'hetero',
  'homo',
  'bi',
  'pan',
  'asexual',
  'other',
  'prefer_not_to_say',
];
const REL_GOALS = ['casual', 'long_term', 'marriage', 'unsure'];
const ATTACHMENTS = ['secure', 'anxious', 'avoidant', 'mixed'];
const VALUES = [
  'growth',
  'freedom',
  'connection',
  'security',
  'adventure',
  'family',
  'career',
];
const LIFESTYLE = [
  'remote_work',
  'travel',
  'fitness',
  'nightlife',
  'early_riser',
  'spirituality',
];
const LOVE_LANG = ['words', 'quality_time', 'acts', 'gifts', 'touch'];
const APP_LANGUAGES: AppLanguage[] = ['en', 'ru', 'ka'];

export function ProfileEditScreen() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const navigation = useNavigation<Nav>();
  const { language: appLanguage, setLanguage: setAppLanguage } = useAppLanguage();
  const currentUser = useAuthStore((state) => state.currentUser);
  const setCurrentUser = useAuthStore((state) => state.setCurrentUser);
  const toast = useToast();
  const [name, setName] = useState(currentUser?.name ?? '');
  const [bio, setBio] = useState(currentUser?.bio ?? '');
  const [selectedLanguage, setSelectedLanguage] = useState<AppLanguage>(appLanguage);
  const [locale, setLocale] = useState(getCanonicalLocale(appLanguage));
  const [birthPlace, setBirthPlace] = useState(currentUser?.birth_place ?? '');
  const [saving, setSaving] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [profileSettings, setProfileSettings] = useState<ProfileSettings>({});

  useEffect(() => {
    setSelectedLanguage(appLanguage);
    setLocale((prev) => prev || getCanonicalLocale(appLanguage));
  }, [appLanguage]);

  useEffect(() => {
    let mounted = true;
    fetchProfileSettings()
      .then((data) => {
        if (mounted) {
          setProfileSettings(data || {});
        }
      })
      .catch((error) => {
        console.error('ProfileEditScreen: failed to load profile settings', error);
        toast.push({
          message: t('profile.loadError'),
          tone: 'error',
        });
      })
      .finally(() => {
        if (mounted) {
          setLoadingProfile(false);
        }
      });
    return () => {
      mounted = false;
    };
  }, [t, toast]);

  const toggleListValue = useCallback((key: keyof ProfileSettings, value: string) => {
    setProfileSettings((prev: ProfileSettings) => {
      const list = Array.isArray(prev[key]) ? (prev[key] as string[]) : [];
      const next = list.includes(value)
        ? list.filter((v) => v !== value)
        : [...list, value];
      return { ...prev, [key]: next };
    });
  }, []);

  const setValue = useCallback((key: keyof ProfileSettings, value: string) => {
    setProfileSettings((prev: ProfileSettings) => ({ ...prev, [key]: value }));
  }, []);

  const optionLabel = useCallback(
    (group: OptionGroup, value: string) =>
      t(`profile.options.${group}.${value}`, {
        defaultValue: value.replace(/_/g, ' '),
      }),
    [t],
  );

  const handleLanguageChange = useCallback(
    async (nextLanguage: AppLanguage) => {
      try {
        await setAppLanguage(nextLanguage);
        setSelectedLanguage(nextLanguage);
        setLocale(getCanonicalLocale(nextLanguage));
      } catch (error) {
        console.error('ProfileEditScreen: failed to change language', error);
        toast.push({
          message: t('profile.languageChangeError'),
          tone: 'error',
          duration: 4000,
        });
      }
    },
    [setAppLanguage, t, toast],
  );

  const handleSave = useCallback(async () => {
    if (saving) {
      return;
    }
    setSaving(true);
    try {
      const updated = await updateMyProfile({
        name: name || undefined,
        bio: bio || undefined,
        locale: locale || undefined,
        birth_place: birthPlace || undefined,
      });
      setCurrentUser(updated);
      await updateProfileSettings({
        ...profileSettings,
        language: selectedLanguage,
      });
      toast.push({
        message: t('profile.updated'),
        tone: 'info',
        duration: 3000,
      });
      navigation.goBack();
    } catch (error) {
      console.error('ProfileEditScreen: update failed', error);
      toast.push({
        message: t('profile.saveError'),
        tone: 'error',
        duration: 5000,
      });
    } finally {
      setSaving(false);
    }
  }, [
    bio,
    birthPlace,
    locale,
    name,
    navigation,
    profileSettings,
    saving,
    selectedLanguage,
    setCurrentUser,
    t,
    toast,
  ]);

  const renderChips = (
    options: string[],
    selected: string[] = [],
    onPress: (value: string) => void,
    labelGroup: OptionGroup,
  ) => (
    <View style={styles.chipRow}>
      {options.map((opt) => {
        const active = selected.includes(opt);
        return (
          <Pressable
            key={opt}
            style={[styles.chip, active && styles.chipSelected]}
            onPress={() => onPress(opt)}
          >
            <Text style={[styles.chipLabel, active && styles.chipLabelSelected]}>
              {optionLabel(labelGroup, opt)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );

  const renderRadio = (
    options: string[],
    selected?: string,
    onPress?: (value: string) => void,
    labelGroup: OptionGroup | 'languageOptions' = 'gender',
  ) => (
    <View style={styles.chipRow}>
      {options.map((opt) => {
        const active = selected === opt;
        return (
          <Pressable
            key={opt}
            style={[styles.chip, active && styles.chipSelected]}
            onPress={() => onPress?.(opt)}
          >
            <Text style={[styles.chipLabel, active && styles.chipLabelSelected]}>
              {labelGroup === 'languageOptions'
                ? t(`profile.languageOptions.${opt}`, {
                    defaultValue: opt.toUpperCase(),
                  })
                : optionLabel(labelGroup, opt)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );

  if (loadingProfile) {
    return (
      <View style={styles.loading}>
        <Text style={styles.loadingText}>{t('profile.loadingProfile')}</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content}>
          <MetalPanel glow>
            <TextInput
              placeholder={t('profile.namePlaceholder')}
              placeholderTextColor={theme.palette.silver}
              value={name}
              onChangeText={setName}
              style={styles.input}
              accessibilityLabel={t('profile.accessibility.nameInput')}
            />
            <TextInput
              placeholder={t('profile.bioPlaceholder')}
              placeholderTextColor={theme.palette.silver}
              value={bio}
              onChangeText={setBio}
              style={[styles.input, styles.multiline]}
              multiline
              numberOfLines={3}
              accessibilityLabel={t('profile.accessibility.bioInput')}
            />
            <TextInput
              placeholder={t('profile.birthPlacePlaceholder')}
              placeholderTextColor={theme.palette.silver}
              value={birthPlace}
              onChangeText={setBirthPlace}
              style={styles.input}
              accessibilityLabel={t('profile.accessibility.birthPlaceInput')}
            />

            <Text style={styles.label}>{t('profile.language')}</Text>
            {renderRadio(
              APP_LANGUAGES,
              selectedLanguage,
              (value) => {
                handleLanguageChange(value as AppLanguage).catch(() => undefined);
              },
              'languageOptions',
            )}

            <Text style={styles.label}>{t('profile.gender')}</Text>
            {renderRadio(
              GENDERS,
              profileSettings.gender,
              (value) => setValue('gender', value),
              'gender',
            )}

            <Text style={styles.label}>{t('profile.orientation')}</Text>
            {renderRadio(
              ORIENTATIONS,
              profileSettings.orientation,
              (value) => setValue('orientation', value),
              'orientation',
            )}

            <Text style={styles.label}>{t('profile.relationshipGoal')}</Text>
            {renderRadio(
              REL_GOALS,
              profileSettings.relationship_goal,
              (value) => setValue('relationship_goal', value),
              'relationshipGoal',
            )}

            <Text style={styles.label}>{t('profile.attachmentStyle')}</Text>
            {renderRadio(
              ATTACHMENTS,
              profileSettings.attachment_style,
              (value) => setValue('attachment_style', value),
              'attachmentStyle',
            )}

            <Text style={styles.label}>{t('profile.values')}</Text>
            {renderChips(
              VALUES,
              profileSettings.values || [],
              (value) => toggleListValue('values', value),
              'values',
            )}

            <Text style={styles.label}>{t('profile.preferredLifestyle')}</Text>
            {renderChips(
              LIFESTYLE,
              profileSettings.preferred_lifestyle || [],
              (value) => toggleListValue('preferred_lifestyle', value),
              'preferredLifestyle',
            )}

            <Text style={styles.label}>{t('profile.loveLanguage')}</Text>
            {renderChips(
              LOVE_LANG,
              profileSettings.love_language || [],
              (value) => toggleListValue('love_language', value),
              'loveLanguage',
            )}

            <View style={styles.actions}>
              <MetalButton title={t('common.cancel')} onPress={() => navigation.goBack()} />
              <MetalButton
                title={saving ? t('profile.saving') : t('common.save')}
                onPress={handleSave}
                disabled={saving}
              />
            </View>
          </MetalPanel>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.palette.midnight,
    },
    flex: {
      flex: 1,
    },
    content: {
      padding: theme.spacing.lg,
    },
    input: {
      borderRadius: theme.radii.md,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      backgroundColor: theme.palette.pearl,
      color: theme.palette.titanium,
      marginBottom: theme.spacing.sm,
    },
    multiline: {
      minHeight: 80,
      textAlignVertical: 'top',
    },
    actions: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: theme.spacing.sm,
      marginTop: theme.spacing.md,
    },
    chipRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing.xs,
      marginBottom: theme.spacing.sm,
    },
    chip: {
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xs,
      borderRadius: theme.radii.pill,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: 'rgba(255,255,255,0.05)',
    },
    chipSelected: {
      borderColor: theme.colors.primary,
      backgroundColor: 'rgba(124, 58, 237, 0.15)',
    },
    chipLabel: {
      color: theme.text.muted,
      fontSize: 12,
    },
    chipLabelSelected: {
      color: theme.text.primary,
      fontWeight: '700',
    },
    label: {
      color: theme.text.primary,
      ...theme.typography.caption,
      marginTop: theme.spacing.sm,
      marginBottom: theme.spacing.xs,
    },
    loading: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.palette.midnight,
    },
    loadingText: {
      color: theme.text.primary,
      ...theme.typography.subtitle,
    },
  });
