import React from 'react';
import { Button } from 'react-native';
import type { StackScreenProps } from '@react-navigation/stack';
import { ScreenPlaceholder } from '../../components/ScreenPlaceholder';
import type { AuthStackParamList } from '../../navigation/AuthStack';

type Props = StackScreenProps<AuthStackParamList, 'SetProfile'>;

export function SetProfileScreen({ navigation }: Props): React.JSX.Element {
  return (
    <ScreenPlaceholder title="SetProfile" subtitle="Tell us your name to finish signing up.">
      <Button title="Continue" onPress={() => navigation.navigate('Permissions')} />
    </ScreenPlaceholder>
  );
}
