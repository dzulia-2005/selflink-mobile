import { Ionicons } from '@expo/vector-icons';
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView,Text,TextInput, TouchableOpacity, View } from 'react-native';

import { MetalButton } from '@components/MetalButton';
import { MetalPanel } from '@components/MetalPanel';
import { useTheme } from '@theme';

import SelectSummary from './selectSummary';
import { createStyles } from '../styles/index.styles';
import { ContentProp } from '../types/index.type';




const Content:React.FC<ContentProp> = ({
    mode,handleSubmit,handleUseRegistrationData,
    handleClearCoordinate,handleOpenMap,hasSelectedCoordinate,
    isSubmitting,setMode,firstName,setFirstName,
    city,country,latitude,
    longitude,lastName,setLastName,
    setCountry,setTimeOfBirth,dateOfBirth,
    setCity,setDateOfBirth,timeOfBirth,isSubmitDisabled,
}) => {
    const { theme } = useTheme();
    const { t } = useTranslation();
    const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <ScrollView contentContainerStyle={styles.content}>
              <Text style={styles.headline}>{t('astro.birthData.title')}</Text>
              <Text style={styles.subtitle}>{t('astro.birthData.subtitle')}</Text>
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
                      accessibilityLabel={t('astro.birthData.accessibility.chooseOnMap')}
                    >
                      <Ionicons
                        name="location-outline"
                        size={18}
                        color={theme.palette.azure}
                      />
                      <Text style={styles.mapButtonLabel}>{t('astro.birthData.form.chooseOnMap')}</Text>
                    </TouchableOpacity>
                    {hasSelectedCoordinate ? (
                      <TouchableOpacity
                        style={styles.clearLink}
                        onPress={handleClearCoordinate}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        accessibilityLabel={t('astro.birthData.accessibility.clearLocation')}
                      >
                        <Text style={styles.clearLabel}>{t('astro.birthData.form.clear')}</Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                  {hasSelectedCoordinate ? (
                    <SelectSummary
                      city={city}
                      country={country}
                      latitude={latitude}
                      longitude={longitude}
                    />
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
                  <Text style={styles.hint}>{t('astro.birthData.form.hint')}</Text>
                </MetalPanel>
              ) : null}
            </ScrollView>
  );
};

export default Content;
