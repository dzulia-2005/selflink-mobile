import { apiClient } from '@api/client';
import { getRecipientId } from '@api/users';

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
});
