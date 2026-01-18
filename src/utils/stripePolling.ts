import type { SlcLedgerEntry } from '@api/coin';
import { createIpayPollSession } from '@utils/ipayPolling';

export const createStripePollSession = createIpayPollSession;

export type StripePurchaseContext = {
  reference: string;
  expectedAmountCents: number;
  startedAtMs: number;
  checkoutId?: string;
};

export type StripeLedgerEntry = Pick<
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

const getEntryTimestampMs = (entry: StripeLedgerEntry) => {
  const raw = entry.occurred_at || entry.created_at;
  if (!raw) {
    return null;
  }
  const parsed = Date.parse(raw);
  return Number.isNaN(parsed) ? null : parsed;
};

const isMintCredit = (entry: StripeLedgerEntry) =>
  entry.event_type === 'mint' && (!entry.direction || entry.direction === 'CREDIT');

const isStripeProvider = (entry: StripeLedgerEntry) => {
  const provider =
    getMetadataString(entry.event_metadata, 'provider') ??
    getMetadataString(entry.metadata, 'provider');
  return !provider || provider === 'stripe';
};

const getEntryReference = (entry: StripeLedgerEntry) =>
  getMetadataString(entry.event_metadata, 'reference') ??
  getMetadataString(entry.metadata, 'reference');

export const findStripeMintInLedger = (
  entries: StripeLedgerEntry[],
  ctx: StripePurchaseContext,
) => {
  const byReference = entries.find(
    (entry) => isMintCredit(entry) && getEntryReference(entry) === ctx.reference,
  );
  if (byReference) {
    return byReference;
  }

  return entries.find((entry) => {
    if (!isMintCredit(entry) || !isStripeProvider(entry)) {
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

export const shouldCompleteStripePolling = (
  ctx: StripePurchaseContext,
  entries: StripeLedgerEntry[],
) => Boolean(findStripeMintInLedger(entries, ctx));
