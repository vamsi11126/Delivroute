import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import type { StackScreenProps } from '@react-navigation/stack';
import { TextField } from '../../components/TextField';
import { PrimaryButton } from '../../components/PrimaryButton';
import { getSession, markDelivered, markFailed } from '../../api/session';
import { getApiErrorMessage } from '../../api/errors';
import * as socketService from '../../services/socket.service';
import * as gpsService from '../../services/gps.service';
import { flushQueue } from '../../utils/offlineQueue';
import { useSessionStore } from '../../store/sessionStore';
import { formatDistance, formatMinutes, haversineKm, estimateMinutes } from '../../utils/geo';
import { colors, radius, spacing } from '../../theme';
import type { ActiveStackParamList } from '../../navigation/AppTabs';
import type { Package } from '../../types/models';

type Props = StackScreenProps<ActiveStackParamList, 'ActiveDelivery'>;

/** A stop is "actionable" while it still needs a delivery attempt. */
const isActionable = (p: Package): boolean => p.status === 'pending' || p.status === 'failed';

const FAIL_REASONS = ['Customer not available', 'Wrong address', 'Customer refused'] as const;

export function ActiveDeliveryScreen({ navigation, route }: Props): React.JSX.Element {
  const currentSession = useSessionStore((s) => s.currentSession);
  const orderedPackages = useSessionStore((s) => s.orderedPackages);
  const setSession = useSessionStore((s) => s.startSession);
  const updatePackage = useSessionStore((s) => s.updatePackage);
  const setTracking = useSessionStore((s) => s.setTracking);

  const sessionId = route.params?.sessionId ?? currentSession?.id ?? null;

  const [loading, setLoading] = useState(!orderedPackages.length);
  const [marking, setMarking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  // Drives the Live/Offline indicator; polled from the socket every few seconds.
  const [live, setLive] = useState(false);

  const [failSheetOpen, setFailSheetOpen] = useState(false);
  const [otherReason, setOtherReason] = useState('');

  const currentStop = useMemo(
    () => orderedPackages.find(isActionable) ?? null,
    [orderedPackages],
  );
  const total = orderedPackages.length;
  const delivered = orderedPackages.filter((p) => p.status === 'delivered').length;
  const resolved = orderedPackages.filter((p) => !isActionable(p)).length;
  const progress = total > 0 ? resolved / total : 0;

  const captureLocation = useCallback(async () => {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status !== Location.PermissionStatus.GRANTED) return;
      const pos = await Location.getCurrentPositionAsync({});
      setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
    } catch {
      // Best-effort: distance/ETA simply won't be shown without a fix.
    }
  }, []);

  const refresh = useCallback(async () => {
    if (!sessionId) return;
    try {
      const session = await getSession(sessionId);
      setSession(session, session.packages);
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  }, [sessionId, setSession]);

  // Initial load: ensure the store reflects the server, grab a GPS fix.
  useEffect(() => {
    let active = true;
    void (async () => {
      if (!orderedPackages.length) await refresh();
      await captureLocation();
      if (active) setLoading(false);
    })();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Real-time lifecycle: connect the socket + start GPS while this screen is
  // mounted (i.e. the session is active), and tear both down on unmount /
  // session complete. Background/lock is handled by expo-location itself, which
  // pauses foreground updates — no background service required.
  useEffect(() => {
    socketService.connect();
    void gpsService.startTracking();
    setTracking(true);

    // Listen for delivery outcomes pushed from the server (e.g. a re-optimise
    // triggered elsewhere) and reflect them in the local session state.
    const offDelivery = socketService.onDeliveryStatus(({ packageId, status }) => {
      updatePackage(packageId, { status });
    });

    // When the socket recovers from a drop, replay any GPS pings buffered while
    // we were offline.
    const offReconnect = socketService.onReconnect(() => {
      void flushQueue();
    });

    return () => {
      offDelivery();
      offReconnect();
      gpsService.stopTracking();
      socketService.disconnect();
      setTracking(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Poll the socket connection state every 5s to drive the Live/Offline badge.
  useEffect(() => {
    setLive(socketService.isConnected());
    const id = setInterval(() => setLive(socketService.isConnected()), 5000);
    return () => clearInterval(id);
  }, []);

  // Once every stop is resolved, move on to the summary.
  useEffect(() => {
    if (!loading && total > 0 && !currentStop) {
      navigation.navigate('SessionSummary', sessionId ? { sessionId } : undefined);
    }
  }, [loading, total, currentStop, navigation, sessionId]);

  const distanceToCurrent = useMemo(() => {
    if (!coords || !currentStop) return null;
    return haversineKm(coords, { lat: Number(currentStop.lat), lng: Number(currentStop.lng) });
  }, [coords, currentStop]);

  const handleNavigate = () => {
    if (!currentStop) return;
    const url = `https://maps.google.com/?daddr=${currentStop.lat},${currentStop.lng}`;
    void Linking.openURL(url).catch(() => setError('Could not open maps.'));
  };

  const handleDelivered = async () => {
    if (!currentStop) return;
    setMarking(true);
    setError(null);
    try {
      await markDelivered(currentStop.id);
      await refresh();
      await captureLocation();
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setMarking(false);
    }
  };

  const submitFail = async (reason: string) => {
    if (!currentStop || !reason.trim()) return;
    setFailSheetOpen(false);
    setMarking(true);
    setError(null);
    try {
      await markFailed(currentStop.id, reason.trim());
      setOtherReason('');
      await refresh();
      await captureLocation();
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setMarking(false);
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
        <View style={styles.progressHeader}>
          <View style={styles.progressTopRow}>
            <Text style={styles.progressText}>
              {resolved} of {total} done
              {delivered !== resolved ? `  ·  ${delivered} delivered` : ''}
            </Text>
            <View style={styles.liveBadge}>
              <View style={[styles.liveDot, live ? styles.liveDotOn : styles.liveDotOff]} />
              <Text style={[styles.liveText, live ? styles.liveTextOn : styles.liveTextOff]}>
                {live ? 'Live' : 'Offline'}
              </Text>
            </View>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${Math.round(progress * 100)}%` }]} />
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.scroll}>
          {currentStop ? (
            <View style={styles.stopCard}>
              <Text style={styles.stopLabel}>CURRENT STOP</Text>
              <Text style={styles.stopName}>{currentStop.customerName}</Text>
              <Text style={styles.stopAddress}>{currentStop.addressRaw}</Text>
              <Text style={styles.stopRef}>Ref: {currentStop.packageRef}</Text>

              {distanceToCurrent !== null ? (
                <View style={styles.metaRow}>
                  <Text style={styles.metaChip}>{formatDistance(distanceToCurrent)} away</Text>
                  <Text style={styles.metaChip}>
                    ~{formatMinutes(estimateMinutes(distanceToCurrent))}
                  </Text>
                </View>
              ) : null}

              {currentStop.status === 'failed' ? (
                <Text style={styles.retryNote}>
                  Re-attempt · previously failed
                  {currentStop.failReason ? ` (${currentStop.failReason})` : ''}
                </Text>
              ) : null}
            </View>
          ) : (
            <Text style={styles.emptyText}>No more stops.</Text>
          )}

          {error ? <Text style={styles.error}>{error}</Text> : null}
        </ScrollView>

        {currentStop ? (
          <View style={styles.actions}>
            <PrimaryButton title="Navigate" variant="outline" onPress={handleNavigate} />
            <PrimaryButton title="Mark as Delivered" loading={marking} onPress={handleDelivered} />
            <Pressable
              style={styles.failButton}
              onPress={() => setFailSheetOpen(true)}
              disabled={marking}
            >
              <Text style={styles.failButtonText}>Mark as Failed</Text>
            </Pressable>
          </View>
        ) : null}
      </View>

      <Modal
        visible={failSheetOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setFailSheetOpen(false)}
      >
        <Pressable style={styles.sheetBackdrop} onPress={() => setFailSheetOpen(false)} />
        <View style={styles.sheet}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>Why did it fail?</Text>

          {FAIL_REASONS.map((reason) => (
            <Pressable
              key={reason}
              style={styles.reasonRow}
              onPress={() => void submitFail(reason)}
            >
              <Text style={styles.reasonText}>{reason}</Text>
            </Pressable>
          ))}

          <View style={styles.otherWrap}>
            <TextField
              label="Other"
              value={otherReason}
              onChangeText={setOtherReason}
              placeholder="Describe the reason"
              multiline
            />
            <PrimaryButton
              title="Submit Reason"
              onPress={() => void submitFail(otherReason)}
              disabled={!otherReason.trim()}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1, padding: spacing.md },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  progressHeader: { marginBottom: spacing.md },
  progressTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  progressText: { fontSize: 14, fontWeight: '600', color: colors.text },
  liveBadge: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  liveDot: { width: 8, height: 8, borderRadius: 4 },
  liveDotOn: { backgroundColor: colors.success },
  liveDotOff: { backgroundColor: colors.textMuted },
  liveText: { fontSize: 12, fontWeight: '600' },
  liveTextOn: { color: colors.success },
  liveTextOff: { color: colors.textMuted },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  progressFill: { height: 8, borderRadius: 4, backgroundColor: colors.primary },
  scroll: { flexGrow: 1, justifyContent: 'center' },
  stopCard: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  stopLabel: { fontSize: 12, fontWeight: '700', color: colors.primary, letterSpacing: 1 },
  stopName: { fontSize: 22, fontWeight: '700', color: colors.text, marginTop: spacing.sm },
  stopAddress: { fontSize: 15, color: colors.text, marginTop: spacing.xs },
  stopRef: { fontSize: 13, color: colors.textMuted, marginTop: spacing.sm },
  metaRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  metaChip: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    paddingVertical: 6,
    paddingHorizontal: spacing.sm,
    overflow: 'hidden',
  },
  retryNote: { marginTop: spacing.md, fontSize: 13, color: colors.error },
  emptyText: { fontSize: 16, color: colors.textMuted, textAlign: 'center' },
  error: { marginTop: spacing.md, fontSize: 13, color: colors.error, textAlign: 'center' },
  actions: { gap: spacing.sm, marginTop: spacing.md },
  failButton: { height: 52, alignItems: 'center', justifyContent: 'center' },
  failButtonText: { fontSize: 16, fontWeight: '600', color: colors.error },
  sheetBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: spacing.lg,
    paddingBottom: spacing.xl,
    gap: spacing.xs,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    marginBottom: spacing.md,
  },
  sheetTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: spacing.sm },
  reasonRow: {
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.surface,
  },
  reasonText: { fontSize: 16, color: colors.text },
  otherWrap: { marginTop: spacing.md, gap: spacing.md },
});
