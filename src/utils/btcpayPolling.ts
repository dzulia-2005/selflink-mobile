import type { SlcLedgerEntry } from '@api/coin';
import { createIpayPollSession } from '@utils/ipayPolling';

export const createBtcpayPollSession = createIpayPollSession;

export type BtcpayPurchaseContext = {
  reference: string;
  expectedAmountCents: number;
  startedAtMs: number;
};

export type BtcpayLedgerEntry = Pick<
  SlcLedgerEntry,
  | 'event_type'
  | 'event_metadata'
  | 'metadata'
  | 'amount_cents'
  | 'direction'
  | 'occurred_at'
  | 'created_at'
>;

const getMetadataValue = (
  metadata: Record<string, unknown> | undefined,
  key: string,
) => {
  if (!metadata) {
    return undefined;
  }
  return metadata[key];
};

const getMetadataString = (
  metadata: Record<string, unknown> | undefined,
  key: string,
) => {
  const value = getMetadataValue(metadata, key);
  return typeof value === 'string' ? value : undefined;
};

const getEntryTimestampMs = (entry: BtcpayLedgerEntry) => {
  const raw = entry.occurred_at || entry.created_at;
  if (!raw) {
    return null;
  }
  const parsed = Date.parse(raw);
  return Number.isNaN(parsed) ? null : parsed;
};

const isMintCredit = (entry: BtcpayLedgerEntry) =>
  entry.event_type === 'mint' && (!entry.direction || entry.direction === 'CREDIT');

const isBtcpayProvider = (entry: BtcpayLedgerEntry) => {
  const provider =
    getMetadataString(entry.event_metadata, 'provider') ??
    getMetadataString(entry.metadata, 'provider');
  return !provider || provider === 'btcpay';
};

const getEntryReference = (entry: BtcpayLedgerEntry) =>
  getMetadataString(entry.event_metadata, 'reference') ??
  getMetadataString(entry.metadata, 'reference');

export const findBtcpayMintInLedger = (
  entries: BtcpayLedgerEntry[],
  ctx: BtcpayPurchaseContext,
) => {
  const byReference = entries.find(
    (entry) => isMintCredit(entry) && getEntryReference(entry) === ctx.reference,
  );
  if (byReference) {
    return byReference;
  }

  return entries.find((entry) => {
    if (!isMintCredit(entry) || !isBtcpayProvider(entry)) {
      return false;
    }
    if (entry.amount_cents !== ctx.expectedAmountCents) {
      return false;
    }
    const timestamp = getEntryTimestampMs(entry);
    if (timestamp === null) {
      return false;
    }
    return timestamp >= ctx.startedAtMs;
  });
};

export const shouldCompleteBtcpayPolling = (
  ctx: BtcpayPurchaseContext,
  entries: BtcpayLedgerEntry[],
) => Boolean(findBtcpayMintInLedger(entries, ctx));
