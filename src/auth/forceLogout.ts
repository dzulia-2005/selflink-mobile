import * as SecureStore from 'expo-secure-store';
import { Alert } from 'react-native';

import { resetToAuth } from '@navigation/navigationRef';
import { disconnectAllRealtime } from '@realtime/index';

const TOKEN_KEY = 'selflink.auth.token';
const REFRESH_TOKEN_KEY = 'selflink.auth.refresh';

let logoutInProgress = false;
let messageShown = false;
let logoutHandler: (() => Promise<void>) | null = null;

export const registerForceLogoutHandler = (handler: () => Promise<void>) => {
  logoutHandler = handler;
};

export async function forceLogout(
  reason: 'expired' | 'unauthorized',
  message?: string,
): Promise<void> {
  if (logoutInProgress) {
    return;
  }
  logoutInProgress = true;
  const alertMessage =
    message ??
    (reason === 'expired'
      ? 'Session expired. Please log in again.'
      : 'Unauthorized. Please log in again.');

  if (!messageShown) {
    messageShown = true;
    Alert.alert('Session expired', alertMessage);
  }

  try {
    disconnectAllRealtime();
  } catch (error) {
    console.warn('forceLogout: failed to disconnect realtime', error);
  }

  if (logoutHandler) {
    try {
      await logoutHandler();
    } catch (error) {
      console.warn('forceLogout: failed to reset auth store', error);
    }
  }

  try {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
  } catch (error) {
    console.warn('forceLogout: failed to clear secure store', error);
  }

  try {
    resetToAuth();
  } catch (error) {
    console.warn('forceLogout: navigation reset failed', error);
  }

  logoutInProgress = false;
}
