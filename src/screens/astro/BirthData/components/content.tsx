import React, { useMemo } from 'react'
import { ScrollView,Text,TextInput, TouchableOpacity, View } from 'react-native'
import { MetalPanel } from '@components/MetalPanel';
import { createStyles } from '../styles/index.styles';
import { useTheme } from '@theme';
import { MetalButton } from '@components/MetalButton';
import { Ionicons } from '@expo/vector-icons';
import SelectSummary from './selectSummary';
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
    const styles = useMemo(() => createStyles(theme), [theme]);

  return (
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
                    <SelectSummary
                      city={city}
                      country={country}
                      latitude={latitude}
                      longitude={longitude}
                    />
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
  );
};

export default Content;