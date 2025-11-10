import { act, renderHook, waitFor } from '@testing-library/react-native';
import { ReactNode } from 'react';

import { ToastProvider } from '@context/ToastContext';
import { useMessages } from '@hooks/useMessages';
import {
  createMessage as mockCreateMessage,
  listMessages as mockListMessages,
} from '@services/api/messages';

jest.mock('@services/api/messages', () => ({
  listMessages: jest.fn(),
  createMessage: jest.fn(),
}));

const wrapper = ({ children }: { children: ReactNode }) => (
  <ToastProvider>{children}</ToastProvider>
);

const sender = {
  id: 1,
  email: 'user@example.com',
  handle: 'user',
  name: 'User',
  bio: '',
  photo: '',
  birth_date: null,
  birth_time: null,
  birth_place: '',
  locale: 'en-US',
  flags: {},
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
  settings: {
    privacy: 'public',
    dm_policy: 'everyone',
    language: 'en',
    quiet_hours: {},
    push_enabled: true,
    email_enabled: true,
    digest_enabled: false,
  },
};

describe('useMessages', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (mockListMessages as jest.Mock).mockResolvedValue({
      next: null,
      previous: null,
      results: [],
    });
  });

  it('loads messages on mount', async () => {
    (mockListMessages as jest.Mock).mockResolvedValueOnce({
      next: null,
      previous: null,
      results: [
        {
          id: 10,
          thread: 99,
          body: 'hello',
          type: 'text',
          meta: {},
          created_at: '2025-02-01T12:00:00Z',
          sender,
        },
      ],
    });

    const { result } = renderHook(() => useMessages({ threadId: 99 }), {
      wrapper,
    });

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.messages).toHaveLength(1);
    expect(mockListMessages).toHaveBeenCalledWith(
      expect.objectContaining({ thread: 99 }),
    );
  });

  it('sends a new message', async () => {
    const sentMessage = {
      id: 11,
      thread: 99,
      body: 'Hi there',
      type: 'text',
      meta: {},
      created_at: '2025-02-01T12:05:00Z',
      sender,
    };
    (mockCreateMessage as jest.Mock).mockResolvedValue(sentMessage);

    const { result } = renderHook(() => useMessages({ threadId: 99 }), {
      wrapper,
    });

    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      result.current.updateComposer('Hi there');
    });

    await act(async () => {
      await result.current.sendMessage();
    });

    expect(mockCreateMessage).toHaveBeenCalledWith({ thread: 99, body: 'Hi there' });
    expect(result.current.messages[0]).toEqual(sentMessage);
    expect(result.current.composer.body).toBe('');
  });
});
