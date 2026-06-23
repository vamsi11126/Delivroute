import React from 'react';
import { Button } from 'react-native';
import * as Location from 'expo-location';
import { ScreenPlaceholder } from '../../components/ScreenPlaceholder';
import { useAuthStore } from '../../store/authStore';

export function PermissionsScreen(): React.JSX.Element {
  const login = useAuthStore((state) => state.login);

  // Placeholder onboarding: request foreground location via expo-location, then
  // seed a stub session so the flow reaches the app tabs. Real onboarding (and
  // notification permission) is wired up in later prompts.
  const finishOnboarding = async () => {
    await Location.requestForegroundPermissionsAsync();
    await login(
      {
        id: 'stub-user',
        storeId: 'stub-store',
        role: 'delivery_boy',
        name: 'Delivery Boy',
        phone: '+910000000000',
      },
      { accessToken: 'stub-access-token', refreshToken: 'stub-refresh-token' },
    );
  };

  return (
    <ScreenPlaceholder
      title="Permissions"
      subtitle="Location and notifications keep your route live."
    >
      <Button title="Allow & continue" onPress={finishOnboarding} />
    </ScreenPlaceholder>
  );
}
