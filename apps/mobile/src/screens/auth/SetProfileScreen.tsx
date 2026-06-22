import React from 'react';
import { Button } from 'react-native';
import type { StackScreenProps } from '@react-navigation/stack';
import { ScreenPlaceholder } from '../../components/ScreenPlaceholder';
import type { AuthStackParamList } from '../../navigation/AuthStack';

type Props = StackScreenProps<AuthStackParamList, 'SetProfile'>;

export function SetProfileScreen({ navigation }: Props): React.JSX.Element {
  return (
    <ScreenPlaceholder title="Set up your profile" subtitle="Name and a password to finish.">
      <Button title="Continue" onPress={() => navigation.navigate('Permissions')} />
    </ScreenPlaceholder>
  );
}
