import { apiClient } from '@api/client';
import { getRecipientId, getUserProfile, searchUsers } from '@api/users';

jest.mock('@api/client', () => ({
  apiClient: {
    get: jest.fn(),
  },
}));

const mockGet = jest.mocked(apiClient.get);

describe('users api', () => {
  beforeEach(() => {
    mockGet.mockReset();
  });

  it('requests recipient id for SLC transfers', async () => {
    mockGet.mockResolvedValueOnce({ data: { account_key: 'user:123' } });

    const data = await getRecipientId();

    expect(mockGet).toHaveBeenCalledWith('/users/me/recipient-id/');
    expect(data.account_key).toBe('user:123');
  });

  it('searches users with query and limit', async () => {
    mockGet.mockResolvedValueOnce({ data: [] });

    await searchUsers('anna', 12);

    expect(mockGet).toHaveBeenCalledWith('/search/users/?q=anna&limit=12');
  });

  it('maps recipient alias field on user profile response', async () => {
    mockGet.mockResolvedValueOnce({
      data: {
        id: 7,
        handle: 'anna',
        name: 'Anna',
        recipient_id: 'user:7',
      },
    });

    const profile = await getUserProfile(7);

    expect(mockGet).toHaveBeenCalledWith('/users/7/');
    expect(profile.account_key).toBe('user:7');
  });

  it('falls back to search endpoint when profile lacks recipient id', async () => {
    mockGet
      .mockResolvedValueOnce({
        data: {
          id: 7,
          handle: 'anna',
          name: 'Anna',
        },
      })
      .mockResolvedValueOnce({
        data: [
          {
            id: 7,
            handle: 'anna',
            account_key: 'user:7',
          },
        ],
      });

    const profile = await getUserProfile(7);

    expect(mockGet).toHaveBeenNthCalledWith(1, '/users/7/');
    expect(mockGet).toHaveBeenNthCalledWith(2, '/search/users/?q=anna&limit=10');
    expect(profile.account_key).toBe('user:7');
  });
});
