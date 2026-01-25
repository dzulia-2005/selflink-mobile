// app.config.js

module.exports = ({ config }) => {
  const env = process.env;

  const googleMapsApiKey = env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || "";
  const ipayBaseUrl = env.EXPO_PUBLIC_IPAY_BASE_URL || "";
  const btcpayBaseUrl = env.EXPO_PUBLIC_BTCPAY_BASE_URL || "";
  const stripePublishableKey = env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY || "";
  const healthEndpoint = env.EXPO_PUBLIC_HEALTH_ENDPOINT || "/api/v1/health/";
  const iapSkus = env.EXPO_PUBLIC_IAP_SKUS || "";

  return {
    ...config,

    name: "selflink-mobile",
    slug: "selflink",
    owner: "selflinks-organization",
    version: "1.0.0",
    orientation: "portrait",
    userInterfaceStyle: "light",
    newArchEnabled: true,

    icon: "./assets/selflink-app-icon.png",

    splash: {
      image: "./assets/selflink-app-icon.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff",
    },

    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.selflinksorganization.selflink",
      buildNumber: "1",
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
      },
    },

    android: {
      package: "com.selflinksorganization.selflink",
      versionCode: 1,
      permissions: ["com.android.vending.BILLING"],
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,

      adaptiveIcon: {
        foregroundImage: "./assets/selflink-app-icon.png",
        backgroundColor: "#ffffff",
      },

      config: {
        ...(googleMapsApiKey ? { googleMaps: { apiKey: googleMapsApiKey } } : {}),
      },
    },

    web: {
      favicon: "./assets/selflink-app-icon.png",
    },

    extra: {
      backendUrl: "https://api.self-link.com",
      realtimeUrl: "wss://api.self-link.com/ws",
      healthEndpoint,
      eas: {
        projectId: "6a9a9692-7823-4d44-af39-b3442c6e1816",
      },

      // runtime envs (optional)
      ipayBaseUrl,
      btcpayBaseUrl,
      stripePublishableKey,
      googleMapsApiKey,
      iapSkus,
    },
  };
};
