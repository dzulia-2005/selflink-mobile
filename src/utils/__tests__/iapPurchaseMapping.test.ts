jest.mock('react-native-iap', () => ({
  initConnection: jest.fn(),
  endConnection: jest.fn(),
  getProducts: jest.fn(),
  requestPurchase: jest.fn(),
  purchaseUpdatedListener: jest.fn(() => ({ remove: jest.fn() })),
  purchaseErrorListener: jest.fn(() => ({ remove: jest.fn() })),
  getAvailablePurchases: jest.fn(),
  finishTransaction: jest.fn(),
}));

import { mapPurchaseToVerifyRequest } from '@utils/iapPurchase';

describe('iap purchase mapping', () => {
  it('maps iOS receipt payloads', () => {
    const payload = mapPurchaseToVerifyRequest(
      {
        productId: 'com.selflink.slc.499',
        transactionId: 'tx_123',
        transactionReceipt: 'receipt_base64',
      },
      'ios',
    );

    expect(payload).toEqual({
      platform: 'ios',
      product_id: 'com.selflink.slc.499',
      transaction_id: 'tx_123',
      receipt: 'receipt_base64',
    });
  });

  it('maps Android purchase tokens', () => {
    const payload = mapPurchaseToVerifyRequest(
      {
        productId: 'com.selflink.slc.499',
        orderId: 'order_123',
        purchaseToken: 'token_abc',
      },
      'android',
    );

    expect(payload).toEqual({
      platform: 'android',
      product_id: 'com.selflink.slc.499',
      transaction_id: 'order_123',
      purchase_token: 'token_abc',
    });
  });

  it('returns null when required fields are missing', () => {
    const payload = mapPurchaseToVerifyRequest(
      {
        productId: 'com.selflink.slc.499',
        transactionId: 'tx_123',
      },
      'ios',
    );

    expect(payload).toBeNull();
  });
});
