import { act, renderHook, waitFor } from '@testing-library/react-native';
import { ReactNode } from 'react';

import { ToastProvider } from '@context/ToastContext';
import { useThreads } from '@hooks/useThreads';
import { listThreads } from '@services/api/threads';

jest.mock('@services/api/threads', () => ({
  listThreads: jest.fn(),
}));

const mockListThreads = jest.mocked(listThreads);

const wrapper = ({ children }: { children: ReactNode }) => (
  <ToastProvider>{children}</ToastProvider>
);

const baseThread = {
  id: 1,
  title: 'Chat with Steve',
  is_group: false,
  participants: [],
  members: [],
  last_message: { body: 'hello', created_at: '2025-02-01T10:00:00Z' },
  unread_count: 0,
  created_at: '2025-02-01T09:00:00Z',
  updated_at: '2025-02-01T10:00:00Z',
};

describe('useThreads', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (mockListThreads as jest.Mock).mockResolvedValue({
      next: null,
      previous: null,
      results: [baseThread],
    });
  });

  it('loads threads on mount', async () => {
    const { result } = renderHook(() => useThreads(), { wrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.threads).toHaveLength(1);
    expect(mockListThreads).toHaveBeenCalled();
  });

  it('loads more threads when available', async () => {
    (mockListThreads as jest.Mock)
      .mockResolvedValueOnce({
        next: 'cursor',
        previous: null,
        results: [baseThread],
      })
      .mockResolvedValueOnce({
        next: null,
        previous: null,
        results: [{ ...baseThread, id: 2 }],
      });

    const { result } = renderHook(() => useThreads(), { wrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      result.current.loadMore();
    });

    await waitFor(() =>
      expect(mockListThreads.mock.calls.length).toBeGreaterThanOrEqual(2),
    );
    await waitFor(() => expect(result.current.threads).toHaveLength(2));
  });
});
