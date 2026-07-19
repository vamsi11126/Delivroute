import React, { useCallback, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Swipeable } from 'react-native-gesture-handler';
import type { StackScreenProps } from '@react-navigation/stack';
import { useFocusEffect } from '@react-navigation/native';
import { TextField } from '../../components/TextField';
import { AddressAutocomplete } from '../../components/AddressAutocomplete';
import { PrimaryButton } from '../../components/PrimaryButton';
import {
  addPackages,
  deletePackage,
  optimizeRoute,
  type PackageInput,
} from '../../api/session';
import type { AddressResult } from '../../services/autocomplete.service';
import { getApiErrorMessage } from '../../api/errors';
import * as gpsService from '../../services/gps.service';
import { useSessionStore } from '../../store/sessionStore';
import { usePermissionStore } from '../../store/permissionStore';
import { colors, radius, spacing } from '../../theme';
import type { HomeStackParamList } from '../../navigation/AppTabs';

type Props = StackScreenProps<HomeStackParamList, 'PackageEntry'>;

/**
 * A row in the entry list. `id` is set once the row has been persisted to the
 * DB — a previous partial-success add creates some packages server-side, so
 * removing such a row must also delete it via the API, and it must not be
 * re-sent on the next Optimize tap.
 */
type DraftPackage = PackageInput & { id?: string };

