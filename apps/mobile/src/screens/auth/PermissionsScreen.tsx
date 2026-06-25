import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { PrimaryButton } from '../../components/PrimaryButton';
import { useAuthStore } from '../../store/authStore';
import { usePermissionStore } from '../../store/permissionStore';
import { colors, radius, spacing } from '../../theme';

const REASONS = [
  'Order your stops into the shortest route',
  'Share your live position with your store',
  'Show your progress on the map as you deliver',
];

export function PermissionsScreen(): React.JSX.Element {
  const completeOnboarding = useAuthStore((s) => s.completeOnboarding);
  const setLocationGranted = usePermissionStore((s) => s.setLocationGranted);

  const [requesting, setRequesting] = useState(false);
  const [denied, setDenied] = useState(false);

  const requestPermission = async () => {
    setRequesting(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === Location.PermissionStatus.GRANTED) {
        setLocationGranted(true);
        completeOnboarding();
      } else {
        setLocationGranted(false);
        setDenied(true);
      }
    } finally {
      setRequesting(false);
    }
  };

  const skipForNow = () => {
    // Enter the app anyway, but flag location off so the warning banner shows.
    setLocationGranted(false);
    completeOnboarding();
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.container}>
        <View style={styles.content}>
          <View style={styles.iconCircle}>
            <Text style={styles.icon}>📍</Text>
          </View>
          <Text style={styles.title}>Enable location access</Text>
          <Text style={styles.subtitle}>
            DelivRoute needs your location to plan and track deliveries. We only use it
            while you&apos;re on an active delivery run.
          </Text>

          <View style={styles.reasons}>
            {REASONS.map((reason) => (
              <View key={reason} style={styles.reasonRow}>
                <Text style={styles.bullet}>✓</Text>
                <Text style={styles.reasonText}>{reason}</Text>
              </View>
            ))}
          </View>

          {denied ? (
            <View style={styles.warning}>
              <Text style={styles.warningText}>
                Without location access, route optimisation and live tracking won&apos;t
                work. You can enable it now, or turn it on later from Settings.
              </Text>
            </View>
          ) : null}
        </View>

        <View style={styles.actions}>
          <PrimaryButton
            title={denied ? 'Try Again' : 'Allow Location Access'}
            loading={requesting}
            onPress={requestPermission}
          />
          <Pressable onPress={skipForNow} disabled={requesting} hitSlop={8} style={styles.skip}>
            <Text style={styles.skipText}>Skip for now</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1, padding: spacing.lg, justifyContent: 'space-between' },
  content: { flex: 1, justifyContent: 'center' },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  icon: { fontSize: 34 },
  title: {
    marginTop: spacing.lg,
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
  },
  subtitle: {
    marginTop: spacing.sm,
    fontSize: 15,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
  },
  reasons: { marginTop: spacing.xl, gap: spacing.md, alignSelf: 'stretch' },
  reasonRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  bullet: { fontSize: 15, fontWeight: '700', color: colors.primary },
  reasonText: { flex: 1, fontSize: 15, color: colors.text },
  warning: {
    marginTop: spacing.xl,
    backgroundColor: colors.warningBg,
    borderWidth: 1,
    borderColor: colors.warningBorder,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  warningText: { fontSize: 14, color: colors.warningText, lineHeight: 20 },
  actions: { gap: spacing.md },
  skip: { alignItems: 'center', paddingVertical: spacing.sm },
  skipText: { fontSize: 15, fontWeight: '600', color: colors.textMuted },
});
