import { env } from '@config/env';

export type IapProductDefinition = {
  sku: string;
  label: string;
  description: string;
};

const DEFAULT_IAP_PRODUCTS: IapProductDefinition[] = [
  {
    sku: 'com.selflink.slc.499',
    label: 'SLC Pack',
    description: 'Small credit pack.',
  },
  {
    sku: 'com.selflink.slc.999',
    label: 'SLC Pack',
    description: 'Medium credit pack.',
  },
];

const normalizeSkuList = (value: string[] | undefined) => {
  if (!value || value.length === 0) {
    return null;
  }
  const skus = value.map((sku) => sku.trim()).filter(Boolean);
  return skus.length > 0 ? skus : null;
};

export const getIapProductCatalog = (): IapProductDefinition[] => {
  const override = normalizeSkuList(env.iapSkus);
  if (!override) {
    return DEFAULT_IAP_PRODUCTS;
  }
  return override.map((sku) => {
    const matched = DEFAULT_IAP_PRODUCTS.find((item) => item.sku === sku);
    if (matched) {
      return matched;
    }
    return {
      sku,
      label: 'SLC Pack',
      description: 'SLC credits.',
    };
  });
};
