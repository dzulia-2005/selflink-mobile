const defaultPermission = {
  granted: true,
  status: 'granted',
  canAskAgain: true,
  expires: 'never' as const,
};

export const MediaType = {
  IMAGE: 'images',
} as const;

export const requestMediaLibraryPermissionsAsync = jest.fn(async () => defaultPermission);

export const launchImageLibraryAsync = jest.fn(async () => ({
  canceled: true,
  assets: [],
}));

export default {
  MediaType,
  requestMediaLibraryPermissionsAsync,
  launchImageLibraryAsync,
};
