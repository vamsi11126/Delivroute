import React, { forwardRef, useState } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';
import { colors, radius } from '../theme';

interface TextFieldProps extends TextInputProps {
  label?: string;
  error?: string;
  /** Rendered inside the input box on the right (e.g. a show/hide toggle). */
  rightElement?: React.ReactNode;
}

/**
 * Labeled text input with a bordered container, focus highlight, an optional
 * right adornment, and an inline error message. Works standalone or wired to
 * React Hook Form via a Controller's field props.
 */
export const TextField = forwardRef<TextInput, TextFieldProps>(function TextField(
  { label, error, rightElement, style, onFocus, onBlur, ...rest },
  ref,
) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.wrap}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View
        style={[
          styles.box,
          focused ? styles.boxFocused : null,
          error ? styles.boxError : null,
        ]}
      >
        <TextInput
          ref={ref}
          style={[styles.input, style]}
          placeholderTextColor={colors.textMuted}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          {...rest}
        />
        {rightElement ? <View style={styles.right}>{rightElement}</View> : null}
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: { width: '100%' },
  label: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 6 },
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.white,
    paddingHorizontal: 14,
  },
  boxFocused: { borderColor: colors.borderFocused },
  boxError: { borderColor: colors.error },
  input: { flex: 1, height: 52, fontSize: 16, color: colors.text },
  right: { paddingLeft: 8 },
  errorText: { marginTop: 6, fontSize: 13, color: colors.error },
});
