import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useEffect, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MetalButton } from '@components/MetalButton';
import { MetalPanel } from '@components/MetalPanel';
import { useToast } from '@context/ToastContext';
import { MentorStackParamList } from '@navigation/types';
import { createOrUpdateNatalChart } from '@services/api/astro';
import { BirthDataPayload } from '@schemas/astro';
import { theme } from '@theme/index';

const TIMEZONE_FALLBACK = 'UTC';

export function BirthDataScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<MentorStackParamList, 'BirthData'>>();
  const toast = useToast();
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [timeOfBirth, setTimeOfBirth] = useState('');
  const [timezone, setTimezone] = useState(TIMEZONE_FALLBACK);
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (tz) {
        setTimezone(tz);
      }
    } catch (error) {
      console.warn('BirthDataScreen: failed to resolve timezone', error);
      setTimezone(TIMEZONE_FALLBACK);
    }
  }, []);

  const isSubmitDisabled = useMemo(() => {
    return !dateOfBirth || !timeOfBirth || !timezone || isSubmitting;
  }, [dateOfBirth, timeOfBirth, timezone, isSubmitting]);

  const handleSubmit = async () => {
    if (isSubmitDisabled) {
      return;
    }

    const payload: BirthDataPayload = {
      date_of_birth: dateOfBirth,
      time_of_birth: timeOfBirth,
      timezone,
      city: city || undefined,
      country: country || undefined,
      latitude: latitude ? Number(latitude) : undefined,
      longitude: longitude ? Number(longitude) : undefined,
    };

    setIsSubmitting(true);
    try {
      await createOrUpdateNatalChart(payload);
      toast.push({ message: 'Birth data saved. Generating your chart…', tone: 'success' });
      navigation.navigate('NatalChart');
    } catch (error) {
      console.error('Birth data submission failed', error);
      toast.push({
        message: 'Unable to save birth data. Please check the fields and try again.',
        tone: 'error',
        duration: 6000,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.headline}>Birth Data</Text>
          <Text style={styles.subtitle}>
            Precise birth details help us compute your Ascendant and houses. Exact time and
            timezone improve accuracy.
          </Text>

          <MetalPanel glow>
            <Text style={styles.panelTitle}>Required</Text>
            <TextInput
              placeholder="Date of birth (YYYY-MM-DD)"
              placeholderTextColor={theme.palette.silver}
              value={dateOfBirth}
              onChangeText={setDateOfBirth}
              style={styles.input}
            />
            <TextInput
              placeholder="Time of birth (HH:MM, 24h)"
              placeholderTextColor={theme.palette.silver}
              value={timeOfBirth}
              onChangeText={setTimeOfBirth}
              style={styles.input}
            />
            <TextInput
              placeholder="Timezone (e.g., America/New_York)"
              placeholderTextColor={theme.palette.silver}
              value={timezone}
              onChangeText={setTimezone}
              style={styles.input}
            />

            <Text style={styles.panelTitle}>Location</Text>
            <TextInput
              placeholder="City"
              placeholderTextColor={theme.palette.silver}
              value={city}
              onChangeText={setCity}
              style={styles.input}
            />
            <TextInput
              placeholder="Country"
              placeholderTextColor={theme.palette.silver}
              value={country}
              onChangeText={setCountry}
              style={styles.input}
            />
            <TextInput
              placeholder="Latitude (optional)"
              placeholderTextColor={theme.palette.silver}
              value={latitude}
              onChangeText={setLatitude}
              keyboardType="decimal-pad"
              style={styles.input}
            />
            <TextInput
              placeholder="Longitude (optional)"
              placeholderTextColor={theme.palette.silver}
              value={longitude}
              onChangeText={setLongitude}
              keyboardType="decimal-pad"
              style={styles.input}
            />

            <MetalButton
              title={isSubmitting ? 'Submitting…' : 'Save & Generate Chart'}
              onPress={handleSubmit}
              disabled={isSubmitDisabled}
            />
            <Text style={styles.hint}>
              Tip: if you are unsure of the exact time, use your best estimate. You can
              update later.
            </Text>
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
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.lg,
    gap: theme.spacing.lg,
  },
  headline: {
    color: theme.palette.platinum,
    ...theme.typography.headingL,
  },
  subtitle: {
    color: theme.palette.silver,
    ...theme.typography.body,
  },
  panelTitle: {
    color: theme.palette.titanium,
    ...theme.typography.subtitle,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  input: {
    borderRadius: theme.radii.md,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: theme.palette.pearl,
    color: theme.palette.titanium,
    marginBottom: theme.spacing.sm,
  },
  hint: {
    color: theme.palette.silver,
    ...theme.typography.caption,
    marginTop: theme.spacing.sm,
  },
});
