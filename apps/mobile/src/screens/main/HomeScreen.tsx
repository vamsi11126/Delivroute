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

  const handleResume = () => {
    if (!currentSession) return;
    if (currentSession.status === 'active') {
      goToActiveDelivery(currentSession.id);
    } else {
      navigation.navigate('PackageEntry', { sessionId: currentSession.id });
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

  const isActive = currentSession?.status === 'active';
  const isCompleted = currentSession?.status === 'completed';

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.container}>
        <View style={styles.content}>
          {!currentSession ? (
            <>
              <View style={styles.iconCircle}>
                <Text style={styles.icon}>📦</Text>
              </View>
              <Text style={styles.title}>Ready to deliver?</Text>
              <Text style={styles.subtitle}>Start a new session and add your packages.</Text>
            </>
          ) : isActive ? (
            <>
              <View style={styles.iconCircle}>
                <Text style={styles.icon}>🚚</Text>
              </View>
              <Text style={styles.title}>Session in progress</Text>
              <View style={styles.statsCard}>
                <Text style={styles.statsText}>
                  {delivered} of {total} delivered
                </Text>
                {failed > 0 ? (
                  <Text style={styles.statsSub}>{failed} need another attempt</Text>
                ) : null}
              </View>
            </>
          ) : isCompleted ? (
            <>
              <View style={styles.iconCircle}>
                <Text style={styles.icon}>✅</Text>
              </View>
              <Text style={styles.title}>All done!</Text>
              <View style={styles.statsCard}>
                <Text style={styles.statsText}>Delivered {delivered} of {total}</Text>
                {failed > 0 ? (
                  <Text style={styles.statsSub}>{failed} not delivered</Text>
                ) : null}
              </View>
            </>
          ) : (
            <>
              <View style={styles.iconCircle}>
                <Text style={styles.icon}>📦</Text>
              </View>
              <Text style={styles.title}>Session ready</Text>
              <Text style={styles.subtitle}>
                {total > 0
                  ? 'Pick up where you left off and optimize your route.'
                  : 'Add packages and optimize your route.'}
              </Text>
            </>
          )}

          {error ? <Text style={styles.error}>{error}</Text> : null}
        </View>

        <View style={styles.actions}>
          {!currentSession || isCompleted ? (
            <PrimaryButton
              title="Start New Session"
              loading={creating}
              onPress={handleCreateSession}
            />
          ) : (
            <PrimaryButton
              title={isActive ? 'Resume Delivery' : 'Resume'}
              onPress={handleResume}
            />
          )}
        </View>
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
  error: { marginTop: spacing.lg, fontSize: 14, color: colors.error, textAlign: 'center' },
  actions: { gap: spacing.md },
});
