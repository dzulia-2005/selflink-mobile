import axios from 'axios';

import { apiClient } from './client';

export type SlcBalance = {
  account_key: string;
  balance_cents: number;
  currency: string;
};

export type SlcLedgerEntry = {
  id: number;
  event_id: number;
  event_type: string;
  occurred_at: string;
  account_key: string;
  amount_cents: number;
  currency: string;
  direction: string;
  note: string;
  event_metadata: Record<string, unknown>;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type SlcLedgerResponse = {
  results: SlcLedgerEntry[];
  next_cursor: string | null;
};

export type SlcLedgerQuery = {
  cursor?: string;
  limit?: number;
};

export type TransferSlcPayload = {
  to_user_id?: number;
  receiver_account_key?: string;
  amount_cents: number;
  note?: string;
};

export type TransferSlcResponse = {
  event_id: number;
  to_user_id: number;
  amount_cents: number;
  fee_cents: number;
  total_debit_cents: number;
  balance_cents: number;
  currency: string;
};

export type SpendSlcPayload = {
  amount_cents: number;
  reference: string;
  note?: string;
};

export type SpendSlcResponse = {
  event_id: number;
  amount_cents: number;
  reference: string;
  balance_cents: number;
  currency: string;
};

type CoinApiError = {
  status?: number;
  code?: string;
  detail?: string;
  fieldErrors?: Record<string, string[]>;
};

export type NormalizedCoinError = {
  message: string;
  status?: number;
  code?: string;
  fields?: Record<string, string[]>;
};

const buildLedgerQuery = (params: SlcLedgerQuery = {}) => {
  const searchParams = new URLSearchParams();
  if (params.cursor) {
    searchParams.set('cursor', params.cursor);
  }
  if (params.limit) {
    searchParams.set('limit', String(params.limit));
  }
  const qs = searchParams.toString();
  return `/coin/ledger/${qs ? `?${qs}` : ''}`;
};

export async function getSlcBalance(): Promise<SlcBalance> {
  const { data } = await apiClient.get<SlcBalance>('/coin/balance/');
  return data;
}

export async function listSlcLedger(
  params: SlcLedgerQuery = {},
): Promise<SlcLedgerResponse> {
  const { data } = await apiClient.get<SlcLedgerResponse>(buildLedgerQuery(params));
  return data;
}

export async function transferSlc(
  payload: TransferSlcPayload,
): Promise<TransferSlcResponse> {
  const { data } = await apiClient.post<TransferSlcResponse>('/coin/transfer/', payload);
  return data;
}

export async function spendSlc(payload: SpendSlcPayload): Promise<SpendSlcResponse> {
  const { data } = await apiClient.post<SpendSlcResponse>('/coin/spend/', payload);
  return data;
}

const extractFieldErrors = (data: Record<string, unknown>) => {
  const fieldErrors: Record<string, string[]> = {};
  Object.entries(data).forEach(([key, value]) => {
    if (Array.isArray(value) && value.every((item) => typeof item === 'string')) {
      fieldErrors[key] = value as string[];
    }
  });
  return Object.keys(fieldErrors).length > 0 ? fieldErrors : undefined;
};

const parseCoinApiError = (error: unknown): CoinApiError => {
  if (!axios.isAxiosError(error)) {
    if (error instanceof Error) {
      return { detail: error.message };
    }
    return { detail: 'Unexpected error' };
  }

  const status = error.response?.status;
  const data = error.response?.data;
  if (!data) {
    return { status, detail: error.message };
  }

  if (typeof data === 'string') {
    return { status, detail: data };
  }

  if (typeof data === 'object') {
    const record = data as Record<string, unknown>;
    const detail = typeof record.detail === 'string' ? record.detail : undefined;
    const code = typeof record.code === 'string' ? record.code : undefined;
    const fieldErrors = extractFieldErrors(record);
    return {
      status,
      code,
      detail,
      fieldErrors,
    };
  }

  return { status, detail: error.message };
};

export const normalizeCoinApiError = (
  error: unknown,
  fallbackMessage = 'Something went wrong.',
): NormalizedCoinError => {
  const parsed = parseCoinApiError(error);
  const fieldErrors = parsed.fieldErrors;
  const firstFieldError = fieldErrors ? Object.values(fieldErrors).flat()[0] : undefined;
  let message = parsed.detail || firstFieldError || fallbackMessage;

  if (parsed.status === 401) {
    message = 'Please sign in to continue.';
  } else if (parsed.status === 403) {
    message = 'You do not have permission to perform this action.';
  } else if (parsed.status === 429) {
    message = 'Too many requests; try again in a moment.';
  } else if (!parsed.status) {
    if (parsed.detail && /network|timeout|failed to fetch/i.test(parsed.detail)) {
      message = 'Unable to reach the server. Please try again.';
    }
  }

  const codeCandidate =
    parsed.code ??
    (typeof parsed.detail === 'string' && /^[a-z_]+$/.test(parsed.detail)
      ? parsed.detail
      : undefined);

  if (codeCandidate === 'insufficient_funds') {
    message = 'Insufficient SLC balance.';
  } else if (codeCandidate === 'invalid_amount') {
    message = 'Enter a valid amount.';
  } else if (codeCandidate === 'invalid_receiver') {
    message = 'Select a valid recipient.';
  } else if (codeCandidate === 'account_inactive') {
    message = 'This account is inactive.';
  } else if (codeCandidate === 'account_invalid') {
    message = 'This account is invalid.';
  }

  return {
    message,
    status: parsed.status,
    code: parsed.code,
    fields: fieldErrors,
  };
};
