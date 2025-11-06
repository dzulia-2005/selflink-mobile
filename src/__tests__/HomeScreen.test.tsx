import { render } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { HomeScreen } from '@screens/HomeScreen';
import { ToastProvider } from '@context/ToastContext';

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useNavigation: () => ({
      navigate: jest.fn(),
    }),
  };
});

jest.mock('@hooks/useBackendHealth', () => ({
  useBackendHealth: () => ({
    status: 'online',
    error: undefined,
    refresh: jest.fn(),
  }),
}));

const mockSignOut = jest.fn();

jest.mock('@hooks/useAuth', () => ({
  useAuth: () => ({
    token: 'token',
    user: { id: '1', email: 'steve@apple.com', name: 'Steve Jobs' },
    loading: false,
    isAuthenticated: true,
    signIn: jest.fn(),
    signOut: mockSignOut,
    setUser: jest.fn(),
  }),
}));

describe('HomeScreen', () => {
  it('renders the call to action buttons', () => {
    const initialMetrics = {
      frame: { x: 0, y: 0, width: 320, height: 640 },
      insets: { top: 0, left: 0, right: 0, bottom: 0 },
    };

    const { getByText } = render(
      <ToastProvider>
        <SafeAreaProvider initialMetrics={initialMetrics}>
          <HomeScreen />
        </SafeAreaProvider>
      </ToastProvider>,
    );

    expect(getByText('Mentor Session')).toBeTruthy();
    expect(getByText('SoulMatch')).toBeTruthy();
    expect(getByText('Payments')).toBeTruthy();
    expect(getByText('View Profile')).toBeTruthy();
  });
});
