const appJson = require('./app.json');

module.exports = () => {
  const base = appJson.expo;
  const extra = base.extra ?? {};
  const env = process.env;

  const googleMapsApiKey =
    env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || extra.googleMapsApiKey || '';
  const ipayBaseUrl = env.EXPO_PUBLIC_IPAY_BASE_URL || extra.ipayBaseUrl || '';
  const btcpayBaseUrl = env.EXPO_PUBLIC_BTCPAY_BASE_URL || extra.btcpayBaseUrl || '';
  const stripePublishableKey =
    env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY || extra.stripePublishableKey || '';
  const healthEndpoint = env.EXPO_PUBLIC_HEALTH_ENDPOINT || extra.healthEndpoint || '';

  return {
    ...base,
    android: {
      ...base.android,
      versionCode: base.android?.versionCode ?? 1,
      config: {
        ...base.android?.config,
        googleMaps: googleMapsApiKey
          ? { apiKey: googleMapsApiKey }
          : base.android?.config?.googleMaps,
      },
    },
    ios: {
      ...base.ios,
      buildNumber: base.ios?.buildNumber ?? '1',
    },
    extra: {
      ...extra,
      ipayBaseUrl,
      btcpayBaseUrl,
      stripePublishableKey,
      googleMapsApiKey,
      healthEndpoint,
    },
  };
};
