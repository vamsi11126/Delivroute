import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { StackScreenProps } from '@react-navigation/stack';
import { PrimaryButton } from '../../components/PrimaryButton';
import { endSession, getSession } from '../../api/session';
import { getApiErrorMessage } from '../../api/errors';
import { useSessionStore } from '../../store/sessionStore';
import { colors, radius, spacing } from '../../theme';
import type { ActiveStackParamList, AppTabsParamList } from '../../navigation/AppTabs';

type Props = StackScreenProps<ActiveStackParamList, 'SessionSummary'>;

export function SessionSummaryScreen({ navigation, route }: Props): React.JSX.Element {
  const currentSession = useSessionStore((s) => s.currentSession);
  const orderedPackages = useSessionStore((s) => s.orderedPackages);
  const setSession = useSessionStore((s) => s.startSession);
  const reset = useSessionStore((s) => s.reset);

  const sessionId = route.params?.sessionId ?? currentSession?.id ?? null;

  const [loading, setLoading] = useState(!orderedPackages.length);
  const [ending, setEnding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void (async () => {
      if (!orderedPackages.length && sessionId) {
        try {
          const session = await getSession(sessionId);
          if (active) setSession(session, session.packages);
        } catch (err) {
          if (active) setError(getApiErrorMessage(err));
        }
      }
      if (active) setLoading(false);
    })();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const delivered = orderedPackages.filter((p) => p.status === 'delivered');
  // Anything not delivered counts as unsuccessful — `failed` before the session
  // ends, `skipped` afterwards.
  const unsuccessful = useMemo(
    () => orderedPackages.filter((p) => p.status === 'failed' || p.status === 'skipped'),
    [orderedPackages],
  );

  const goHomeAndReset = useCallback(() => {
    reset();
    navigation
      .getParent<BottomTabNavigationProp<AppTabsParamList>>()
      ?.navigate('HomeTab', { screen: 'Home' });
  }, [navigation, reset]);

  const handleEndSession = async () => {
    setEnding(true);
    setError(null);
    try {
      if (sessionId) await endSession(sessionId);
      goHomeAndReset();
    } catch (err) {
      setError(getApiErrorMessage(err));
      setEnding(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.container}>
        <Text style={styles.title}>Session Summary</Text>

        <View style={styles.statsRow}>
          <View style={[styles.statCard, styles.statDelivered]}>
            <Text style={styles.statValue}>{delivered.length}</Text>
            <Text style={styles.statLabel}>Delivered</Text>
          </View>
          <View style={[styles.statCard, styles.statFailed]}>
            <Text style={styles.statValue}>{unsuccessful.length}</Text>
            <Text style={styles.statLabel}>Not delivered</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>
          {unsuccessful.length > 0 ? 'Not delivered' : 'Everything was delivered 🎉'}
        </Text>

        <FlatList
          data={unsuccessful}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.failCard}>
              <Text style={styles.failName}>{item.customerName}</Text>
              <Text style={styles.failAddress} numberOfLines={1}>
                {item.addressRaw}
              </Text>
              <Text style={styles.failReason}>{item.failReason ?? 'No reason recorded'}</Text>
            </View>
          )}
          ListEmptyComponent={null}
          contentContainerStyle={styles.list}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <PrimaryButton title="End Session" loading={ending} onPress={handleEndSession} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1, padding: spacing.md },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 24, fontWeight: '700', color: colors.text, marginBottom: spacing.md },
  statsRow: { flexDirection: 'row', gap: spacing.md },
  statCard: { flex: 1, borderRadius: radius.md, padding: spacing.lg, alignItems: 'center' },
  statDelivered: { backgroundColor: '#ECFDF5' },
  statFailed: { backgroundColor: '#FEF2F2' },
  statValue: { fontSize: 28, fontWeight: '800', color: colors.text },
  statLabel: { fontSize: 13, color: colors.textMuted, marginTop: spacing.xs },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  list: { gap: spacing.sm, paddingBottom: spacing.sm },
  failCard: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  failName: { fontSize: 15, fontWeight: '600', color: colors.text },
  failAddress: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  failReason: { fontSize: 13, color: colors.error, marginTop: spacing.xs },
  error: { fontSize: 13, color: colors.error, textAlign: 'center', marginBottom: spacing.sm },
});
