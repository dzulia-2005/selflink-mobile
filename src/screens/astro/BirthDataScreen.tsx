import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
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
    toast.push({
      message: t('astro.birthData.toasts.locationSaved'),
      tone: 'info',
      duration: 2000,
    });
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
        message: t('astro.birthData.toasts.usingSavedData'),
        tone: 'info',
      });
      navigation.navigate('NatalChart');
    } catch (error) {
      console.error('Birth data submission failed (profile source)', error);
      toast.push({
        message:
          error instanceof Error &&
          error.message.includes('No birth data stored in profile')
            ? t('astro.birthData.toasts.needBirthDetails')
            : t('astro.birthData.toasts.unableToUseSavedData'),
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
        message: t('astro.birthData.validation.latitudeRange'),
        tone: 'error',
      });
      return;
    }
    if (lonToSend !== null && (lonToSend < -180 || lonToSend > 180)) {
      toast.push({
        message: t('astro.birthData.validation.longitudeRange'),
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
      toast.push({ message: t('astro.birthData.toasts.savedAndGenerating'), tone: 'info' });
      navigation.navigate('NatalChart');
    } catch (error) {
      console.error('Birth data submission failed', error);
      toast.push({
        message: t('astro.birthData.toasts.unableToSave'),
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
          <Text style={styles.headline}>{t('astro.birthData.title')}</Text>
          <Text style={styles.subtitle}>
            {t('astro.birthData.subtitle')}
          </Text>

          {mode === 'choice' ? (
            <MetalPanel glow>
              <Text style={styles.panelTitle}>{t('astro.birthData.choice.title')}</Text>
              <Text style={styles.bodyText}>{t('astro.birthData.choice.body')}</Text>
              <MetalButton
                title={
                  isSubmitting
                    ? t('astro.birthData.choice.usingRegistration')
                    : t('astro.birthData.choice.useRegistration')
                }
                onPress={handleUseRegistrationData}
                disabled={isSubmitting}
              />
              <MetalButton
                title={t('astro.birthData.choice.editData')}
                onPress={() => setMode('form')}
              />
            </MetalPanel>
          ) : null}

          {mode === 'form' ? (
            <MetalPanel glow>
              <Text style={styles.panelTitle}>{t('astro.birthData.form.required')}</Text>
              <TextInput
                placeholder={t('astro.birthData.form.firstNamePlaceholder')}
                placeholderTextColor={theme.palette.silver}
                value={firstName}
                onChangeText={setFirstName}
                style={styles.input}
                accessibilityLabel={t('astro.birthData.accessibility.firstNameInput')}
              />
              <TextInput
                placeholder={t('astro.birthData.form.lastNamePlaceholder')}
                placeholderTextColor={theme.palette.silver}
                value={lastName}
                onChangeText={setLastName}
                style={styles.input}
                accessibilityLabel={t('astro.birthData.accessibility.lastNameInput')}
              />
              <TextInput
                placeholder={t('astro.birthData.form.datePlaceholder')}
                placeholderTextColor={theme.palette.silver}
                value={dateOfBirth}
                onChangeText={setDateOfBirth}
                style={styles.input}
                accessibilityLabel={t('astro.birthData.accessibility.dateInput')}
              />
              <TextInput
                placeholder={t('astro.birthData.form.timePlaceholder')}
                placeholderTextColor={theme.palette.silver}
                value={timeOfBirth}
                onChangeText={setTimeOfBirth}
                style={styles.input}
                accessibilityLabel={t('astro.birthData.accessibility.timeInput')}
              />

              <Text style={styles.panelTitle}>{t('astro.birthData.form.location')}</Text>
              <TextInput
                placeholder={t('astro.birthData.form.cityPlaceholder')}
                placeholderTextColor={theme.palette.silver}
                value={city}
                onChangeText={setCity}
                style={styles.input}
                accessibilityLabel={t('astro.birthData.accessibility.cityInput')}
              />
              <TextInput
                placeholder={t('astro.birthData.form.countryPlaceholder')}
                placeholderTextColor={theme.palette.silver}
                value={country}
                onChangeText={setCountry}
                style={styles.input}
                accessibilityLabel={t('astro.birthData.accessibility.countryInput')}
              />

              <View style={styles.mapCtaRow}>
                <TouchableOpacity
                  onPress={handleOpenMap}
                  style={styles.mapButton}
                  activeOpacity={0.9}
                  accessibilityRole="button"
                  accessibilityLabel={t('astro.birthData.accessibility.chooseOnMap')}
                >
                  <Ionicons
                    name="location-outline"
                    size={18}
                    color={theme.palette.azure}
                  />
                  <Text style={styles.mapButtonLabel}>
                    {t('astro.birthData.form.chooseOnMap')}
                  </Text>
                </TouchableOpacity>
                {hasSelectedCoordinate ? (
                  <TouchableOpacity
                    style={styles.clearLink}
                    onPress={handleClearCoordinate}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    accessibilityRole="button"
                    accessibilityLabel={t('astro.birthData.accessibility.clearLocation')}
                  >
                    <Text style={styles.clearLabel}>{t('astro.birthData.form.clear')}</Text>
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
                    {t('astro.birthData.form.selectedOnMap')}{' '}
                    {city && country
                      ? t('astro.birthData.form.nearLocation', { city, country })
                      : `${latitude?.toFixed(4)}, ${longitude?.toFixed(4)}`}
                  </Text>
                </View>
              ) : null}

              <MetalButton
                title={
                  isSubmitting
                    ? t('astro.birthData.form.submitting')
                    : t('astro.birthData.form.saveAndGenerate')
                }
                onPress={handleSubmit}
                disabled={isSubmitDisabled}
              />
              <Text style={styles.hint}>
                {t('astro.birthData.form.hint')}
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
