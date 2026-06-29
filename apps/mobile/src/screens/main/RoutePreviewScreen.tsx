import React, { useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { StackScreenProps } from '@react-navigation/stack';
import { PrimaryButton } from '../../components/PrimaryButton';
import { startSession } from '../../api/session';
import { getApiErrorMessage } from '../../api/errors';
import { useSessionStore } from '../../store/sessionStore';
import { formatDistance, formatMinutes, routeEstimates } from '../../utils/geo';
import { colors, radius, spacing } from '../../theme';
import type { AppTabsParamList, HomeStackParamList } from '../../navigation/AppTabs';

type Props = StackScreenProps<HomeStackParamList, 'RoutePreview'>;

export function RoutePreviewScreen({ navigation, route }: Props): React.JSX.Element {
  const { sessionId } = route.params;
  const orderedPackages = useSessionStore((s) => s.orderedPackages);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { legs, totalKm, totalMinutes } = useMemo(
    () => routeEstimates(orderedPackages),
    [orderedPackages],
  );

  const handleStart = async () => {
    setStarting(true);
    setError(null);
    try {
      await startSession(sessionId);
      // ActiveDelivery lives in the Active tab's stack, so hop across navigators.
      navigation
        .getParent<BottomTabNavigationProp<AppTabsParamList>>()
        ?.navigate('ActiveTab', { screen: 'ActiveDelivery', params: { sessionId } });
    } catch (err) {
      setError(getApiErrorMessage(err));
      setStarting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Optimized Route</Text>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{orderedPackages.length}</Text>
              <Text style={styles.summaryLabel}>stops</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{formatDistance(totalKm)}</Text>
              <Text style={styles.summaryLabel}>est. distance</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{formatMinutes(totalMinutes)}</Text>
              <Text style={styles.summaryLabel}>est. time</Text>
            </View>
          </View>
        </View>

        <FlatList
          data={orderedPackages}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => {
            const leg = legs[index];
            return (
              <View style={styles.stopCard}>
                <View style={styles.stopNumber}>
                  <Text style={styles.stopNumberText}>{index + 1}</Text>
                </View>
                <View style={styles.stopInfo}>
                  <Text style={styles.stopName}>{item.customerName}</Text>
                  <Text style={styles.stopAddress} numberOfLines={2}>
                    {item.addressRaw}
                  </Text>
                  <Text style={styles.stopMeta}>
                    {index === 0
                      ? `First stop · Ref ${item.packageRef}`
                      : `${formatDistance(leg.distanceKm)} · ${formatMinutes(leg.minutes)} · Ref ${item.packageRef}`}
                  </Text>
                </View>
              </View>
            );
          }}
          ListEmptyComponent={<Text style={styles.emptyText}>No stops to show.</Text>}
          contentContainerStyle={styles.list}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <PrimaryButton
          title="Start Delivery"
          loading={starting}
          onPress={handleStart}
          disabled={orderedPackages.length === 0}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1, padding: spacing.md },
  header: { marginBottom: spacing.md },
  title: { fontSize: 24, fontWeight: '700', color: colors.text },
  summaryRow: {
    flexDirection: 'row',
    marginTop: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
  },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryValue: { fontSize: 18, fontWeight: '700', color: colors.text },
  summaryLabel: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  list: { gap: spacing.sm, paddingBottom: spacing.sm },
  stopCard: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  stopNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  stopNumberText: { fontSize: 14, fontWeight: '700', color: colors.white },
  stopInfo: { flex: 1 },
  stopName: { fontSize: 16, fontWeight: '600', color: colors.text },
  stopAddress: { fontSize: 13, color: colors.textMuted, marginTop: 4 },
  stopMeta: { fontSize: 12, color: colors.textMuted, marginTop: 4 },
  emptyText: { fontSize: 14, color: colors.textMuted, textAlign: 'center', marginTop: spacing.lg },
  error: { fontSize: 13, color: colors.error, marginBottom: spacing.md },
});
