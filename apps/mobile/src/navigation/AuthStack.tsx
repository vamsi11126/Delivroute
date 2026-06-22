import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { PhoneEntryScreen } from '../screens/auth/PhoneEntryScreen';
import { OTPVerifyScreen } from '../screens/auth/OTPVerifyScreen';
import { SetProfileScreen } from '../screens/auth/SetProfileScreen';
import { PermissionsScreen } from '../screens/auth/PermissionsScreen';

/** Onboarding flow for delivery boys: phone → OTP → profile → permissions. */
export type AuthStackParamList = {
  PhoneEntry: undefined;
  OTPVerify: { phone: string };
  SetProfile: { phone: string };
  Permissions: undefined;
};

const Stack = createStackNavigator<AuthStackParamList>();

export function AuthStack(): React.JSX.Element {
  return (
    <Stack.Navigator initialRouteName="PhoneEntry">
      <Stack.Screen
        name="PhoneEntry"
        component={PhoneEntryScreen}
        options={{ title: 'Sign In' }}
      />
      <Stack.Screen
        name="OTPVerify"
        component={OTPVerifyScreen}
        options={{ title: 'Verify OTP' }}
      />
      <Stack.Screen
        name="SetProfile"
        component={SetProfileScreen}
        options={{ title: 'Your Profile' }}
      />
      <Stack.Screen
        name="Permissions"
        component={PermissionsScreen}
        options={{ title: 'Permissions' }}
      />
    </Stack.Navigator>
  );
}
