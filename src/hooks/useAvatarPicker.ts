import { useImagePicker, type PickedImage } from './useImagePicker';

export type PickedAvatar = PickedImage;

/**
 * Helper hook to request photo permissions and launch the system picker.
 * Requires `expo-image-picker` – install with `npx expo install expo-image-picker`.
 */
export function useAvatarPicker() {
  return useImagePicker({
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.85,
  });
}
