import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import axios from 'axios';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { StackScreenProps } from '@react-navigation/stack';
import { TextField } from '../../components/TextField';
import { PrimaryButton } from '../../components/PrimaryButton';
import { login } from '../../api/auth';
import { getApiErrorMessage } from '../../api/errors';
import { useAuthStore } from '../../store/authStore';
import { colors, spacing } from '../../theme';
import type { AuthStackParamList } from '../../navigation/AuthStack';

type Props = StackScreenProps<AuthStackParamList, 'PasswordLogin'>;

export function PasswordLoginScreen({ navigation, route }: Props): React.JSX.Element {
  const { phone } = route.params;
  const authLogin = useAuthStore((state) => state.login);

  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const onSubmit = async () => {
    const trimmedPassword = password.trim();
    if (!trimmedPassword) {
      setSubmitError('Please enter your password.');
      return;
    }
    setSubmitting(true);
    setSubmitError(null);

    try {
      const result = await login(phone, trimmedPassword);
      await authLogin(result.user, result.tokens, { onboardingComplete: true });
      // RootNavigator switches to AppTabs as soon as auth state flips.
    } catch (err) {
      const message =
        axios.isAxiosError(err) && err.response?.status === 401
          ? 'Wrong password. Please try again.'
          : getApiErrorMessage(err, 'Could not log you in. Please try again.');
      setSubmitError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.container}>
          <View>
            <Text style={styles.title}>Password login</Text>
            <Text style={styles.phone}>{phone}</Text>
            <Text style={styles.subtitle}>
              Enter the password for this account to continue.
            </Text>

            <View style={styles.form}>
              <TextField
                label="Password"
                placeholder="Enter your password"
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  if (submitError) {
                    setSubmitError(null);
                  }
                }}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoFocus
                returnKeyType="done"
                onSubmitEditing={onSubmit}
                editable={!submitting}
                error={submitError ?? undefined}
                rightElement={
                  <Pressable onPress={() => setShowPassword((value) => !value)} hitSlop={8}>
                    <Text style={styles.toggle}>{showPassword ? 'Hide' : 'Show'}</Text>
                  </Pressable>
                }
              />
            </View>
          </View>

          <View style={styles.footer}>
            <Pressable onPress={() => navigation.popToTop()} hitSlop={8}>
              <Text style={styles.wrongNumber}>Wrong number?</Text>
            </Pressable>

            <PrimaryButton
              title="Login"
              loading={submitting}
              onPress={onSubmit}
              disabled={!password.trim()}
            />
          </View>
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
  phone: { marginTop: spacing.sm, fontSize: 16, fontWeight: '600', color: colors.text },
  subtitle: { marginTop: spacing.xs, fontSize: 15, color: colors.textMuted, lineHeight: 22 },
  form: { marginTop: spacing.xl },
  toggle: { fontSize: 14, fontWeight: '600', color: colors.primary },
  footer: { gap: spacing.md },
  wrongNumber: { fontSize: 14, fontWeight: '600', color: colors.primary },
});
