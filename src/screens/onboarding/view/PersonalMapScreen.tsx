import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import {
  Alert,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { OnboardingStackParamList, RootStackParamList } from '@navigation/types';
import { useAuthStore } from '@store/authStore';
import { useTheme } from '@theme';

import { initialFormState } from '../components/initialFormState';
import Input from '../components/input';
import { personalMapSchema } from '../components/schema';
import { createStyles } from '../styles/index.styles';
import { initialFormStateTypes } from '../types/index.type';


const PersonalMapScreen = () => {
  const { t } = useTranslation();
  const navigation =
    useNavigation<NativeStackNavigationProp<OnboardingStackParamList, 'PersonalMap'>>();
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const savePersonalMap = useAuthStore((state) => state.savePersonalMap);
  const hasCompletedPersonalMap = useAuthStore((state) => state.hasCompletedPersonalMap);
  const setHasCompleted = useAuthStore.setState;
  const [submitting, setSubmitting] = useState(false);

  const {handleSubmit,control,formState:{errors,isValid}} = useForm<initialFormStateTypes>({
    defaultValues:initialFormState,
    resolver:zodResolver(personalMapSchema),
    mode:'onChange',
  });


  const handleSubmitClick = async (payload:initialFormStateTypes) => {
    setSubmitting(true);
    try {
      await savePersonalMap(payload);
      Alert.alert(
        t('onboarding.alerts.profileUpdated.title'),
        hasCompletedPersonalMap
          ? t('onboarding.alerts.profileUpdated.birthUpdated')
          : t('onboarding.alerts.profileUpdated.completed'),
      );
      const rootNav =
        navigation.getParent<NativeStackNavigationProp<RootStackParamList>>() ??
        navigation;
      setHasCompleted({ hasCompletedPersonalMap: true });
      rootNav.navigate('Main');
    } catch (error) {
      console.warn('personal map save failed', error);
      Alert.alert(t('common.error.title'), t('onboarding.alerts.saveFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <LinearGradient colors={theme.gradients.appBackground} style={styles.gradient}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.card}>
          <LinearGradient colors={theme.gradients.matrix} style={styles.cardBadge} />
          <Text style={styles.title}>{t('onboarding.personalMap.title')}</Text>
          <Text style={styles.subtitle}>{t('onboarding.personalMap.subtitle')}</Text>
          <Controller
            name="first_name"
            control={control}
            render={({field:{onChange,value}})=>(
              <Input
                label={t('onboarding.personalMap.firstName')}
                value={value}
                onChangeText={onChange}
                required
                error={errors.first_name?.message}
              />
            )}
          />
          <Controller
            name="last_name"
            control={control}
            render={({field:{onChange,value}})=>(
              <Input
                label={t('onboarding.personalMap.lastName')}
                value={value}
                onChangeText={onChange}
                required
                error={errors.last_name?.message}
              />
            )}
          />
          <Controller
            name="birth_date"
            control={control}
            render={({field:{onChange,value}})=>(
              <Input
                label={t('onboarding.personalMap.birthDate')}
                value={value}
                onChangeText={onChange}
                required
                error={errors.birth_date?.message}
              />
            )}
          />
          <Controller
            name="birth_time"
            control={control}
            render={({field:{onChange,value}})=>(
              <Input
                label={t('onboarding.personalMap.birthTime')}
                value={value}
                onChangeText={onChange}
                required
                error={errors.birth_time?.message}
              />
            )}
          />
          <Controller
            name="birth_place_country"
            control={control}
            render={({field:{onChange,value}})=>(
              <Input
                label={t('onboarding.personalMap.birthCountry')}
                value={value}
                onChangeText={onChange}
                required
                error={errors.birth_place_country?.message}
              />
            )}
          />
          <Controller
            name="birth_place_city"
            control={control}
            render={({field:{onChange,value}})=>(
              <Input
                label={t('onboarding.personalMap.birthCity')}
                value={value}
                onChangeText={onChange}
                required
                error={errors.birth_place_city?.message}
              />
            )}
          />
          <TouchableOpacity
            style={[styles.button, (!isValid || submitting) && styles.buttonDisabled]}
            onPress={handleSubmit(handleSubmitClick)}
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
                {submitting
                  ? t('onboarding.personalMap.actions.saving')
                  : t('onboarding.personalMap.actions.saveAndContinue')}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </LinearGradient>
  );
};

export default PersonalMapScreen;
