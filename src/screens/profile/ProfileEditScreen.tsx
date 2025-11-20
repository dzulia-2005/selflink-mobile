import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCallback, useEffect, useState } from 'react';
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
import { ProfileStackParamList } from '@navigation/types';
import { ProfileSettings } from '@schemas/profile';
import { fetchProfileSettings, updateProfileSettings } from '@services/api/profile';
import { useAuthStore } from '@store/authStore';
import { theme } from '@theme/index';

type Nav = NativeStackNavigationProp<ProfileStackParamList, 'ProfileEdit'>;

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

export function ProfileEditScreen() {
  const navigation = useNavigation<Nav>();
  const currentUser = useAuthStore((state) => state.currentUser);
  const setCurrentUser = useAuthStore((state) => state.setCurrentUser);
  const toast = useToast();
  const [name, setName] = useState(currentUser?.name ?? '');
  const [bio, setBio] = useState(currentUser?.bio ?? '');
  const [locale, setLocale] = useState(currentUser?.locale ?? '');
  const [birthPlace, setBirthPlace] = useState(currentUser?.birth_place ?? '');
  const [saving, setSaving] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [profileSettings, setProfileSettings] = useState<ProfileSettings>({});

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
          message: 'Unable to load profile details.',
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
  }, [toast]);

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
      await updateProfileSettings(profileSettings);
      toast.push({
        message: 'Profile updated',
        tone: 'info',
        duration: 3000,
      });
      navigation.goBack();
    } catch (error) {
      console.error('ProfileEditScreen: update failed', error);
      toast.push({
        message: 'Could not update profile. Try again.',
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
    setCurrentUser,
    toast,
  ]);

  const renderChips = (
    options: string[],
    selected: string[] = [],
    onPress: (value: string) => void,
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
              {opt.replace(/_/g, ' ')}
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
              {opt.replace(/_/g, ' ')}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );

  if (loadingProfile) {
    return (
      <View style={styles.loading}>
        <Text style={styles.loadingText}>Loading profile…</Text>
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
              placeholder="Name"
              placeholderTextColor={theme.palette.silver}
              value={name}
              onChangeText={setName}
              style={styles.input}
            />
            <TextInput
              placeholder="Bio"
              placeholderTextColor={theme.palette.silver}
              value={bio}
              onChangeText={setBio}
              style={[styles.input, styles.multiline]}
              multiline
              numberOfLines={3}
            />
            <TextInput
              placeholder="Locale (e.g., en-US)"
              placeholderTextColor={theme.palette.silver}
              value={locale}
              onChangeText={setLocale}
              style={styles.input}
            />
            <TextInput
              placeholder="Birth place"
              placeholderTextColor={theme.palette.silver}
              value={birthPlace}
              onChangeText={setBirthPlace}
              style={styles.input}
            />
            <Text style={styles.label}>Gender</Text>
            {renderRadio(GENDERS, profileSettings.gender, (v) => setValue('gender', v))}

            <Text style={styles.label}>Orientation</Text>
            {renderRadio(ORIENTATIONS, profileSettings.orientation, (v) =>
              setValue('orientation', v),
            )}

            <Text style={styles.label}>Relationship goal</Text>
            {renderRadio(REL_GOALS, profileSettings.relationship_goal, (v) =>
              setValue('relationship_goal', v),
            )}

            <Text style={styles.label}>Attachment style</Text>
            {renderRadio(ATTACHMENTS, profileSettings.attachment_style, (v) =>
              setValue('attachment_style', v),
            )}

            <Text style={styles.label}>Values</Text>
            {renderChips(VALUES, profileSettings.values || [], (v) =>
              toggleListValue('values', v),
            )}

            <Text style={styles.label}>Preferred lifestyle</Text>
            {renderChips(LIFESTYLE, profileSettings.preferred_lifestyle || [], (v) =>
              toggleListValue('preferred_lifestyle', v),
            )}

            <Text style={styles.label}>Love language</Text>
            {renderChips(LOVE_LANG, profileSettings.love_language || [], (v) =>
              toggleListValue('love_language', v),
            )}
            <View style={styles.actions}>
              <MetalButton title="Cancel" onPress={() => navigation.goBack()} />
              <MetalButton
                title={saving ? 'Saving…' : 'Save'}
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

const styles = StyleSheet.create({
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
