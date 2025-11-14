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

import { useAuthStore } from '@store/authStore';
import { theme } from '@theme';

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
  const personalMap = useAuthStore((state) => state.personalMap);
  const savePersonalMap = useAuthStore((state) => state.savePersonalMap);
  const [form, setForm] = useState<FormState>(initialFormState);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (personalMap) {
      setForm({
        first_name: personalMap.first_name ?? '',
        last_name: personalMap.last_name ?? '',
        birth_date: personalMap.birth_date ?? '',
        birth_time: personalMap.birth_time ?? '',
        birth_place_country: personalMap.birth_place_country ?? '',
        birth_place_city: personalMap.birth_place_city ?? '',
      });
    }
  }, [personalMap]);

  const isValid = useMemo(() => {
    return (
      form.first_name.trim().length > 0 &&
      form.last_name.trim().length > 0 &&
      form.birth_date.trim().length > 0 &&
      form.birth_place_country.trim().length > 0 &&
      form.birth_place_city.trim().length > 0
    );
  }, [form]);

  const handleChange = (key: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async () => {
    if (!isValid) {
      Alert.alert('One more step', 'Please fill out all required fields.');
      return;
    }
    setSubmitting(true);
    try {
      await savePersonalMap({
        ...form,
        birth_time: form.birth_time.trim() ? form.birth_time : null,
      });
      Alert.alert('Profile updated', 'Your personal map is complete.');
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
          />
          <Input
            label="Birth time (HH:MM)"
            value={form.birth_time ?? ''}
            onChangeText={(text) => handleChange('birth_time', text)}
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
};

function Input({ label, value, onChangeText, required }: InputProps) {
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
        placeholderTextColor="#64748B"
        style={styles.input}
      />
    </View>
  );
}

const styles = StyleSheet.create({
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
