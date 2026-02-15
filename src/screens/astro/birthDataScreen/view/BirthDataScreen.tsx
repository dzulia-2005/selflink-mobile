import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useEffect, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BirthLocationMapModal } from '@components/astro/BirthLocationMapModal';
import { useToast } from '@context/ToastContext';
import { MentorStackParamList } from '@navigation/types';
import { BirthDataPayload } from '@schemas/astro';
import { createOrUpdateNatalChart } from '@services/api/astro';
import { useAuthStore } from '@store/authStore';
import { useTheme } from '@theme';
import React from 'react';
import { createStyles } from '../styles/index.styles';
import Content from '../components/content';

const BirthDataScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<MentorStackParamList, 'BirthData'>>();
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
        <Content
          mode={mode}
          handleSubmit={handleSubmit}
          handleUseRegistrationData={handleUseRegistrationData}
          handleClearCoordinate={handleClearCoordinate}
          handleOpenMap={handleOpenMap}
          hasSelectedCoordinate={hasSelectedCoordinate}
          isSubmitting={isSubmitting}
          setMode={setMode}
          firstName={firstName}
          setFirstName={setFirstName}
          city={city}
          country={country}
          latitude={latitude}
          longitude={longitude}
          setLastName={setLastName}
          lastName={lastName}
          setCountry={setCountry}
          setTimeOfBirth={setTimeOfBirth}
          dateOfBirth={dateOfBirth}
          setDateOfBirth={setDateOfBirth}
          timeOfBirth={timeOfBirth}
          setCity={setCity}
          isSubmitDisabled={isSubmitDisabled}
        />
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
};


export default BirthDataScreen;

