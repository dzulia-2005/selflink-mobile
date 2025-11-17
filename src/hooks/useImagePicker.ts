import * as ImagePicker from 'expo-image-picker';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';

export type PickedImage = {
  uri: string;
  name?: string;
  type?: string;
};

const defaultOptions: ImagePicker.ImagePickerOptions = {
  mediaTypes: ImagePicker.MediaTypeOptions.Images,
  allowsEditing: false,
  quality: 0.9,
};

/**
 * General-purpose helper to request permissions and launch the system picker.
 * Reuses the avatar flow but lets each caller customize picker options.
 */
export function useImagePicker(overrides?: Partial<ImagePicker.ImagePickerOptions>) {
  const [isPicking, setIsPicking] = useState(false);
  const optionsRef = useRef<Partial<ImagePicker.ImagePickerOptions> | undefined>(
    overrides,
  );

  useEffect(() => {
    optionsRef.current = overrides;
  }, [overrides]);

  const pickImage = useCallback(async (): Promise<PickedImage | null> => {
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
        name: asset.fileName ?? asset.assetId ?? 'upload.jpg',
        type: asset.mimeType ?? 'image/jpeg',
      };
    } catch (error) {
      console.warn('useImagePicker: failed to pick image', error);
      Alert.alert('Unable to open photos', 'Please try again.');
      return null;
    } finally {
      setIsPicking(false);
    }
  }, [isPicking]);

  return { pickImage, isPicking };
}
