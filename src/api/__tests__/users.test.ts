import { apiClient } from '@api/client';
import { getRecipientId, searchUsers } from '@api/users';

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
});
