import React from 'react';
import { Button } from 'react-native';
import type { StackScreenProps } from '@react-navigation/stack';
import { ScreenPlaceholder } from '../../components/ScreenPlaceholder';
import type { AuthStackParamList } from '../../navigation/AuthStack';

type Props = StackScreenProps<AuthStackParamList, 'PhoneEntry'>;

export function PhoneEntryScreen({ navigation }: Props): React.JSX.Element {
  return (
    <ScreenPlaceholder title="Enter your phone" subtitle="We'll send you a one-time code.">
      <Button
        title="Send OTP"
        onPress={() => navigation.navigate('OTPVerify', { phone: '+910000000000' })}
      />
    </ScreenPlaceholder>
  );
}
