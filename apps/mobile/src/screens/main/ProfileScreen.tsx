import React from 'react';
import { Button } from 'react-native';
import { ScreenPlaceholder } from '../../components/ScreenPlaceholder';
import { useAuthStore } from '../../store/authStore';

export function ProfileScreen(): React.JSX.Element {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  return (
    <ScreenPlaceholder title="Profile" subtitle={user?.name ?? 'Delivery boy'}>
      <Button title="Log out" color="#c0392b" onPress={logout} />
    </ScreenPlaceholder>
  );
}
