import React from 'react';
import { Button } from 'react-native';
import type { StackScreenProps } from '@react-navigation/stack';
import { ScreenPlaceholder } from '../../components/ScreenPlaceholder';
import type { AuthStackParamList } from '../../navigation/AuthStack';

type Props = StackScreenProps<AuthStackParamList, 'OTPVerify'>;

export function OTPVerifyScreen({ navigation, route }: Props): React.JSX.Element {
  const { phone } = route.params;
  return (
    <ScreenPlaceholder title="OTPVerify" subtitle={`Enter the code sent to ${phone}.`}>
      <Button
        title="Verify"
        onPress={() => navigation.navigate('SetProfile', { phone })}
      />
    </ScreenPlaceholder>
  );
}
