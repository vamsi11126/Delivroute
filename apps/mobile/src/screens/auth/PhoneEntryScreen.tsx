import React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Controller, useForm } from 'react-hook-form';
import type { StackScreenProps } from '@react-navigation/stack';
import { PrimaryButton } from '../../components/PrimaryButton';
import { colors, radius, spacing } from '../../theme';
import type { AuthStackParamList } from '../../navigation/AuthStack';

type Props = StackScreenProps<AuthStackParamList, 'PhoneEntry'>;

interface FormValues {
  phone: string;
}

const COUNTRY_CODE = '+91';

export function PhoneEntryScreen({ navigation }: Props): React.JSX.Element {
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ defaultValues: { phone: '' }, mode: 'onSubmit' });

  const onSubmit = ({ phone }: FormValues) => {
    // No SMS provider — the store owner generates the OTP from their dashboard
    // and shares it directly. We only collect the phone here; hitting send-otp
    // would overwrite the owner's invite code in Redis.
    navigation.navigate('OTPVerify', { phone: `${COUNTRY_CODE}${phone}` });
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.container}>
          <View>
            <Text style={styles.title}>Enter your phone number</Text>
            <Text style={styles.subtitle}>
              Your store owner will share a 6-digit code with you. Enter your
              number, then the code on the next screen.
            </Text>

            <Controller
              control={control}
              name="phone"
              rules={{
                required: 'Phone number is required',
                pattern: {
                  value: /^[6-9]\d{9}$/,
                  message: 'Enter a valid 10-digit mobile number',
                },
              }}
              render={({ field: { onChange, onBlur, value } }) => (
                <View style={styles.fieldGroup}>
                  <View
                    style={[
                      styles.phoneRow,
                      errors.phone ? styles.phoneRowError : null,
                    ]}
                  >
                    <View style={styles.prefixBox}>
                      <Text style={styles.prefixText}>{COUNTRY_CODE}</Text>
                    </View>
                    <View style={styles.divider} />
                    <TextInput
                      style={styles.phoneInput}
                      value={value}
                      onChangeText={(t) => {
                        onChange(t.replace(/[^0-9]/g, ''));
                      }}
                      onBlur={onBlur}
                      keyboardType="number-pad"
                      inputMode="numeric"
                      maxLength={10}
                      placeholder="9876543210"
                      placeholderTextColor={colors.textMuted}
                      autoFocus
                      returnKeyType="done"
                      onSubmitEditing={handleSubmit(onSubmit)}
                    />
                  </View>
                  {errors.phone ? (
                    <Text style={styles.errorText}>{errors.phone.message}</Text>
                  ) : null}
                </View>
              )}
            />
          </View>

          <PrimaryButton title="Continue" onPress={handleSubmit(onSubmit)} />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  container: { flex: 1, padding: spacing.lg, justifyContent: 'space-between' },
  title: { fontSize: 26, fontWeight: '700', color: colors.text },
  subtitle: { marginTop: spacing.sm, fontSize: 15, color: colors.textMuted },
  fieldGroup: { marginTop: spacing.xl },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.white,
    paddingHorizontal: 14,
  },
  phoneRowError: { borderColor: colors.error },
  prefixBox: { paddingVertical: 14 },
  prefixText: { fontSize: 16, fontWeight: '600', color: colors.text },
  divider: {
    width: 1,
    height: 24,
    backgroundColor: colors.border,
    marginHorizontal: 12,
  },
  phoneInput: { flex: 1, height: 52, fontSize: 16, color: colors.text, letterSpacing: 1 },
  errorText: { marginTop: spacing.sm, fontSize: 13, color: colors.error },
});
