import React, { useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Controller, useForm } from 'react-hook-form';
import type { StackScreenProps } from '@react-navigation/stack';
import { TextField } from '../../components/TextField';
import { PrimaryButton } from '../../components/PrimaryButton';
import { updateProfile } from '../../api/auth';
import { getApiErrorMessage } from '../../api/errors';
import { useAuthStore } from '../../store/authStore';
import { colors, spacing } from '../../theme';
import type { AuthStackParamList } from '../../navigation/AuthStack';

type Props = StackScreenProps<AuthStackParamList, 'SetProfile'>;

interface FormValues {
  name: string;
  password: string;
  confirmPassword: string;
}

const MIN_PASSWORD = 8;

export function SetProfileScreen({ navigation }: Props): React.JSX.Element {
  const setUser = useAuthStore((s) => s.setUser);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const passwordRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);

  const {
    control,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: { name: '', password: '', confirmPassword: '' },
    mode: 'onTouched',
  });

  const onSubmit = async ({ name, password }: FormValues) => {
    setSubmitError(null);
    setSubmitting(true);
    try {
      const user = await updateProfile({ name: name.trim(), password });
      setUser(user);
      navigation.navigate('Permissions');
    } catch (err) {
      setSubmitError(getApiErrorMessage(err, 'Could not save your profile. Please try again.'));
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
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.title}>Set up your profile</Text>
          <Text style={styles.subtitle}>
            Add your name and a password to secure your account.
          </Text>

          <View style={styles.form}>
            <Controller
              control={control}
              name="name"
              rules={{
                required: 'Full name is required',
                validate: (v) => v.trim().length >= 2 || 'Enter your full name',
              }}
              render={({ field: { onChange, onBlur, value } }) => (
                <TextField
                  label="Full name"
                  placeholder="Ravi Kumar"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  autoCapitalize="words"
                  returnKeyType="next"
                  onSubmitEditing={() => passwordRef.current?.focus()}
                  error={errors.name?.message}
                />
              )}
            />

            <Controller
              control={control}
              name="password"
              rules={{
                required: 'Password is required',
                minLength: {
                  value: MIN_PASSWORD,
                  message: `Password must be at least ${MIN_PASSWORD} characters`,
                },
              }}
              render={({ field: { onChange, onBlur, value } }) => (
                <TextField
                  ref={passwordRef}
                  label="Password"
                  placeholder="At least 8 characters"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  returnKeyType="next"
                  onSubmitEditing={() => confirmRef.current?.focus()}
                  error={errors.password?.message}
                  rightElement={
                    <Pressable onPress={() => setShowPassword((v) => !v)} hitSlop={8}>
                      <Text style={styles.toggle}>{showPassword ? 'Hide' : 'Show'}</Text>
                    </Pressable>
                  }
                />
              )}
            />

            <Controller
              control={control}
              name="confirmPassword"
              rules={{
                required: 'Please confirm your password',
                validate: (v) => v === getValues('password') || 'Passwords do not match',
              }}
              render={({ field: { onChange, onBlur, value } }) => (
                <TextField
                  ref={confirmRef}
                  label="Confirm password"
                  placeholder="Re-enter your password"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  secureTextEntry={!showConfirm}
                  autoCapitalize="none"
                  returnKeyType="done"
                  onSubmitEditing={handleSubmit(onSubmit)}
                  error={errors.confirmPassword?.message}
                  rightElement={
                    <Pressable onPress={() => setShowConfirm((v) => !v)} hitSlop={8}>
                      <Text style={styles.toggle}>{showConfirm ? 'Hide' : 'Show'}</Text>
                    </Pressable>
                  }
                />
              )}
            />

            {submitError ? <Text style={styles.errorText}>{submitError}</Text> : null}
          </View>

          <PrimaryButton
            title="Save & Continue"
            loading={submitting}
            onPress={handleSubmit(onSubmit)}
            style={styles.button}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  scroll: { flexGrow: 1, padding: spacing.lg },
  title: { fontSize: 26, fontWeight: '700', color: colors.text },
  subtitle: { marginTop: spacing.sm, fontSize: 15, color: colors.textMuted },
  form: { marginTop: spacing.xl, gap: spacing.md },
  toggle: { fontSize: 14, fontWeight: '600', color: colors.primary },
  errorText: { fontSize: 13, color: colors.error },
  button: { marginTop: spacing.xl },
});
