import type { NavigationContainerRef } from '@react-navigation/native';
import { CommonActions } from '@react-navigation/native';
import * as NavigationNative from '@react-navigation/native';

import type { RootStackParamList } from './types';

const createRef =
  (NavigationNative as { createNavigationContainerRef?: typeof NavigationNative.createNavigationContainerRef })
    .createNavigationContainerRef;

const fallbackRef = {
  isReady: () => false,
  dispatch: () => undefined,
} as unknown as NavigationContainerRef<RootStackParamList>;

export const navigationRef =
  (createRef?.<RootStackParamList>() as NavigationContainerRef<RootStackParamList>) ??
  fallbackRef;

export const resetToAuth = () => {
  if (!navigationRef.isReady()) {
    return;
  }
  navigationRef.dispatch(
    CommonActions.reset({
      index: 0,
      routes: [{ name: 'Auth' }],
    }),
  );
};
