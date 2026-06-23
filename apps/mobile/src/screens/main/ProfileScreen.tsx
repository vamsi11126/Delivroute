import React from 'react';
import { Button } from 'react-native';
import { ScreenPlaceholder } from '../../components/ScreenPlaceholder';
import { useAuthStore } from '../../store/authStore';

export function ProfileScreen(): React.JSX.Element {
  const logout = useAuthStore((state) => state.logout);
  return (
    <ScreenPlaceholder title="Profile" subtitle="Account and app settings.">
      <Button title="Log out" onPress={() => void logout()} />
    </ScreenPlaceholder>
  );
}
