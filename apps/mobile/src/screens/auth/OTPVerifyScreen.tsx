import React from 'react';
import { Button } from 'react-native';
import type { StackScreenProps } from '@react-navigation/stack';
import { ScreenPlaceholder } from '../../components/ScreenPlaceholder';
import type { AuthStackParamList } from '../../navigation/AuthStack';

type Props = StackScreenProps<AuthStackParamList, 'OTPVerify'>;

export function OTPVerifyScreen({ navigation, route }: Props): React.JSX.Element {
  return (
    <ScreenPlaceholder title="Verify OTP" subtitle={`Code sent to ${route.params.phone}`}>
      <Button
        title="Verify"
        onPress={() => navigation.navigate('SetProfile', { phone: route.params.phone })}
      />
    </ScreenPlaceholder>
  );
}
