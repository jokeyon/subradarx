/**
 * subradax — Expo config (subscription tracker).
 * Replace ./assets/icon.png with a real 1024×1024 PNG before store builds.
 */
require('dotenv').config();

const EAS_PROJECT_ID = process.env.EAS_PROJECT_ID || 'f5858867-d2a0-4c97-9c87-6df6d12f65f5';

module.exports = {
  expo: {
    name: 'subradax',
    slug: 'subradar',
    version: '1.0.1',
    /** EAS Update: OTA 与商店包用同一 runtime；改 `version` 后需重新 eas build。 */
    runtimeVersion: { policy: 'appVersion' },
    updates: {
      url: `https://u.expo.dev/${EAS_PROJECT_ID}`,
      /** Ensure startup pulls from the server (not only after crashes). */
      checkAutomatically: 'ON_LOAD',
    },
    orientation: 'portrait',
    /** Mobile only — avoids EAS Update export requiring react-native-web. */
    platforms: ['ios', 'android'],
    scheme: 'subradax',
    userInterfaceStyle: 'automatic',
    /** RNIap + EAS: if pods fail again, try turning back on after a successful build. */
    newArchEnabled: false,
    icon: './assets/icon.png',
    splash: {
      image: './assets/splash-icon.png',
      resizeMode: 'contain',
      /** Match new-2026-B-subscription-stack (soft peach). */
      backgroundColor: '#FFEDD5',
    },
    assetBundlePatterns: ['**/*'],
    ios: {
      supportsTablet: false,
      /** Must match a unique App ID you register (app.subradar.ios is taken globally). */
      bundleIdentifier: 'com.jokeyon.subradar',
      /** Bump this string before each App Store upload (EAS `autoIncrement` is incompatible with app.config.js). */
      buildNumber: '9',
      infoPlist: {
        CFBundleDisplayName: 'subradax',
        ITSAppUsesNonExemptEncryption: false,
      },
    },
    android: {
      package: 'com.jokeyon.subradar',
      /** Increment for each Play upload (must be higher than last release). */
      versionCode: 9,
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#FFEDD5',
      },
      permissions: ['android.permission.SCHEDULE_EXACT_ALARM'],
    },
    plugins: [
      'expo-updates',
      [
        'expo-build-properties',
        {
          ios: {
            deploymentTarget: '15.1',
          },
        },
      ],
      'expo-font',
      'expo-localization',
      'expo-router',
      '@react-native-community/datetimepicker',
      'react-native-iap',
      [
        'expo-notifications',
        {
          color: '#6366F1',
          defaultChannel: 'subradax-renewals',
          sounds: [],
        },
      ],
      'expo-secure-store',
      'expo-web-browser',
      [
        'expo-share-extension',
        {
          activationRules: [{ type: 'text' }, { type: 'url', max: 1 }],
          height: 400,
          backgroundColor: { red: 11, green: 18, blue: 32, alpha: 255 },
          excludedPackages: [
            'expo-dev-client',
            'expo-splash-screen',
            'expo-updates',
            'expo-font',
            'expo-notifications',
            'react-native-iap',
          ],
        },
      ],
      require('./plugins/withShareExtensionQueriesSchemes'),
    ],
    experiments: {
      typedRoutes: true,
    },
    extra: {
      eas: {
        /** @jokeyon/subradax — override with env on CI if needed */
        projectId: EAS_PROJECT_ID,
      },
      /** Google OAuth client IDs — create in Google Cloud Console (Gmail API + OAuth consent). Use env EXPO_PUBLIC_GOOGLE_* */
      googleIosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || '',
      googleAndroidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || '',
      googleWebClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '',
    },
  },
};
