import { AxiosError } from 'axios';

import { apiClient } from '@api/client';
import {
  getSlcBalance,
  listSlcLedger,
  normalizeCoinApiError,
  spendSlc,
  transferSlc,
} from '@api/coin';
import { COIN_SPEND_REFERENCES } from '../../constants/coinSpendReferences';

jest.mock('@api/client', () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));

const mockGet = jest.mocked(apiClient.get);
const mockPost = jest.mocked(apiClient.post);

const createAxiosError = (status: number, data: unknown) =>
  ({
    isAxiosError: true,
    response: { status, data },
    message: 'Request failed',
  }) as AxiosError;

describe('coin api', () => {
  beforeEach(() => {
    mockGet.mockReset();
    mockPost.mockReset();
  });

  it('requests SLC balance', async () => {
    mockGet.mockResolvedValueOnce({ data: { balance_cents: 0 } });

    await getSlcBalance();

    expect(mockGet).toHaveBeenCalledWith('/coin/balance/');
  });

  it('requests SLC ledger with cursor and limit', async () => {
    mockGet.mockResolvedValueOnce({ data: { results: [], next_cursor: null } });

    await listSlcLedger({ cursor: 'opaque:cursor', limit: 10 });

    expect(mockGet).toHaveBeenCalledWith('/coin/ledger/?cursor=opaque%3Acursor&limit=10');
  });

  it('requests SLC ledger without cursor on refresh', async () => {
    mockGet.mockResolvedValueOnce({ data: { results: [], next_cursor: null } });

    await listSlcLedger();

    expect(mockGet).toHaveBeenCalledWith('/coin/ledger/');
  });

  it('posts SLC transfer payload', async () => {
    mockPost.mockResolvedValueOnce({ data: { event_id: 1 } });

    await transferSlc({ to_user_id: 12, amount_cents: 2500, note: 'hello' });

    expect(mockPost).toHaveBeenCalledWith('/coin/transfer/', {
      to_user_id: 12,
      amount_cents: 2500,
      note: 'hello',
    });
  });

  it('posts SLC transfer with receiver account key', async () => {
    mockPost.mockResolvedValueOnce({ data: { event_id: 4 } });

    await transferSlc({ receiver_account_key: 'user:42', amount_cents: 500 });

    expect(mockPost).toHaveBeenCalledWith('/coin/transfer/', {
      receiver_account_key: 'user:42',
      amount_cents: 500,
    });
  });

  it('posts SLC spend payload', async () => {
    mockPost.mockResolvedValueOnce({ data: { event_id: 2 } });

    await spendSlc({ amount_cents: 500, reference: 'product:test', note: 'tip' });

    expect(mockPost).toHaveBeenCalledWith('/coin/spend/', {
      amount_cents: 500,
      reference: 'product:test',
      note: 'tip',
    });
  });

  it('passes spend allowlist references as-is', async () => {
    mockPost.mockResolvedValueOnce({ data: { event_id: 3 } });
    const reference = COIN_SPEND_REFERENCES[0]?.value ?? 'product:test';

    await spendSlc({ amount_cents: 100, reference });

    expect(mockPost).toHaveBeenCalledWith('/coin/spend/', {
      amount_cents: 100,
      reference,
    });
  });

  it('maps transfer validation errors with detail and code', () => {
    const error = createAxiosError(400, { detail: 'insufficient_funds', code: 'insufficient_funds' });

    const parsed = normalizeCoinApiError(error);

    expect(parsed.status).toBe(400);
    expect(parsed.message).toBe('Insufficient SLC balance.');
    expect(parsed.code).toBe('insufficient_funds');
  });

  it('maps serializer field errors', () => {
    const error = createAxiosError(400, { to_user_id: ['Receiver not found.'] });

    const parsed = normalizeCoinApiError(error);

    expect(parsed.status).toBe(400);
    expect(parsed.message).toBe('Receiver not found.');
    expect(parsed.fields?.to_user_id?.[0]).toBe('Receiver not found.');
  });

  it('maps auth errors', () => {
    const error = createAxiosError(401, { detail: 'Authentication credentials were not provided.' });

    const parsed = normalizeCoinApiError(error);

    expect(parsed.status).toBe(401);
    expect(parsed.message).toBe('Please sign in to continue.');
  });

  it('maps forbidden errors', () => {
    const error = createAxiosError(403, { detail: 'You do not have permission to perform this action.' });

    const parsed = normalizeCoinApiError(error);

    expect(parsed.status).toBe(403);
    expect(parsed.message).toBe('You do not have permission to perform this action.');
  });

  it('maps throttling errors', () => {
    const error = createAxiosError(429, { detail: 'Request was throttled.' });

    const parsed = normalizeCoinApiError(error);

    expect(parsed.status).toBe(429);
    expect(parsed.message).toBe('Too many requests; try again in a moment.');
  });
});
