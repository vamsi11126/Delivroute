import React, { useCallback, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { StackScreenProps } from '@react-navigation/stack';
import { PrimaryButton } from '../../components/PrimaryButton';
import { createSession, getTodaySession } from '../../api/session';
import { getApiErrorMessage } from '../../api/errors';
import { useSessionStore } from '../../store/sessionStore';
import { colors, radius, spacing } from '../../theme';
import type { AppTabsParamList, HomeStackParamList } from '../../navigation/AppTabs';

type Props = StackScreenProps<HomeStackParamList, 'Home'>;

type SessionCardState = 'none' | 'pending' | 'active' | 'completed';

/** Accent colour per state — keeps the four cards visually distinct. */
const STATE_ACCENTS: Record<SessionCardState, string> = {
  none: '#1A56DB', // blue — no session yet
  pending: '#F59E0B', // orange — created, still adding packages
  active: '#10B981', // green — out for delivery
  completed: '#6B7280', // gray — done for the day
};

export function HomeScreen({ navigation }: Props): React.JSX.Element {
  const currentSession = useSessionStore((s) => s.currentSession);
  const packages = useSessionStore((s) => s.packages);
  const setSession = useSessionStore((s) => s.startSession);
  const reset = useSessionStore((s) => s.reset);

  const [hasLoaded, setHasLoaded] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadTodaySession = useCallback(async () => {
    setError(null);
    try {
      const session = await getTodaySession();
      if (session) {
        setSession(session, session.packages);
      } else {
        reset();
      }
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setHasLoaded(true);
    }
  }, [setSession, reset]);

  // Refetch whenever Home regains focus (e.g. after ending a session) so the
  // card always reflects the latest server state.
  useFocusEffect(
    useCallback(() => {
      void loadTodaySession();
    }, [loadTodaySession]),
  );

  const goToActiveDelivery = (sessionId: string) => {
    navigation
      .getParent<BottomTabNavigationProp<AppTabsParamList>>()
      ?.navigate('ActiveTab', { screen: 'ActiveDelivery', params: { sessionId } });
  };

  const handleCreateSession = async () => {
    setCreating(true);
    setError(null);
    try {
      const session = await createSession();
      setSession(session, []);
      navigation.navigate('PackageEntry', { sessionId: session.id });
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setCreating(false);
    }
  };

  const total = packages.length;
  const delivered = packages.filter((p) => p.status === 'delivered').length;
  const failed = packages.filter((p) => p.status === 'failed' || p.status === 'skipped').length;

  if (!hasLoaded) {
    return (
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  // One of four mutually-exclusive states drives the whole screen — each with
  // its own accent colour, icon, copy and (optional) call-to-action.
  const state: SessionCardState = !currentSession
    ? 'none'
    : currentSession.status === 'active'
      ? 'active'
      : currentSession.status === 'completed'
        ? 'completed'
        : 'pending';
  const accent = STATE_ACCENTS[state];

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.container}>
        <View style={styles.content}>
          {state === 'none' ? (
            <>
              <View style={[styles.iconCircle, { backgroundColor: `${accent}1A` }]}>
                <Text style={styles.icon}>📦</Text>
              </View>
              <Text style={styles.title}>Ready to deliver?</Text>
              <Text style={styles.subtitle}>Start a new session and add your packages.</Text>
            </>
          ) : state === 'pending' ? (
            <>
              <View style={[styles.iconCircle, { backgroundColor: `${accent}1A` }]}>
                <Text style={styles.icon}>📦</Text>
              </View>
              <Text style={styles.title}>Session ready</Text>
              <View style={[styles.statsCard, { borderLeftColor: accent, borderLeftWidth: 4 }]}>
                <Text style={styles.statsText}>
                  {total} {total === 1 ? 'package' : 'packages'} added
                </Text>
                <Text style={styles.statsSub}>Keep adding, then optimize your route.</Text>
              </View>
            </>
          ) : state === 'active' ? (
            <>
              <View style={[styles.iconCircle, { backgroundColor: `${accent}1A` }]}>
                <Text style={styles.icon}>🚚</Text>
              </View>
              <Text style={styles.title}>Delivery in progress</Text>
              <View style={[styles.statsCard, { borderLeftColor: accent, borderLeftWidth: 4 }]}>
                <Text style={styles.statsText}>
                  {delivered} of {total} delivered
                </Text>
                {failed > 0 ? (
                  <Text style={styles.statsSub}>{failed} need another attempt</Text>
                ) : null}
              </View>
            </>
          ) : (
            <>
              <View style={[styles.iconCircle, { backgroundColor: `${accent}1A` }]}>
                <Text style={styles.icon}>🎉</Text>
              </View>
              <Text style={styles.title}>All done for today! 🎉</Text>
              <View style={[styles.statsCard, { borderLeftColor: accent, borderLeftWidth: 4 }]}>
                <View style={styles.statRow}>
                  <Text style={styles.statNumber}>{delivered}</Text>
                  <Text style={styles.statCaption}>delivered</Text>
                </View>
                <View style={styles.statRow}>
                  <Text style={styles.statNumber}>{failed}</Text>
                  <Text style={styles.statCaption}>failed</Text>
                </View>
              </View>
              <Text style={[styles.subtitle, { color: accent, fontWeight: '600' }]}>
                Come back tomorrow 👋
              </Text>
            </>
          )}

          {error ? <Text style={styles.error}>{error}</Text> : null}
        </View>

        {/* Completed sessions are terminal for the day — no CTA at all. */}
        {state !== 'completed' ? (
          <View style={styles.actions}>
            {state === 'none' ? (
              <PrimaryButton
                title="Start New Session"
                loading={creating}
                onPress={handleCreateSession}
                style={{ backgroundColor: accent }}
              />
            ) : state === 'pending' ? (
              <PrimaryButton
                title="Continue Adding Packages"
                onPress={() =>
                  currentSession &&
                  navigation.navigate('PackageEntry', { sessionId: currentSession.id })
                }
                style={{ backgroundColor: accent }}
              />
            ) : (
              <PrimaryButton
                title="Resume Delivery"
                onPress={() => currentSession && goToActiveDelivery(currentSession.id)}
                style={{ backgroundColor: accent }}
              />
            )}
          </View>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1, padding: spacing.lg, justifyContent: 'space-between' },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: { fontSize: 40 },
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
  },
  statsCard: {
    marginTop: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
  },
  statsText: { fontSize: 16, fontWeight: '600', color: colors.text },
  statsSub: { marginTop: spacing.xs, fontSize: 13, color: colors.textMuted },
  statRow: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm, marginVertical: 2 },
  statNumber: { fontSize: 22, fontWeight: '800', color: colors.text, minWidth: 32, textAlign: 'right' },
  statCaption: { fontSize: 14, color: colors.textMuted },
  error: { marginTop: spacing.lg, fontSize: 14, color: colors.error, textAlign: 'center' },
  actions: { gap: spacing.md },
});
