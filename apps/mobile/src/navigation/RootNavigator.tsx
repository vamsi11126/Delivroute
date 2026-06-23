import React, { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useAuthStore } from '../store/authStore';
import { AuthStack } from './AuthStack';
import { AppTabs } from './AppTabs';

/**
 * Top-level switch. Auth tokens live in SecureStore (async), so we trigger
 * `hydrate()` on mount and show a spinner until it resolves; after that a
 * logged-in boy lands on the app tabs and everyone else starts onboarding.
 */
export function RootNavigator(): React.JSX.Element {
  const isHydrated = useAuthStore((state) => state.isHydrated);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const hydrate = useAuthStore((state) => state.hydrate);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  if (!isHydrated) {
    return (
      <View style={styles.splash}>
        <ActivityIndicator size="large" color="#111" />
      </View>
    );
  }

  return isAuthenticated ? <AppTabs /> : <AuthStack />;
}

const styles = StyleSheet.create({
  splash: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
});
