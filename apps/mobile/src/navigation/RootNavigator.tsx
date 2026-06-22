import React from 'react';
import { useAuthStore } from '../store/authStore';
import { AuthStack } from './AuthStack';
import { AppTabs } from './AppTabs';

/**
 * Top-level switch: the auth state is hydrated from MMKV on startup
 * (see authStore), so a logged-in boy lands directly on the app tabs and
 * everyone else starts in the onboarding flow.
 */
export function RootNavigator(): React.JSX.Element {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  return isAuthenticated ? <AppTabs /> : <AuthStack />;
}
