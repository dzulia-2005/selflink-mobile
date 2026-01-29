import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import MapView, { MapPressEvent, Marker, Region } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MetalButton } from '@components/MetalButton';
import { env } from '@config/env';
import { useTheme, type Theme } from '@theme';

type Coordinate = { latitude: number; longitude: number };

type Props = {
  visible: boolean;
  initialLatitude: number | null;
  initialLongitude: number | null;
  city?: string;
  country?: string;
  onConfirm: (coord: Coordinate) => void;
  onCancel: () => void;
};

export function BirthLocationMapModal({
  visible,
  initialLatitude,
  initialLongitude,
  city,
  country,
  onConfirm,
  onCancel,
}: Props) {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [markerCoord, setMarkerCoord] = useState<Coordinate | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const bounce = useRef(new Animated.Value(1)).current;
  const mapsDisabled = Platform.OS === 'android' && !env.googleMapsApiKey && !__DEV__;
  const showLoader = !mapReady && !mapError && !mapsDisabled;

  useEffect(() => {
    if (visible) {
      if (initialLatitude !== null && initialLongitude !== null) {
        setMarkerCoord({ latitude: initialLatitude, longitude: initialLongitude });
      } else {
        setMarkerCoord(null);
      }
      setMapError(null);
    }
  }, [initialLatitude, initialLongitude, visible]);

  useEffect(() => {
    if (!visible) {
      return;
    }
    if (mapsDisabled) {
      console.error(
        'BirthLocationMapModal: Google Maps API key missing for Android build.',
      );
      setMapError('Map unavailable in this build. Missing Google Maps API key.');
    }
  }, [mapsDisabled, visible]);

  useEffect(() => {
    if (!markerCoord) {
      return;
    }
    Animated.sequence([
      Animated.timing(bounce, {
        toValue: 1.08,
        duration: 120,
        useNativeDriver: true,
      }),
      Animated.spring(bounce, {
        toValue: 1,
        tension: 120,
        friction: 6,
        useNativeDriver: true,
      }),
    ]).start();
  }, [bounce, markerCoord]);

  const initialRegion: Region = useMemo(() => {
    const hasInitial = initialLatitude !== null && initialLongitude !== null;
    const lat = hasInitial ? initialLatitude! : 0;
    const lon = hasInitial ? initialLongitude! : 0;
    return {
      latitude: lat,
      longitude: lon,
      latitudeDelta: hasInitial ? 4 : 60,
      longitudeDelta: hasInitial ? 4 : 60,
    };
  }, [initialLatitude, initialLongitude]);

  const handleMapPress = (event: MapPressEvent) => {
    const { latitude, longitude } = event.nativeEvent.coordinate;
    setMarkerCoord({ latitude, longitude });
  };

  const locationLabel = useMemo(() => {
    if (markerCoord) {
      return city && country
        ? `Near ${city}, ${country}`
        : `Lat ${markerCoord.latitude.toFixed(4)}, Lon ${markerCoord.longitude.toFixed(4)}`;
    }
    return 'Tap on the map to choose a location.';
  }, [city, country, markerCoord]);

  const handleMapRetry = () => {
    if (mapsDisabled) {
      onCancel();
      return;
    }
    setMapError(null);
  };

  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.header}>
            <TouchableOpacity
              onPress={onCancel}
              style={styles.iconButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="chevron-back" size={22} color={theme.palette.platinum} />
            </TouchableOpacity>
            <Text style={styles.title}>Select Birth Location</Text>
            <View style={styles.iconPlaceholder} />
          </View>

          <Text style={styles.instructions}>
            Drag the map or tap to place the pin at your exact birth place.
          </Text>

          <View style={styles.mapCard}>
            {showLoader ? (
              <View style={styles.mapLoader}>
                <ActivityIndicator color={theme.palette.platinum} />
                <Text style={styles.loaderText}>Loading map…</Text>
              </View>
            ) : null}
            {mapError || mapsDisabled ? (
              <View style={styles.mapLoader}>
                <Text style={styles.errorText}>
                  {mapError ??
                    'Map unavailable in this build. Missing Google Maps API key.'}
                </Text>
                <MetalButton
                  title={mapsDisabled ? 'Close' : 'Try Again'}
                  onPress={handleMapRetry}
                />
              </View>
            ) : (
              <MapView
                style={styles.map}
                key={`${initialRegion.latitude}-${initialRegion.longitude}-${initialRegion.latitudeDelta}`}
                initialRegion={initialRegion}
                onPress={handleMapPress}
                showsCompass={false}
                showsUserLocation={false}
                onMapReady={() => setMapReady(true)}
              >
                {markerCoord ? (
                  <Marker coordinate={markerCoord}>
                    <Animated.View
                      style={[styles.markerBounce, { transform: [{ scale: bounce }] }]}
                    >
                      <Ionicons name="pin" size={32} color={theme.palette.azure} />
                    </Animated.View>
                  </Marker>
                ) : null}
              </MapView>
            )}
          </View>

          <View style={styles.summaryCard}>
            <Ionicons name="location" size={16} color={theme.palette.azure} />
            <View style={styles.summaryContent}>
              <Text style={styles.summaryTitle}>Location selected</Text>
              <Text style={styles.summaryText}>{locationLabel}</Text>
              {markerCoord ? (
                <Text style={styles.summaryCoords}>
                  Lat {markerCoord.latitude.toFixed(4)}, Lon{' '}
                  {markerCoord.longitude.toFixed(4)}
                </Text>
              ) : null}
            </View>
          </View>

          <View style={styles.footer}>
            <LinearGradient
              colors={theme.gradients.cta}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.primaryButton, !markerCoord && styles.primaryButtonDisabled]}
            >
              <TouchableOpacity
                style={styles.primaryButtonContent}
                onPress={() => markerCoord && onConfirm(markerCoord)}
                disabled={!markerCoord}
                activeOpacity={0.9}
              >
                <Text style={styles.primaryLabel}>Use This Location</Text>
              </TouchableOpacity>
            </LinearGradient>
            <TouchableOpacity onPress={onCancel} style={styles.cancelButton}>
              <Text style={styles.cancelLabel}>Cancel</Text>
            </TouchableOpacity>
            {!markerCoord ? (
              <Text style={styles.helperText}>Tap on the map to choose a location.</Text>
            ) : null}
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
  },
  modalContainer: {
    flex: 1,
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.lg,
    backgroundColor: 'rgba(5, 8, 18, 0.92)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  title: {
    color: theme.palette.platinum,
    ...theme.typography.subtitle,
  },
  iconButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
  },
  iconPlaceholder: {
    width: 44,
    height: 44,
  },
  instructions: {
    color: theme.palette.silver,
    ...theme.typography.caption,
    marginBottom: theme.spacing.sm,
  },
  mapCard: {
    borderRadius: theme.radii.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(37, 211, 211, 0.35)',
    backgroundColor: '#0F0A14',
    minHeight: 320,
    marginBottom: theme.spacing.md,
  },
  map: {
    flex: 1,
  },
  mapLoader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  loaderText: {
    color: theme.palette.silver,
    ...theme.typography.caption,
  },
  errorText: {
    color: theme.palette.rose,
    textAlign: 'center',
    ...theme.typography.body,
  },
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: theme.spacing.sm,
    padding: theme.spacing.md,
    borderRadius: theme.radii.lg,
    borderWidth: 1,
    borderColor: 'rgba(37, 211, 211, 0.35)',
    backgroundColor: '#0F0A14',
  },
  summaryTitle: {
    color: theme.palette.platinum,
    ...theme.typography.caption,
    fontWeight: '700',
  },
  summaryText: {
    color: theme.palette.silver,
    ...theme.typography.body,
  },
  summaryCoords: {
    color: theme.palette.titanium,
    ...theme.typography.caption,
  },
  summaryContent: {
    flex: 1,
  },
  footer: {
    marginTop: theme.spacing.md,
    gap: theme.spacing.xs,
  },
  primaryButton: {
    borderRadius: theme.radii.lg,
  },
  primaryButtonDisabled: {
    opacity: 0.5,
  },
  primaryButtonContent: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: theme.spacing.md,
  },
  primaryLabel: {
    color: theme.text.primary,
    ...theme.typography.button,
  },
  cancelButton: {
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
  },
  cancelLabel: {
    color: theme.palette.silver,
    ...theme.typography.caption,
  },
  helperText: {
    color: theme.palette.silver,
    ...theme.typography.caption,
    textAlign: 'center',
  },
  markerBounce: {},
  });
