const defaultPermission = {
  granted: true,
  status: 'granted',
  canAskAgain: true,
  expires: 'never' as const,
};

export const MediaTypeOptions = {
  All: 'all',
  Images: 'images',
  Videos: 'videos',
} as const;

export const requestMediaLibraryPermissionsAsync = jest.fn(async () => defaultPermission);

export const launchImageLibraryAsync = jest.fn(async () => ({
  canceled: true,
  assets: [],
}));

export default {
  MediaTypeOptions,
  requestMediaLibraryPermissionsAsync,
  launchImageLibraryAsync,
};
