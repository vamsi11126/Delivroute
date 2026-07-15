import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  View,
  type NativeSyntheticEvent,
  type TextInputKeyPressEventData,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { StackScreenProps } from '@react-navigation/stack';
import { verifyOtp } from '../../api/auth';
import { getApiErrorMessage } from '../../api/errors';
import { useAuthStore } from '../../store/authStore';
import { colors, radius, spacing } from '../../theme';
import type { AuthStackParamList } from '../../navigation/AuthStack';

type Props = StackScreenProps<AuthStackParamList, 'OTPVerify'>;

const OTP_LENGTH = 6;
const EMPTY_OTP = Array<string>(OTP_LENGTH).fill('');

export function OTPVerifyScreen({ navigation, route }: Props): React.JSX.Element {
  const { phone } = route.params;
  const login = useAuthStore((s) => s.login);

  const [digits, setDigits] = useState<string[]>(EMPTY_OTP);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inputs = useRef<Array<TextInput | null>>([]);
  // Guards against the auto-submit firing twice for the same filled code.
  const submittedRef = useRef(false);

  const focusBox = (index: number) => {
    inputs.current[Math.max(0, Math.min(index, OTP_LENGTH - 1))]?.focus();
  };

  const resetBoxes = () => {
    setDigits(EMPTY_OTP);
    submittedRef.current = false;
    focusBox(0);
  };

  const submit = async (code: string) => {
    if (submittedRef.current) {
      return;
    }
    submittedRef.current = true;
    setVerifying(true);
    setError(null);
    try {
      const { tokens, user, isNewUser } = await verifyOtp(phone, code);
      if (isNewUser) {
        // Stay in the onboarding stack: save tokens but keep onboarding open.
        await login(user, tokens, { onboardingComplete: false });
        navigation.navigate('SetProfile', { phone });
      } else {
        // Returning user path is kept for backward compatibility.
        await login(user, tokens, { onboardingComplete: true });
      }
    } catch (err) {
      setError(getApiErrorMessage(err, 'That code is incorrect. Please try again.'));
      resetBoxes();
    } finally {
      setVerifying(false);
    }
  };

  const handleChange = (index: number, text: string) => {
    const raw = text.replace(/\D/g, '');
    setError(null);

    const next = [...digits];
    if (raw.length <= 1) {
      next[index] = raw;
    } else {
      // Paste / SMS autofill: spread the digits across the boxes from here.
      for (let k = 0; k < raw.length && index + k < OTP_LENGTH; k += 1) {
        next[index + k] = raw[k];
      }
    }
    setDigits(next);

    if (raw.length === 0) {
      return;
    }
    focusBox(index + Math.max(raw.length, 1));

    if (next.every((d) => d !== '')) {
      void submit(next.join(''));
    }
  };

  const handleKeyPress = (
    index: number,
    e: NativeSyntheticEvent<TextInputKeyPressEventData>,
  ) => {
    if (e.nativeEvent.key === 'Backspace' && digits[index] === '' && index > 0) {
      const next = [...digits];
      next[index - 1] = '';
      setDigits(next);
      focusBox(index - 1);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.container}>
        <Text style={styles.title}>Enter your code</Text>
        <Text style={styles.subtitle}>
          Enter the 6-digit code sent to <Text style={styles.phone}>{phone}</Text>
        </Text>

        <View style={styles.boxes}>
          {digits.map((digit, index) => (
            <TextInput
              // eslint-disable-next-line react/no-array-index-key
              key={index}
              ref={(el) => {
                inputs.current[index] = el;
              }}
              style={[
                styles.box,
                digit ? styles.boxFilled : null,
                error ? styles.boxError : null,
              ]}
              value={digit}
              onChangeText={(t) => handleChange(index, t)}
              onKeyPress={(e) => handleKeyPress(index, e)}
              keyboardType="number-pad"
              inputMode="numeric"
              maxLength={OTP_LENGTH}
              editable={!verifying}
              autoFocus={index === 0}
              textContentType="oneTimeCode"
              autoComplete="sms-otp"
              selectTextOnFocus
              textAlign="center"
            />
          ))}
        </View>

        {verifying ? (
          <View style={styles.verifyingRow}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.verifyingText}>Verifying...</Text>
          </View>
        ) : null}

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <View style={styles.resendRow}>
          <Text style={styles.timerText}>
            Didn&apos;t get a code? Go back and try again. Codes expire after 10 minutes.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1, padding: spacing.lg },
  title: { fontSize: 26, fontWeight: '700', color: colors.text },
  subtitle: { marginTop: spacing.sm, fontSize: 15, color: colors.textMuted, lineHeight: 22 },
  phone: { fontWeight: '600', color: colors.text },
  boxes: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.xl,
  },
  box: {
    width: 48,
    height: 56,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.white,
    fontSize: 22,
    fontWeight: '600',
    color: colors.text,
  },
  boxFilled: { borderColor: colors.primary },
  boxError: { borderColor: colors.error },
  verifyingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: spacing.lg,
  },
  verifyingText: { fontSize: 14, color: colors.textMuted },
  errorText: { marginTop: spacing.md, fontSize: 13, color: colors.error },
  resendRow: { marginTop: spacing.lg, alignItems: 'flex-start' },
  timerText: { fontSize: 14, color: colors.textMuted, lineHeight: 20 },
});
