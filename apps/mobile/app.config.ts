import type { ExpoConfig, ConfigContext } from 'expo/config';

/**
 * Dynamic Expo config. Expo CLI auto-loads `.env` into `process.env` when this
 * file is evaluated, so secrets/URLs live in `.env` (git-ignored) and are
 * surfaced to the running app through `extra` → read via `expo-constants`
 * (see src/config/env.ts). Never put real API keys in source control.
 */
const LOCATION_PERMISSION =
  'DelivRoute uses your location to optimise delivery routes and share your live position with your store.';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'DelivRoute',
  slug: 'delivroute',
  owner: 'vamsi2618',
  version: '0.1.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  scheme: 'delivroute',
  userInterfaceStyle: 'light',
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.delivroute.mobile',
    infoPlist: {
      NSLocationWhenInUseUsageDescription: LOCATION_PERMISSION,
      NSLocationAlwaysAndWhenInUseUsageDescription: LOCATION_PERMISSION,
    },
    config: {
      googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY,
    },
  },
  android: {
    package: 'com.delivroute.mobile',
    adaptiveIcon: {
      backgroundColor: '#E6F4FE',
      foregroundImage: './assets/android-icon-foreground.png',
      backgroundImage: './assets/android-icon-background.png',
      monochromeImage: './assets/android-icon-monochrome.png',
    },
    permissions: [
      'ACCESS_COARSE_LOCATION',
      'ACCESS_FINE_LOCATION',
      'FOREGROUND_SERVICE',
    ],
    predictiveBackGestureEnabled: false,
    config: {
      googleMaps: {
        apiKey: process.env.GOOGLE_MAPS_API_KEY,
      },
    },
  },
  web: {
    favicon: './assets/favicon.png',
  },
  plugins: [
    [
      'expo-location',
      {
        locationAlwaysAndWhenInUsePermission: LOCATION_PERMISSION,
        locationWhenInUsePermission: LOCATION_PERMISSION,
      },
    ],
    'expo-secure-store',
    'expo-notifications',
  ],
  extra: {
    apiUrl: process.env.API_URL ?? 'http://localhost:4000/v1',
    mapProvider: process.env.MAP_PROVIDER ?? 'osm',
    googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY ?? '',
    eas: {
      projectId: '0448ce40-78e3-4aed-801c-050e3ffab331',
    },
  },
});
