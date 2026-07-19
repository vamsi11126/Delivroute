import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { searchAddress, type AddressResult } from '../services/autocomplete.service';
import { colors, radius, spacing } from '../theme';

const DEBOUNCE_MS = 300;
const MIN_QUERY_LENGTH = 3;

interface AddressAutocompleteProps {
  label?: string;
  value: string;
  onChangeText: (text: string) => void;
  /** Fired when the user picks a suggestion — result carries lat/lng. */
  onSelect: (result: AddressResult) => void;
  /**
   * Fired when the user opts to keep the address exactly as typed (no
   * coordinates — the server geocodes it instead). Enables the
   * "Use address as typed" fallback row at the bottom of the dropdown.
   */
  onUseTyped?: (text: string) => void;
  placeholder?: string;
}

/**
 * Address input with a Photon-backed suggestion dropdown. The dropdown opens
 * while typing (>= 3 chars, debounced), shows a spinner while fetching and a
 * "No results found" row when the search comes back empty. Picking a row fills
 * the input and reports the full AddressResult (with coordinates) via
 * onSelect. The dropdown closes on selection, on clear, and when the input
 * loses focus (i.e. the user taps outside).
 */
export function AddressAutocomplete({
  label,
  value,
  onChangeText,
  onSelect,
  onUseTyped,
  placeholder,
}: AddressAutocompleteProps): React.JSX.Element {
  const [results, setResults] = useState<AddressResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  // Set when the input was just filled from a suggestion, so the debounced
  // effect doesn't immediately re-query for the value we just selected.
  const skipNextLookup = useRef(false);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (skipNextLookup.current) {
      skipNextLookup.current = false;
      return;
    }
    const query = value.trim();
    if (query.length < MIN_QUERY_LENGTH) {
      setResults([]);
      setOpen(false);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setOpen(true);
    const timer = setTimeout(async () => {
      const found = await searchAddress(query);
      if (!cancelled) {
        setResults(found);
        setLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [value]);

  const handlePick = (result: AddressResult) => {
    skipNextLookup.current = true;
    onChangeText(result.displayName);
    onSelect(result);
    setResults([]);
    setOpen(false);
    inputRef.current?.blur();
  };

  const handleUseTyped = () => {
    onUseTyped?.(value.trim());
    setResults([]);
    setOpen(false);
    inputRef.current?.blur();
  };

  const handleClear = () => {
    skipNextLookup.current = true;
    onChangeText('');
    setResults([]);
    setOpen(false);
  };

  return (
    <View style={styles.wrap}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={[styles.box, focused ? styles.boxFocused : null]}>
        <TextInput
          ref={inputRef}
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            setFocused(false);
            // Tapping outside blurs the input — close the dropdown. Delayed so
            // a tap on a suggestion row still lands before the list unmounts.
            setTimeout(() => setOpen(false), 150);
          }}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {loading ? (
          <ActivityIndicator size="small" color={colors.primary} style={styles.right} />
        ) : value.length > 0 ? (
          <Pressable onPress={handleClear} hitSlop={8} style={styles.right}>
            <Text style={styles.clearText}>×</Text>
          </Pressable>
        ) : null}
      </View>

      {open ? (
        <View style={styles.dropdown}>
          {loading ? (
            <View style={styles.messageRow}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={styles.messageText}>Searching…</Text>
            </View>
          ) : results.length === 0 ? (
            <View style={styles.messageRow}>
              <Text style={styles.messageText}>No results found</Text>
            </View>
          ) : (
            <FlatList
              data={results}
              keyExtractor={(item, i) => `${item.placeId}-${i}`}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item, index }) => (
                <Pressable
                  style={[styles.resultRow, index > 0 && styles.resultDivider]}
                  onPress={() => handlePick(item)}
                >
                  <Text style={styles.resultText} numberOfLines={2}>
                    {item.displayName}
                  </Text>
                </Pressable>
              )}
            />
          )}
          {!loading && onUseTyped ? (
            <Pressable style={styles.useTypedRow} onPress={handleUseTyped}>
              <Text style={styles.useTypedWarning}>⚠</Text>
              <Text style={styles.useTypedText} numberOfLines={1}>
                Use address as typed: “{value.trim()}”
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: '100%', zIndex: 10 },
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
  input: { flex: 1, height: 52, fontSize: 16, color: colors.text },
  right: { paddingLeft: 8 },
  clearText: { fontSize: 22, color: colors.textMuted, fontWeight: '600' },
  dropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    marginTop: spacing.xs,
    maxHeight: 240,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    overflow: 'hidden',
    zIndex: 20,
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  messageText: { fontSize: 14, color: colors.textMuted },
  resultRow: { paddingVertical: spacing.sm, paddingHorizontal: spacing.md },
  resultDivider: { borderTopWidth: 1, borderTopColor: colors.surface },
  resultText: { fontSize: 14, color: colors.text },
  useTypedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.warningBg,
  },
  useTypedWarning: { fontSize: 14, color: colors.warningText },
  useTypedText: { flex: 1, fontSize: 14, color: colors.warningText },
});
