import { act, render, waitFor } from '@testing-library/react-native';
import { useRef } from 'react';
import { Text } from 'react-native';

import { AuthProvider } from '@context/AuthContext';
import { useAuth } from '@hooks/useAuth';

jest.mock('@services/api/client', () => {
  const actual = jest.requireActual('@services/api/client');
  return {
    ...actual,
    apiClient: {
      ...actual.apiClient,
      setToken: jest.fn(),
    },
  };
});

const mockFetchCurrentUser = jest.fn();
const mockUpdateCurrentUser = jest.fn();

jest.mock('@services/api/user', () => ({
  fetchCurrentUser: (...args: unknown[]) => mockFetchCurrentUser(...args),
  updateCurrentUser: (...args: unknown[]) => mockUpdateCurrentUser(...args),
}));

const secureStore = jest.requireMock('expo-secure-store') as {
  setItemAsync: jest.Mock;
  deleteItemAsync: jest.Mock;
  getItemAsync: jest.Mock;
};

type HarnessProps = {
  onReady: (value: ReturnType<typeof useAuth>) => void;
};

function AuthHarness({ onReady }: HarnessProps) {
  const auth = useAuth();
  const readyRef = useRef(false);

  if (!readyRef.current) {
    readyRef.current = true;
    onReady(auth);
  }

  return (
    <>
      <Text testID="token">{auth.token ?? 'none'}</Text>
      <Text testID="status">{auth.isAuthenticated ? 'yes' : 'no'}</Text>
    </>
  );
}

describe('AuthContext', () => {
  beforeEach(() => {
    secureStore.setItemAsync.mockClear();
    secureStore.deleteItemAsync.mockClear();
    secureStore.getItemAsync.mockResolvedValue(null);
    mockFetchCurrentUser.mockReset();
    mockUpdateCurrentUser.mockReset();
  });

  it('signs in and signs out while persisting the token', async () => {
    let authApi: ReturnType<typeof useAuth> | undefined;
    const handleReady = (value: ReturnType<typeof useAuth>) => {
      authApi = value;
    };

    const { getByTestId } = render(
      <AuthProvider>
        <AuthHarness onReady={handleReady} />
      </AuthProvider>,
    );

    await waitFor(() => expect(authApi).toBeDefined());

    await act(async () => {
      await authApi?.signIn({
        token: 'abc-token',
        user: { id: '1', email: 'jobs@apple.com', name: 'Steve Jobs' },
      });
    });

    expect(getByTestId('token').props.children).toBe('abc-token');
    expect(getByTestId('status').props.children).toBe('yes');
    expect(secureStore.setItemAsync).toHaveBeenCalled();

    await act(async () => {
      await authApi?.signOut();
    });

    expect(getByTestId('token').props.children).toBe('none');
    expect(getByTestId('status').props.children).toBe('no');
    expect(secureStore.deleteItemAsync).toHaveBeenCalled();
  });

  it('updates profile successfully', async () => {
    let authApi: ReturnType<typeof useAuth> | undefined;
    const handleReady = (value: ReturnType<typeof useAuth>) => {
      authApi = value;
    };

    mockUpdateCurrentUser.mockResolvedValue({
      id: '1',
      email: 'jobs@apple.com',
      name: 'Steve J.',
    });

    render(
      <AuthProvider>
        <AuthHarness onReady={handleReady} />
      </AuthProvider>,
    );

    await waitFor(() => expect(authApi).toBeDefined());

    await act(async () => {
      await authApi?.signIn({
        token: 'abc-token',
        user: { id: '1', email: 'jobs@apple.com', name: 'Steve Jobs' },
      });
    });

    await act(async () => {
      await authApi?.updateProfile({ name: 'Steve J.' });
    });

    expect(mockUpdateCurrentUser).toHaveBeenCalledWith({ name: 'Steve J.' });
    expect(authApi?.user?.name).toBe('Steve J.');
  });

  it('surfaces errors when profile update fails', async () => {
    let authApi: ReturnType<typeof useAuth> | undefined;
    const handleReady = (value: ReturnType<typeof useAuth>) => {
      authApi = value;
    };

    mockUpdateCurrentUser.mockRejectedValue(new Error('network'));

    render(
      <AuthProvider>
        <AuthHarness onReady={handleReady} />
      </AuthProvider>,
    );

    await waitFor(() => expect(authApi).toBeDefined());

    await act(async () => {
      await authApi?.signIn({
        token: 'abc-token',
        user: { id: '1', email: 'jobs@apple.com', name: 'Steve Jobs' },
      });
    });

    let caught: Error | null = null;
    await act(async () => {
      try {
        await authApi?.updateProfile({ name: 'New Name' });
      } catch (error) {
        caught = error as Error;
      }
    });

    expect(caught).toBeTruthy();
    expect(caught?.message).toBe('network');

    expect(authApi?.user?.name).toBe('Steve Jobs');
  });
});
