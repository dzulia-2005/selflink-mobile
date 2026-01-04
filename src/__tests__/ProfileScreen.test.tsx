import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ToastProvider } from '@context/ToastContext';
import { ProfileScreen } from '@screens/profile/ProfileScreen';

const mockSignOut = jest.fn();
const mockUpdateProfile = jest.fn();
const mockRefreshProfile = jest.fn();

jest.mock('@hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: '1', email: 'jobs@apple.com', name: 'Steve Jobs', avatarUrl: '' },
    signOut: mockSignOut,
    updateProfile: mockUpdateProfile,
    refreshProfile: mockRefreshProfile,
    profileError: null,
  }),
}));

describe('ProfileScreen', () => {
  beforeEach(() => {
    mockSignOut.mockReset();
    mockUpdateProfile.mockReset();
    mockRefreshProfile.mockReset();
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

  it('saves profile changes and shows success toast', async () => {
    mockUpdateProfile.mockResolvedValue({
      id: '1',
      email: 'jobs@apple.com',
      name: 'Steve Jay',
      avatarUrl: '',
    });

    const { getByPlaceholderText, getByText, queryByText } = renderScreen();

    const nameInput = getByPlaceholderText('Add your name');
    fireEvent.changeText(nameInput, 'Steve Jay');

    const saveButton = getByText('Save Changes');
    fireEvent.press(saveButton);

    await waitFor(() =>
      expect(mockUpdateProfile).toHaveBeenCalledWith({ name: 'Steve Jay' }),
    );

    expect(mockRefreshProfile).toHaveBeenCalled();
    expect(queryByText('Profile updated successfully.')).toBeTruthy();
  });

  it('shows error toast when profile update fails', async () => {
    mockUpdateProfile.mockRejectedValue(new Error('network'));

    const { getByPlaceholderText, getByText, queryByText } = renderScreen();

    const nameInput = getByPlaceholderText('Add your name');
    fireEvent.changeText(nameInput, 'Steve Jay');

    fireEvent.press(getByText('Save Changes'));

    await waitFor(() => expect(mockUpdateProfile).toHaveBeenCalled());

    expect(queryByText('Could not update profile. Please try again.')).toBeTruthy();
  });
});
