import { Platform } from 'react-native';
import {
  endConnection,
  finishTransaction,
  getAvailablePurchases,
  getProducts,
  initConnection,
  purchaseErrorListener,
  purchaseUpdatedListener,
  requestPurchase,
} from 'react-native-iap';

import type { VerifyIapRequest, IapPlatform } from '@api/iap';

export type IapProduct = {
  productId: string;
  title: string;
  description: string;
  localizedPrice?: string;
  price?: string;
};

export type IapPurchase = {
  productId?: string;
  transactionId?: string;
  transactionReceipt?: string;
  purchaseToken?: string;
  orderId?: string;
};

export type IapPurchaseError = {
  code?: string;
  message?: string;
};

export const IAP_ERROR_CODES = {
  cancelled: new Set(['E_USER_CANCELLED', 'E_USER_CANCELLED_IOS']),
  alreadyOwned: new Set(['E_ALREADY_OWNED', 'E_ITEM_ALREADY_OWNED']),
};

export const initIapConnection = async (): Promise<boolean> => {
  try {
    return await initConnection();
  } catch {
    return false;
  }
};

export const endIapConnection = () => {
  try {
    endConnection();
  } catch {
    // noop: safe cleanup
  }
};

export const fetchIapProducts = async (skus: string[]): Promise<IapProduct[]> => {
  const getter = getProducts as unknown as (arg: unknown) => Promise<IapProduct[]>;
  try {
    return await getter({ skus });
  } catch {
    return await getter(skus);
  }
};

export const requestIapPurchase = async (sku: string) => {
  const requester = requestPurchase as unknown as (arg: unknown) => Promise<void>;
  try {
    await requester({
      sku,
      andDangerouslyFinishTransactionAutomaticallyIOS: false,
    });
  } catch {
    await requester(sku);
  }
};

export const listenForIapUpdates = (
  onPurchase: (purchase: IapPurchase) => void,
  onError: (error: IapPurchaseError) => void,
) => {
  const purchaseSub = purchaseUpdatedListener((purchase) => {
    onPurchase(purchase as IapPurchase);
  });
  const errorSub = purchaseErrorListener((error) => {
    onError(error as IapPurchaseError);
  });
  return () => {
    purchaseSub.remove();
    errorSub.remove();
  };
};

export const getAvailableIapPurchases = async (): Promise<IapPurchase[]> => {
  const purchases = await getAvailablePurchases();
  return purchases as IapPurchase[];
};

export const finalizeIapPurchase = async (purchase: IapPurchase) => {
  const finisher = finishTransaction as unknown as (arg: unknown, arg2?: unknown) => Promise<void>;
  try {
    await finisher({ purchase, isConsumable: true });
  } catch {
    await finisher(purchase, true);
  }
};

export const normalizeIapPurchaseError = (error: unknown) => {
  if (!error || typeof error !== 'object') {
    return { message: 'In-app purchase failed.' };
  }
  const record = error as { code?: string; message?: string };
  const message = record.message || 'In-app purchase failed.';
  return { code: record.code, message };
};

const resolveTransactionId = (purchase: IapPurchase) =>
  purchase.transactionId || purchase.orderId || '';

export const mapPurchaseToVerifyRequest = (
  purchase: IapPurchase,
  platform: IapPlatform = Platform.OS === 'ios' ? 'ios' : 'android',
): VerifyIapRequest | null => {
  const productId = purchase.productId?.trim();
  const transactionId = resolveTransactionId(purchase).trim();
  if (!productId || !transactionId) {
    return null;
  }

  if (platform === 'ios') {
    const receipt = purchase.transactionReceipt?.trim();
    if (!receipt) {
      return null;
    }
    return {
      platform: 'ios',
      product_id: productId,
      transaction_id: transactionId,
      receipt,
    };
  }

  const purchaseToken = purchase.purchaseToken?.trim();
  if (!purchaseToken) {
    return null;
  }
  return {
    platform: 'android',
    product_id: productId,
    transaction_id: transactionId,
    purchase_token: purchaseToken,
  };
};
