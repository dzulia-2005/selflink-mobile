import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ToastProvider } from '@context/ToastContext';
import { ProfileScreen } from '@screens/profile/ProfileScreen';

const mockSignOut = jest.fn();
const mockNavigate = jest.fn();
const mockFetchProfile = jest.fn();

const mockState = {
  currentUser: {
    id: 1,
    name: 'Steve Jobs',
    handle: 'sjobs',
    email: 'jobs@apple.com',
    photo: '',
  },
  personalMap: null,
  hasCompletedPersonalMap: false,
  logout: mockSignOut,
  fetchProfile: mockFetchProfile,
};

jest.mock('@react-navigation/native', () => {
  const actual = jest.requireActual('@react-navigation/native');
  return {
    ...actual,
    useNavigation: () => ({
      navigate: mockNavigate,
    }),
  };
});

jest.mock('@store/authStore', () => ({
  useAuthStore: (selector: (state: typeof mockState) => unknown) =>
    selector(mockState),
}));

describe('ProfileScreen', () => {
  beforeEach(() => {
    mockSignOut.mockReset();
    mockNavigate.mockReset();
    mockFetchProfile.mockReset();
  });

  const renderScreen = () =>
    render(
      <ToastProvider>
        <SafeAreaProvider
          initialMetrics={{
            frame: { x: 0, y: 0, width: 320, height: 640 },
            insets: { top: 0, left: 0, right: 0, bottom: 0 },
          }}
        >
          <ProfileScreen />
        </SafeAreaProvider>
      </ToastProvider>,
    );

  it('renders profile details and signs out', async () => {
    mockSignOut.mockResolvedValue(undefined);

    const { getByText } = renderScreen();

    expect(getByText('Steve Jobs')).toBeTruthy();
    expect(getByText('@sjobs')).toBeTruthy();
    expect(getByText('jobs@apple.com')).toBeTruthy();

    fireEvent.press(getByText('Sign out'));

    await waitFor(() => expect(mockSignOut).toHaveBeenCalled());
  });

  it('navigates to profile edit', () => {
    const { getByText } = renderScreen();

    fireEvent.press(getByText('Edit profile'));

    expect(mockNavigate).toHaveBeenCalledWith('ProfileEdit');
  });
});
