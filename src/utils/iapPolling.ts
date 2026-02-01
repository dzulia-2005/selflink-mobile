import type { SlcLedgerEntry } from '@api/coin';
import type { IapPlatform } from '@api/iap';
import { createIpayPollSession } from '@utils/ipayPolling';

export const createIapPollSession = createIpayPollSession;

export type IapPurchaseContext = {
  platform: IapPlatform;
  productId: string;
  transactionId: string;
  startedAtMs: number;
  providerEventId?: string;
  coinEventId?: number;
};

export type IapLedgerEntry = Pick<
  SlcLedgerEntry,
  | 'event_id'
  | 'event_type'
  | 'event_metadata'
  | 'metadata'
  | 'amount_cents'
  | 'direction'
  | 'occurred_at'
  | 'created_at'
>;

const getMetadataValue = (metadata: Record<string, unknown> | undefined, key: string) => {
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

const getEntryTimestampMs = (entry: IapLedgerEntry) => {
  const raw = entry.occurred_at || entry.created_at;
  if (!raw) {
    return null;
  }
  const parsed = Date.parse(raw);
  return Number.isNaN(parsed) ? null : parsed;
};

const isMintCredit = (entry: IapLedgerEntry) =>
  entry.event_type === 'mint' && (!entry.direction || entry.direction === 'CREDIT');

const expectedProvider = (platform: IapPlatform) =>
  platform === 'ios' ? 'apple_iap' : 'google_iap';

const matchesProvider = (entry: IapLedgerEntry, platform: IapPlatform) => {
  const provider =
    getMetadataString(entry.event_metadata, 'provider') ??
    getMetadataString(entry.metadata, 'provider');
  return !provider || provider === expectedProvider(platform);
};

const getEntryExternalId = (entry: IapLedgerEntry) =>
  getMetadataString(entry.event_metadata, 'external_id') ??
  getMetadataString(entry.metadata, 'external_id');

const getEntryProductId = (entry: IapLedgerEntry) =>
  getMetadataString(entry.event_metadata, 'product_id') ??
  getMetadataString(entry.metadata, 'product_id');

export const findIapMintInLedger = (
  entries: IapLedgerEntry[],
  ctx: IapPurchaseContext,
) => {
  if (ctx.coinEventId) {
    const byEventId = entries.find(
      (entry) => isMintCredit(entry) && entry.event_id === ctx.coinEventId,
    );
    if (byEventId) {
      return byEventId;
    }
  }

  const expectedExternalId = ctx.providerEventId || ctx.transactionId;
  const byExternalId = entries.find((entry) => {
    if (!isMintCredit(entry) || !matchesProvider(entry, ctx.platform)) {
      return false;
    }
    if (getEntryExternalId(entry) !== expectedExternalId) {
      return false;
    }
    const timestamp = getEntryTimestampMs(entry);
    if (timestamp !== null && timestamp < ctx.startedAtMs) {
      return false;
    }
    return true;
  });
  if (byExternalId) {
    return byExternalId;
  }

  return entries.find((entry) => {
    if (!isMintCredit(entry) || !matchesProvider(entry, ctx.platform)) {
      return false;
    }
    if (getEntryProductId(entry) !== ctx.productId) {
      return false;
    }
    const timestamp = getEntryTimestampMs(entry);
    if (timestamp === null) {
      return false;
    }
    return timestamp >= ctx.startedAtMs;
  });
};

export const shouldCompleteIapPolling = (
  ctx: IapPurchaseContext,
  entries: IapLedgerEntry[],
) => Boolean(findIapMintInLedger(entries, ctx));
