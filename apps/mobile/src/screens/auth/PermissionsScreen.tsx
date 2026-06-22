import React from 'react';
import { Button } from 'react-native';
import { ScreenPlaceholder } from '../../components/ScreenPlaceholder';
import { useAuthStore } from '../../store/authStore';

export function PermissionsScreen(): React.JSX.Element {
  const login = useAuthStore((state) => state.login);

  // Placeholder: real onboarding will request location/notification permissions
  // and complete auth via the API. Here we seed a stub session so the flow
  // reaches the app tabs.
  const finishOnboarding = () => {
    login(
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
      title="Enable permissions"
      subtitle="Location and notifications keep your route live."
    >
      <Button title="Allow & continue" onPress={finishOnboarding} />
    </ScreenPlaceholder>
  );
}
