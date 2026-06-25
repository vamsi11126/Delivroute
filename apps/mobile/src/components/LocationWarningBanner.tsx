import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import * as Location from 'expo-location';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePermissionStore } from '../store/permissionStore';
import { colors } from '../theme';

/**
 * Persistent banner shown when location permission was denied or skipped during
 * onboarding. Tapping "Enable" re-requests the OS permission; if granted, the
 * banner hides itself (permission state flips in the store).
 */
export function LocationWarningBanner(): React.JSX.Element | null {
  const insets = useSafeAreaInsets();
  const locationGranted = usePermissionStore((s) => s.locationGranted);
  const setLocationGranted = usePermissionStore((s) => s.setLocationGranted);
  const [requesting, setRequesting] = useState(false);

  if (locationGranted !== false) {
    return null;
  }

  const onEnable = async () => {
    setRequesting(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setLocationGranted(status === Location.PermissionStatus.GRANTED);
    } finally {
      setRequesting(false);
    }
  };

  return (
    <View style={[styles.banner, { paddingTop: insets.top + 8 }]}>
      <Text style={styles.text}>
        Location is off. Route optimisation and live tracking won&apos;t work until you
        enable it.
      </Text>
      <Pressable
        accessibilityRole="button"
        disabled={requesting}
        onPress={onEnable}
        style={({ pressed }) => [styles.action, pressed ? styles.actionPressed : null]}
      >
        <Text style={styles.actionText}>{requesting ? 'Requesting…' : 'Enable'}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: colors.warningBg,
    borderBottomWidth: 1,
    borderBottomColor: colors.warningBorder,
    paddingHorizontal: 16,
    paddingBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  text: { flex: 1, fontSize: 13, color: colors.warningText },
  action: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.warningBorder,
  },
  actionPressed: { opacity: 0.7 },
  actionText: { fontSize: 13, fontWeight: '700', color: colors.warningText },
});
