import * as ImagePicker from 'expo-image-picker';
import { useCallback, useState } from 'react';
import { Alert } from 'react-native';

export type PickedAvatar = {
  uri: string;
  name?: string;
  type?: string;
};

/**
 * Helper hook to request photo permissions and launch the system picker.
 * Requires `expo-image-picker` – install with `npx expo install expo-image-picker`.
 */
export function useAvatarPicker() {
  const [isPicking, setIsPicking] = useState(false);

  const pickImage = useCallback(async (): Promise<PickedAvatar | null> => {
    if (isPicking) {
      return null;
    }
    setIsPicking(true);
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          'Permission needed',
          'Please allow photo library access to update your avatar.',
        );
        return null;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.85,
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
        name: asset.fileName ?? asset.assetId ?? 'avatar.jpg',
        type: asset.mimeType ?? 'image/jpeg',
      };
    } catch (error) {
      console.warn('useAvatarPicker: failed to pick image', error);
      Alert.alert('Unable to open photos', 'Please try again.');
      return null;
    } finally {
      setIsPicking(false);
    }
  }, [isPicking]);

  return { pickImage, isPicking };
}
