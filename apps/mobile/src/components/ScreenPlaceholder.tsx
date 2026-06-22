import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface ScreenPlaceholderProps {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
}

/**
 * Shared scaffold for the placeholder screens built in this prompt. Real UI is
 * filled in by later prompts (mobile auth + delivery screens).
 */
export function ScreenPlaceholder({
  title,
  subtitle,
  children,
}: ScreenPlaceholderProps): React.JSX.Element {
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.container}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        <View style={styles.actions}>{children}</View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#fff' },
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  title: { fontSize: 22, fontWeight: '700', color: '#111', textAlign: 'center' },
  subtitle: { marginTop: 8, fontSize: 14, color: '#666', textAlign: 'center' },
  actions: { marginTop: 24, width: '100%', gap: 12 },
});
