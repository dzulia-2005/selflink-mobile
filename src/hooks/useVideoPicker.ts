import * as ImagePicker from 'expo-image-picker';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';

export type PickedVideo = {
  uri: string;
  name?: string;
  type?: string;
  duration?: number | null;
  width?: number | null;
  height?: number | null;
};

const defaultOptions: ImagePicker.ImagePickerOptions = {
  mediaTypes: ImagePicker.MediaTypeOptions.Videos,
  allowsEditing: false,
  quality: 0.8,
};

export function useVideoPicker(overrides?: Partial<ImagePicker.ImagePickerOptions>) {
  const [isPicking, setIsPicking] = useState(false);
  const optionsRef = useRef<Partial<ImagePicker.ImagePickerOptions> | undefined>(
    overrides,
  );

  useEffect(() => {
    optionsRef.current = overrides;
  }, [overrides]);

  const pickVideo = useCallback(async (): Promise<PickedVideo | null> => {
    if (isPicking) {
      return null;
    }
    setIsPicking(true);
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          'Permission needed',
          'Please allow photo library access to continue.',
        );
        return null;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        ...defaultOptions,
        ...(optionsRef.current ?? {}),
      });

      if (result.canceled || !result.assets?.length) {
        return null;
      }

      const asset = result.assets[0];
      if (!asset?.uri) {
        return null;
      }

      return {
        uri: asset.uri,
        name: asset.fileName ?? asset.assetId ?? 'upload.mp4',
        type: asset.mimeType ?? 'video/mp4',
        duration: asset.duration ?? null,
        width: asset.width ?? null,
        height: asset.height ?? null,
      };
    } catch (error) {
      console.warn('useVideoPicker: failed to pick video', error);
      Alert.alert('Unable to open videos', 'Please try again.');
      return null;
    } finally {
      setIsPicking(false);
    }
  }, [isPicking]);

  return { pickVideo, isPicking };
}
