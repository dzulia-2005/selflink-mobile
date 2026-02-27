import { fireEvent, render, waitFor } from '@testing-library/react-native';
import React from 'react';

import { ProfileScreen } from '@screens/profile/ProfileScreen';

const mockSetStringAsync = jest.fn().mockResolvedValue(undefined);
const mockToastPush = jest.fn();
const mockNavigate = jest.fn();

jest.mock('expo-clipboard', () => ({
  setStringAsync: (...args: unknown[]) => mockSetStringAsync(...args),
}));

jest.mock('expo-linear-gradient', () => {
  const ReactModule = require('react');
  const { View } = require('react-native');
  return {
    LinearGradient: ({ children }: any) => ReactModule.createElement(View, null, children),
  };
});

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
  }),
}));

jest.mock('@api/users', () => ({
  getRecipientId: jest.fn().mockResolvedValue({ account_key: 'slc_1234567890' }),
  savePersonalMapProfile: jest.fn(),
}));

jest.mock('@hooks/useAvatarPicker', () => ({
  useAvatarPicker: () => ({
    pickImage: jest.fn(),
    isPicking: false,
  }),
}));

jest.mock('@context/ToastContext', () => ({
  useToast: () => ({
    push: mockToastPush,
  }),
}));

jest.mock('@theme', () => ({
  useTheme: () => ({
    mode: 'system',
    setMode: jest.fn(),
    theme: {
      gradients: { appBackground: ['#000', '#111'], card: ['#111', '#222'] },
      spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 20 },
      radii: { md: 12, lg: 16, pill: 999 },
      colors: {
        surface: '#111',
        surfaceAlt: '#222',
        border: '#333',
        background: '#000',
        error: '#f66',
      },
      text: { primary: '#fff', secondary: '#ccc', muted: '#999' },
      typography: { headingL: {}, headingM: {}, caption: {}, button: {} },
      shadows: { card: {} },
    },
  }),
}));

const mockLogout = jest.fn();
const mockFetchProfile = jest.fn();

jest.mock('@store/authStore', () => ({
  useAuthStore: (selector: any) =>
    selector({
      currentUser: {
        id: 1,
        name: 'John Doe',
        handle: 'john',
        email: 'john@example.com',
        photo: '',
      },
      personalMap: null,
      hasCompletedPersonalMap: false,
      logout: mockLogout,
      fetchProfile: mockFetchProfile,
    }),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) =>
      (
        {
          'profile.view.sections.more': 'More',
          'profile.menu.notifications': 'Notifications',
          'profile.menu.wallet': 'Wallet',
          'profile.menu.editProfile': 'Edit profile',
          'profile.actions.copy': 'Copy',
          'profile.actions.copiedToClipboard': 'Copied to clipboard',
        } as Record<string, string>
      )[key] ?? key,
  }),
}));

describe('ProfileScreen i18n', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders translated profile menu labels and copy action', async () => {
    const { getByText } = render(<ProfileScreen />);

    expect(getByText('More')).toBeTruthy();
    expect(getByText('Notifications')).toBeTruthy();
    expect(getByText('Wallet')).toBeTruthy();
    expect(getByText('Edit profile')).toBeTruthy();

    await waitFor(() => {
      fireEvent.press(getByText('Copy'));
      expect(mockSetStringAsync).toHaveBeenCalled();
    });
  });
});
