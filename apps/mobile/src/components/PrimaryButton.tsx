import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { colors, radius } from '../theme';

interface PrimaryButtonProps {
  title: string;
  onPress: () => void;
  /** Shows a spinner and blocks presses while true. */
  loading?: boolean;
  /** Disables the button (also implied by `loading`). */
  disabled?: boolean;
  /** Outline style for secondary actions (e.g. "Try Again"). */
  variant?: 'solid' | 'outline';
  style?: StyleProp<ViewStyle>;
}

/** Primary call-to-action button with a built-in loading state. */
export function PrimaryButton({
  title,
  onPress,
  loading = false,
  disabled = false,
  variant = 'solid',
  style,
}: PrimaryButtonProps): React.JSX.Element {
  const isDisabled = disabled || loading;
  const isOutline = variant === 'outline';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        isOutline ? styles.outline : styles.solid,
        pressed && !isDisabled ? (isOutline ? styles.outlinePressed : styles.solidPressed) : null,
        isDisabled ? (isOutline ? styles.outlineDisabled : styles.solidDisabled) : null,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={isOutline ? colors.primary : colors.white} />
      ) : (
        <Text style={[styles.label, isOutline ? styles.labelOutline : styles.labelSolid]}>
          {title}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 52,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  solid: { backgroundColor: colors.primary },
  solidPressed: { backgroundColor: colors.primaryPressed },
  solidDisabled: { backgroundColor: colors.primaryDisabled },
  outline: { backgroundColor: colors.white, borderWidth: 1.5, borderColor: colors.primary },
  outlinePressed: { backgroundColor: colors.surface },
  outlineDisabled: { borderColor: colors.primaryDisabled },
  label: { fontSize: 16, fontWeight: '600' },
  labelSolid: { color: colors.white },
  labelOutline: { color: colors.primary },
});
