import { Ionicons } from '@expo/vector-icons';
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
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BirthLocationMapModal } from '@components/astro/BirthLocationMapModal';
import { MetalButton } from '@components/MetalButton';
import { MetalPanel } from '@components/MetalPanel';
import { useToast } from '@context/ToastContext';
import { MentorStackParamList } from '@navigation/types';
import { BirthDataPayload } from '@schemas/astro';
import { createOrUpdateNatalChart } from '@services/api/astro';
import { useAuthStore } from '@store/authStore';
import { useTheme, type Theme } from '@theme';

export function BirthDataScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<MentorStackParamList, 'BirthData'>>();
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const toast = useToast();
  const personalMap = useAuthStore((state) => state.personalMap);
  const currentUser = useAuthStore((state) => state.currentUser);
  const fetchProfile = useAuthStore((state) => state.fetchProfile);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [timeOfBirth, setTimeOfBirth] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [mapVisible, setMapVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mode, setMode] = useState<'choice' | 'form'>('choice');

  useEffect(() => {
    const loadProfile = async () => {
      if (!personalMap) {
        try {
          await fetchProfile();
        } catch (error) {
          console.warn('BirthDataScreen: failed to refresh profile', error);
        }
      }
    };
    loadProfile().catch(() => undefined);
  }, [fetchProfile, personalMap]);

  useEffect(() => {
    const splitBirthPlace = (birthPlace?: string | null) => {
      if (!birthPlace) {
        return { city: '', country: '' };
      }
      const parts = birthPlace
        .split(',')
        .map((part) => part.trim())
        .filter(Boolean);
      return {
        city: parts[0] ?? '',
        country: parts[1] ?? '',
      };
    };

    const resolvedCity =
      personalMap?.birth_place_city ?? splitBirthPlace(currentUser?.birth_place).city;
    const resolvedCountry =
      personalMap?.birth_place_country ??
      splitBirthPlace(currentUser?.birth_place).country;
    const resolvedDate = personalMap?.birth_date || currentUser?.birth_date || '';
    const resolvedTime = personalMap?.birth_time || currentUser?.birth_time || '';
    const resolvedLatitude =
      typeof personalMap?.birth_latitude === 'number' ? personalMap.birth_latitude : null;
    const resolvedLongitude =
      typeof personalMap?.birth_longitude === 'number'
        ? personalMap.birth_longitude
        : null;

    setFirstName(personalMap?.first_name || '');
    setLastName(personalMap?.last_name || '');
    setCity(resolvedCity || '');
    setCountry(resolvedCountry || '');
    setDateOfBirth(resolvedDate || '');
    setTimeOfBirth(resolvedTime ? resolvedTime.slice(0, 5) : '');
    setLatitude(resolvedLatitude);
    setLongitude(resolvedLongitude);
  }, [
    currentUser?.birth_date,
    currentUser?.birth_place,
    currentUser?.birth_time,
    personalMap,
  ]);

  const hasStoredBirth = useMemo(() => {
    return Boolean(dateOfBirth && timeOfBirth && city && country);
  }, [city, country, dateOfBirth, timeOfBirth]);

  useEffect(() => {
    if (!hasStoredBirth) {
      setMode('form');
    }
  }, [hasStoredBirth]);

  const isSubmitDisabled = useMemo(() => {
    return !dateOfBirth || !timeOfBirth || !city || !country || isSubmitting;
  }, [city, country, dateOfBirth, isSubmitting, timeOfBirth]);

  const hasSelectedCoordinate = useMemo(
    () => latitude !== null && longitude !== null,
    [latitude, longitude],
  );

  const handleOpenMap = () => {
    setMapVisible(true);
  };

  const handleConfirmMap = () => {
    toast.push({ message: 'Birth location saved.', tone: 'info', duration: 2000 });
    setMapVisible(false);
  };

  const handleClearCoordinate = () => {
    setLatitude(null);
    setLongitude(null);
  };

  const handleUseRegistrationData = async () => {
    setIsSubmitting(true);
    const payload: BirthDataPayload = { source: 'profile' };
    try {
      await createOrUpdateNatalChart(payload);
      toast.push({
        message: 'Using your saved birth data. Generating your chart…',
        tone: 'info',
      });
      navigation.navigate('NatalChart');
    } catch (error) {
      console.error('Birth data submission failed (profile source)', error);
      toast.push({
        message:
          error instanceof Error &&
          error.message.includes('No birth data stored in profile')
            ? 'We need your birth details. Please fill them in.'
            : 'Unable to use your saved birth data. Please review your details.',
        tone: 'error',
        duration: 6000,
      });
      setMode('form');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async () => {
    if (isSubmitDisabled) {
      return;
    }

    const latToSend = latitude;
    const lonToSend = longitude;
    if (latToSend !== null && (latToSend < -90 || latToSend > 90)) {
      toast.push({
        message: 'Latitude must be between -90 and 90 degrees.',
        tone: 'error',
      });
      return;
    }
    if (lonToSend !== null && (lonToSend < -180 || lonToSend > 180)) {
      toast.push({
        message: 'Longitude must be between -180 and 180 degrees.',
        tone: 'error',
      });
      return;
    }

    const payload: BirthDataPayload = {
      source: 'form',
      birth_date: dateOfBirth,
      birth_time: timeOfBirth,
      city,
      country,
      first_name: firstName || undefined,
      last_name: lastName || undefined,
      latitude: latToSend ?? undefined,
      longitude: lonToSend ?? undefined,
    };

    setIsSubmitting(true);
    try {
      await createOrUpdateNatalChart(payload);
      toast.push({ message: 'Birth data saved. Generating your chart…', tone: 'info' });
      navigation.navigate('NatalChart');
    } catch (error) {
      console.error('Birth data submission failed', error);
      toast.push({
        message:
          'Unable to save birth data. Please confirm the date, time, city, and country.',
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
            Precise birth details help us compute your Ascendant and houses. You can use
            the info you shared at registration or correct it here.
          </Text>

          {mode === 'choice' ? (
            <MetalPanel glow>
              <Text style={styles.panelTitle}>Use saved details?</Text>
              <Text style={styles.bodyText}>
                We can use the birth info from your registration, or you can correct it
                now.
              </Text>
              <MetalButton
                title={
                  isSubmitting ? 'Using registration data…' : 'Use registration data'
                }
                onPress={handleUseRegistrationData}
                disabled={isSubmitting}
              />
              <MetalButton title="Edit / correct data" onPress={() => setMode('form')} />
            </MetalPanel>
          ) : null}

          {mode === 'form' ? (
            <MetalPanel glow>
              <Text style={styles.panelTitle}>Required</Text>
              <TextInput
                placeholder="First name"
                placeholderTextColor={theme.palette.silver}
                value={firstName}
                onChangeText={setFirstName}
                style={styles.input}
              />
              <TextInput
                placeholder="Last name"
                placeholderTextColor={theme.palette.silver}
                value={lastName}
                onChangeText={setLastName}
                style={styles.input}
              />
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

              <View style={styles.mapCtaRow}>
                <TouchableOpacity
                  onPress={handleOpenMap}
                  style={styles.mapButton}
                  activeOpacity={0.9}
                >
                  <Ionicons
                    name="location-outline"
                    size={18}
                    color={theme.palette.azure}
                  />
                  <Text style={styles.mapButtonLabel}>Choose on Map</Text>
                </TouchableOpacity>
                {hasSelectedCoordinate ? (
                  <TouchableOpacity
                    style={styles.clearLink}
                    onPress={handleClearCoordinate}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Text style={styles.clearLabel}>Clear</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
              {hasSelectedCoordinate ? (
                <View style={styles.selectedSummary}>
                  <Ionicons
                    name="pin"
                    size={14}
                    color={theme.palette.azure}
                    style={styles.selectedIcon}
                  />
                  <Text style={styles.selectedSummaryText}>
                    Selected on map:{' '}
                    {city && country
                      ? `near ${city}, ${country}`
                      : `${latitude?.toFixed(4)}, ${longitude?.toFixed(4)}`}
                  </Text>
                </View>
              ) : null}

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
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
      <BirthLocationMapModal
        visible={mapVisible}
        initialLatitude={latitude}
        initialLongitude={longitude}
        city={city}
        country={country}
        onCancel={() => setMapVisible(false)}
        onConfirm={(coord) => {
          setLatitude(coord.latitude);
          setLongitude(coord.longitude);
          handleConfirmMap();
        }}
      />
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
    bodyText: {
      color: theme.palette.silver,
      ...theme.typography.body,
      marginBottom: theme.spacing.md,
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
    mapCtaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
      marginTop: theme.spacing.xs,
    },
    mapButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.xs,
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
      borderRadius: theme.radii.md,
      borderWidth: 1,
      borderColor: theme.palette.azure,
      backgroundColor: 'rgba(37, 99, 235, 0.08)',
    },
    mapButtonLabel: {
      color: theme.palette.azure,
      ...theme.typography.button,
    },
    clearLink: {
      marginLeft: 'auto',
    },
    clearLabel: {
      color: theme.palette.rose,
      ...theme.typography.caption,
      fontWeight: '700',
    },
    selectedSummary: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.xs,
      marginTop: theme.spacing.xs,
    },
    selectedSummaryText: {
      color: theme.palette.silver,
      ...theme.typography.caption,
    },
    selectedIcon: {
      marginTop: 1,
    },
  });
