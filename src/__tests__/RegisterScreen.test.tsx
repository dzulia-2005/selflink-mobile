import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { RegisterScreen } from '@screens/RegisterScreen';

const mockSignIn = jest.fn();
const mockRegisterUser = jest.fn();
const mockToastPush = jest.fn();

jest.mock('@hooks/useAuth', () => ({
  useAuth: () => ({
    signIn: mockSignIn,
  }),
}));

jest.mock('@services/api/auth', () => ({
  registerUser: (...args: unknown[]) => mockRegisterUser(...args),
}));

jest.mock('@context/ToastContext', () => ({
  useToast: () => ({
    push: mockToastPush,
    dismiss: jest.fn(),
  }),
}));

describe('RegisterScreen', () => {
  beforeEach(() => {
    mockSignIn.mockReset();
    mockRegisterUser.mockReset();
  });

  const renderScreen = () =>
    render(
      <SafeAreaProvider
        initialMetrics={{
          frame: { x: 0, y: 0, width: 320, height: 640 },
          insets: { top: 0, left: 0, right: 0, bottom: 0 },
        }}
      >
        <RegisterScreen />
      </SafeAreaProvider>,
    );

  it('registers successfully and signs the user in', async () => {
    mockRegisterUser.mockResolvedValue({
      token: 'abc',
      user: { id: '1', email: 'jobs@apple.com', name: 'Steve' },
    });

    const { getByPlaceholderText, getByText } = renderScreen();

    fireEvent.changeText(getByPlaceholderText('Handle'), 'steve');
    fireEvent.changeText(getByPlaceholderText('Email'), 'jobs@apple.com');
    fireEvent.changeText(getByPlaceholderText('Password'), 'password');
    fireEvent.changeText(getByPlaceholderText('Confirm Password'), 'password');

    fireEvent.press(getByText('Create Account'));

    await waitFor(() => expect(mockRegisterUser).toHaveBeenCalled());
    expect(mockRegisterUser).toHaveBeenCalledWith({
      email: 'jobs@apple.com',
      password: 'password',
      handle: 'steve',
    });
    expect(mockSignIn).toHaveBeenCalledWith({
      token: 'abc',
      user: { id: '1', email: 'jobs@apple.com', name: 'Steve' },
    });
    expect(mockToastPush).toHaveBeenCalledWith({
      message: 'Welcome to Selflink!',
      tone: 'info',
      duration: 3000,
    });
  });

  it('shows error toast when registration fails', async () => {
    mockRegisterUser.mockRejectedValue(new Error('network'));

    const { getByPlaceholderText, getByText } = renderScreen();

    fireEvent.changeText(getByPlaceholderText('Handle'), 'steve');
    fireEvent.changeText(getByPlaceholderText('Email'), 'jobs@apple.com');
    fireEvent.changeText(getByPlaceholderText('Password'), 'password');
    fireEvent.changeText(getByPlaceholderText('Confirm Password'), 'password');

    fireEvent.press(getByText('Create Account'));

    await waitFor(() => expect(mockRegisterUser).toHaveBeenCalled());
    expect(mockToastPush).toHaveBeenCalledWith({
      message: 'Registration failed. Please try again.',
      tone: 'error',
      duration: 5000,
    });
  });
});
