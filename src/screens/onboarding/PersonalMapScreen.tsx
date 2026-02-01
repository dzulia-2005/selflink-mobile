import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import type { OnboardingStackParamList, RootStackParamList } from '@navigation/types';
import { useAuthStore } from '@store/authStore';
import { useTheme, type Theme } from '@theme';

const initialFormState = {
  first_name: '',
  last_name: '',
  birth_date: '',
  birth_time: '',
  birth_place_country: '',
  birth_place_city: '',
};

type FormState = typeof initialFormState;

export function PersonalMapScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<OnboardingStackParamList, 'PersonalMap'>>();
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const personalMap = useAuthStore((state) => state.personalMap);
  const currentUser = useAuthStore((state) => state.currentUser);
  const savePersonalMap = useAuthStore((state) => state.savePersonalMap);
  const hasCompletedPersonalMap = useAuthStore((state) => state.hasCompletedPersonalMap);
  const setHasCompleted = useAuthStore.setState;
  const [form, setForm] = useState<FormState>(initialFormState);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const splitName = (name?: string | null) => {
      if (!name) {
        return { first: '', last: '' };
      }
      const parts = name.trim().split(/\s+/);
      return { first: parts[0] ?? '', last: parts.slice(1).join(' ') || '' };
    };

    const nameParts = personalMap
      ? { first: personalMap.first_name ?? '', last: personalMap.last_name ?? '' }
      : splitName(currentUser?.name);

    setForm((prev) => ({
      ...prev,
      first_name: nameParts.first,
      last_name: nameParts.last,
      birth_date: personalMap?.birth_date ?? prev.birth_date,
      birth_time: personalMap?.birth_time ?? prev.birth_time,
      birth_place_country: personalMap?.birth_place_country ?? prev.birth_place_country,
      birth_place_city: personalMap?.birth_place_city ?? prev.birth_place_city,
    }));
  }, [currentUser?.name, personalMap]);

  const isValid = useMemo(() => {
    return (
      form.first_name.trim().length > 0 &&
      form.last_name.trim().length > 0 &&
      form.birth_date.trim().length > 0 &&
      form.birth_time.trim().length > 0 &&
      form.birth_place_country.trim().length > 0 &&
      form.birth_place_city.trim().length > 0
    );
  }, [form]);

  const handleChange = (key: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const handleSubmit = async () => {
    if (!isValid) {
      Alert.alert('One more step', 'Please fill out all required fields.');
      return;
    }
    const nextErrors: typeof errors = {};
    const dateOk = /^\d{4}-\d{2}-\d{2}$/.test(form.birth_date);
    const timeOk = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(form.birth_time);
    if (!dateOk) {
      nextErrors.birth_date = 'Use YYYY-MM-DD format.';
    }
    if (!timeOk) {
      nextErrors.birth_time = 'Use 24h time, HH:MM or HH:MM:SS.';
    }
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }

    const normalizedTime =
      form.birth_time.length === 5 && timeOk ? `${form.birth_time}:00` : form.birth_time;

    setSubmitting(true);
    try {
      await savePersonalMap({
        ...form,
        birth_time: normalizedTime,
      });
      Alert.alert(
        'Profile updated',
        hasCompletedPersonalMap
          ? 'Birth information updated.'
          : 'Your personal map is complete.',
      );
      const rootNav =
        navigation.getParent<NativeStackNavigationProp<RootStackParamList>>() ??
        navigation;
      setHasCompleted({ hasCompletedPersonalMap: true });
      rootNav.navigate('Main');
    } catch (error) {
      console.warn('personal map save failed', error);
      Alert.alert('Error', 'We were unable to save your profile.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <LinearGradient colors={theme.gradients.appBackground} style={styles.gradient}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.card}>
          <LinearGradient colors={theme.gradients.matrix} style={styles.cardBadge} />
          <Text style={styles.title}>Personal Map</Text>
          <Text style={styles.subtitle}>
            Tell us more so we can align your astro-matrix intelligence.
          </Text>
          <Input
            label="First name"
            value={form.first_name}
            onChangeText={(text) => handleChange('first_name', text)}
            required
          />
          <Input
            label="Last name"
            value={form.last_name}
            onChangeText={(text) => handleChange('last_name', text)}
            required
          />
          <Input
            label="Birth date (YYYY-MM-DD)"
            value={form.birth_date}
            onChangeText={(text) => handleChange('birth_date', text)}
            required
            error={errors.birth_date}
          />
          <Input
            label="Birth time (HH:MM)"
            value={form.birth_time ?? ''}
            onChangeText={(text) => handleChange('birth_time', text)}
            required
            error={errors.birth_time}
          />
          <Input
            label="Birth country"
            value={form.birth_place_country}
            onChangeText={(text) => handleChange('birth_place_country', text)}
            required
          />
          <Input
            label="Birth city"
            value={form.birth_place_city}
            onChangeText={(text) => handleChange('birth_place_city', text)}
            required
          />
          <TouchableOpacity
            style={[styles.button, (!isValid || submitting) && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={!isValid || submitting}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={theme.gradients.cta}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.buttonGradient}
            >
              <Text style={styles.buttonLabel}>
                {submitting ? 'Saving…' : 'Save and continue'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

type InputProps = {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  required?: boolean;
  error?: string;
};

function Input({ label, value, onChangeText, required, error }: InputProps) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  return (
    <View style={styles.inputGroup}>
      <Text style={styles.inputLabel}>
        {label}
        {required ? <Text style={styles.required}> *</Text> : null}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={label}
        placeholderTextColor={theme.text.secondary}
        style={[styles.input, error ? styles.inputError : null]}
      />
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    gradient: { flex: 1 },
    container: {
      flexGrow: 1,
      padding: theme.spacing.xl,
    },
    card: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radii.lg,
      padding: theme.spacing.xl,
      gap: theme.spacing.lg,
      ...theme.shadows.card,
      position: 'relative',
      overflow: 'hidden',
    },
    cardBadge: {
      position: 'absolute',
      right: -40,
      top: -40,
      width: 140,
      height: 140,
      opacity: 0.2,
      borderRadius: 80,
    },
    title: {
      color: theme.text.primary,
      ...theme.typography.headingL,
    },
    subtitle: {
      color: theme.text.secondary,
      ...theme.typography.body,
    },
    inputGroup: {
      gap: theme.spacing.xs,
    },
    inputLabel: {
      color: theme.text.secondary,
      ...theme.typography.caption,
    },
    required: {
      color: theme.colors.error,
    },
    input: {
      backgroundColor: theme.colors.surfaceAlt,
      borderRadius: theme.radii.md,
      padding: theme.spacing.lg,
      color: theme.text.primary,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    inputError: {
      borderColor: theme.colors.error,
    },
    errorText: {
      color: theme.colors.error,
      ...theme.typography.caption,
    },
    button: {
      borderRadius: theme.radii.lg,
      ...theme.shadows.button,
    },
    buttonGradient: {
      borderRadius: theme.radii.lg,
      paddingVertical: theme.spacing.md,
      alignItems: 'center',
    },
    buttonDisabled: {
      opacity: 0.6,
    },
    buttonLabel: {
      color: theme.text.primary,
      ...theme.typography.button,
    },
  });