export function PackageEntryScreen({ navigation, route }: Props): React.JSX.Element {
  const { sessionId } = route.params;
  const startSession = useSessionStore((s) => s.startSession);
  const syncLocationPermission = usePermissionStore((s) => s.syncLocationPermission);
  const ensureLocationPermission = usePermissionStore((s) => s.ensureLocationPermission);

  // Keep the cached permission flag in step with OS Settings whenever this
  // screen is focused, so a permission granted outside the app is reflected
  // before the user taps Optimize Route (and the warning banner clears).
  useFocusEffect(
    useCallback(() => {
      void syncLocationPermission();
    }, [syncLocationPermission]),
  );

  const [packages, setPackages] = useState<DraftPackage[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [address, setAddress] = useState('');
  // The AddressResult picked from the autocomplete dropdown, carrying lat/lng.
  // Cleared whenever the address text is edited, so a stale coordinate can
  // never be attached to a hand-modified address.
  const [selectedAddress, setSelectedAddress] = useState<AddressResult | null>(null);
  // Set when the boy explicitly chose "Use address as typed" — the package is
  // sent without coordinates and the server geocodes it. Cleared on edit.
  const [useTypedAddress, setUseTypedAddress] = useState(false);
  const [packageRef, setPackageRef] = useState('');
  const [optimizing, setOptimizing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAddressChange = (text: string) => {
    setAddress(text);
    setError(null);
    // Any manual edit invalidates the previous selection — the coordinates no
    // longer match the text (selecting a suggestion re-sets this right after).
    if (selectedAddress && text !== selectedAddress.displayName) {
      setSelectedAddress(null);
    }
    setUseTypedAddress(false);
  };

  const handleAddressSelect = (result: AddressResult) => {
    setSelectedAddress(result);
    setUseTypedAddress(false);
    setError(null);
  };

  const handleUseTypedAddress = (text: string) => {
    setAddress(text);
    setSelectedAddress(null);
    setUseTypedAddress(true);
    setError(null);
  };

  const handleAdd = () => {
    if (!customerName.trim() || !address.trim() || !packageRef.trim()) {
      setError('All fields are required');
      return;
    }
    if (!selectedAddress && !useTypedAddress) {
      setError('Please select an address from the suggestions');
      return;
    }
    setPackages((prev) => [
      ...prev,
      {
        customerName: customerName.trim(),
        address: selectedAddress ? selectedAddress.displayName : address.trim(),
        packageRef: packageRef.trim(),
        // Typed addresses carry no coordinates — the server geocodes them.
        lat: selectedAddress?.lat,
        lng: selectedAddress?.lng,
      },
    ]);
    setCustomerName('');
    setAddress('');
    setSelectedAddress(null);
    setUseTypedAddress(false);
    setPackageRef('');
    setError(null);
  };

  const handleRemove = (index: number) => {
    const target = packages[index];
    setPackages((prev) => prev.filter((_, i) => i !== index));
    // If this row was already saved to the DB by an earlier partial-success add,
    // delete it there too so it doesn't linger in the session's queue.
    if (target?.id) {
      void deletePackage(target.id).catch((err) => {
        // Restore the row so a failed delete doesn't silently orphan it server-side.
        setPackages((prev) => [...prev, target]);
        setError(getApiErrorMessage(err));
      });
    }
  };

  const handleOptimize = async () => {
    if (packages.length === 0) {
      setError('Add at least one package');
      return;
    }

    setOptimizing(true);
    setError(null);
    try {
      // Only send rows that aren't already in the DB. A previous attempt may
      // have persisted some (partial success) — those carry an `id`, and
      // re-sending them would create duplicates.
      const unsaved = packages.filter((p) => !p.id);
      if (unsaved.length > 0) {
        // Coordinates come from the autocomplete selection, so the server can
        // skip geocoding entirely. Tag the rows that landed with their DB id so
        // they aren't re-sent and a later removal deletes them server-side too.
        const { created, failed } = await addPackages(
          sessionId,
          unsaved.map((p) => ({
            packageRef: p.packageRef,
            customerName: p.customerName,
            address: p.address,
            lat: p.lat,
            lng: p.lng,
          })),
        );

        if (created.length > 0) {
          const idByRef = new Map(created.map((c) => [c.packageRef, c.id]));
          setPackages((prev) =>
            prev.map((p) => {
              const newId = idByRef.get(p.packageRef);
              return newId && !p.id ? { ...p, id: newId } : p;
            }),
          );
        }

        // Surface geocode failures so the boy can fix them. Successful rows stay
        // in the list (now tagged), so nothing the boy entered is silently lost.
        if (failed.length > 0) {
          const label = failed.length > 1 ? 'addresses' : 'address';
          setError(
            `Couldn't locate ${failed.length} ${label}. Fix and add again:\n` +
              failed.map((f) => `• ${f.packageRef}: ${f.address}`).join('\n'),
          );
          setOptimizing(false);
          return;
        }
      }

      // Check the live OS permission at tap time (and request it if a cached
      // "denied" is stale) instead of trusting onboarding state — the user may
      // have enabled location in Settings after skipping it.
      const granted = await ensureLocationPermission();
      if (!granted) {
        setError(
          'Location permission is required to optimize your route. Enable it in Settings and try again.',
        );
        setOptimizing(false);
        return;
      }
      const location = await gpsService.getCurrentLocation();
      const session = await optimizeRoute(
        sessionId,
        location.coords.latitude,
        location.coords.longitude,
      );
      startSession(session, session.packages);
      navigation.navigate('RoutePreview', { sessionId });
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setOptimizing(false);
    }
  };

  const renderDeleteAction = (index: number) => (
    <Pressable style={styles.swipeDelete} onPress={() => handleRemove(index)}>
      <Text style={styles.swipeDeleteText}>Delete</Text>
    </Pressable>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.container}>
          <View style={styles.form}>
            <TextField
              label="Customer Name"
              value={customerName}
              onChangeText={(t) => {
                setCustomerName(t);
                setError(null);
              }}
              placeholder="John Doe"
              autoCapitalize="words"
            />

            <AddressAutocomplete
              label="Address"
              value={address}
              onChangeText={handleAddressChange}
              onSelect={handleAddressSelect}
              onUseTyped={handleUseTypedAddress}
              placeholder="123 Main St, City"
            />

            <TextField
              label="Package Reference"
              value={packageRef}
              onChangeText={(t) => {
                setPackageRef(t);
                setError(null);
              }}
              placeholder="PKG-001"
              autoCapitalize="characters"
            />
            <PrimaryButton title="Add Package" onPress={handleAdd} variant="outline" />
            {error ? <Text style={styles.error}>{error}</Text> : null}
          </View>

          <View style={styles.listWrap}>
            <Text style={styles.listTitle}>Packages ({packages.length})</Text>
            <FlatList
              data={packages}
              keyExtractor={(_, i) => i.toString()}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item, index }) => (
                <Swipeable
                  renderRightActions={() => renderDeleteAction(index)}
                  overshootRight={false}
                >
                  <View style={styles.packageCard}>
                    <View style={styles.packageInfo}>
                      <Text style={styles.packageName}>{item.customerName}</Text>
                      <Text style={styles.packageAddress} numberOfLines={1}>
                        {item.address}
                      </Text>
                    </View>
                    <Pressable onPress={() => handleRemove(index)} hitSlop={8}>
                      <Text style={styles.removeBtn}>✕</Text>
                    </Pressable>
                  </View>
                </Swipeable>
              )}
              ListEmptyComponent={<Text style={styles.emptyText}>No packages added yet</Text>}
              contentContainerStyle={styles.listContent}
            />
          </View>

          <PrimaryButton
            title={optimizing ? 'Optimizing your route…' : 'Optimize Route'}
            loading={optimizing}
            onPress={handleOptimize}
            disabled={packages.length === 0}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  container: { flex: 1, padding: spacing.md },
  form: { gap: spacing.md },
  listWrap: { flex: 1, marginTop: spacing.lg },
  listTitle: { fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: spacing.sm },
  listContent: { gap: spacing.sm, paddingBottom: spacing.sm },
  packageCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  packageInfo: { flex: 1 },
  packageName: { fontSize: 15, fontWeight: '600', color: colors.text },
  packageAddress: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  removeBtn: { fontSize: 20, color: colors.error, fontWeight: '600' },
  swipeDelete: {
    backgroundColor: colors.error,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    marginLeft: spacing.sm,
  },
  swipeDeleteText: { color: colors.white, fontWeight: '700', fontSize: 14 },
  emptyText: { fontSize: 14, color: colors.textMuted, textAlign: 'center', marginTop: spacing.lg },
  error: { fontSize: 13, color: colors.error },
});
