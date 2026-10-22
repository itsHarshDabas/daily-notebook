import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Chip } from '@/components/form';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <ThemedText type="smallBold">{title}</ThemedText>
      {children}
    </View>
  );
}

export function ChipRow<T extends string | number>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T | null;
  onChange: (v: T | null) => void;
}) {
  return (
    <View style={styles.chips}>
      {options.map((o) => (
        // Tapping the selected chip again clears it.
        <Chip key={String(o.value)} label={o.label} selected={value === o.value} onPress={() => onChange(value === o.value ? null : o.value)} />
      ))}
    </View>
  );
}

export function Row({ title, detail, onDelete }: { title: string; detail?: string; onDelete?: () => void }) {
  return (
    <ThemedView type="backgroundElement" style={styles.row}>
      <View style={{ flex: 1 }}>
        <ThemedText>{title}</ThemedText>
        {detail ? (
          <ThemedText type="small" themeColor="textSecondary">
            {detail}
          </ThemedText>
        ) : null}
      </View>
      {onDelete ? (
        <Pressable onPress={onDelete} accessibilityRole="button" accessibilityLabel={`Delete ${title}`} hitSlop={8}>
          <ThemedText type="small" themeColor="textSecondary">
            Delete
          </ThemedText>
        </Pressable>
      ) : null}
    </ThemedView>
  );
}

export function ProgressBar({ value, max, color = '#40c463' }: { value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.min(1, value / max) : 0;
  return (
    <ThemedView type="backgroundElement" style={styles.bar}>
      <View style={[styles.fill, { width: `${pct * 100}%`, backgroundColor: color }]} />
    </ThemedView>
  );
}

/** Loads data once and exposes a reload; errors surface as a message instead of crashing the screen. */
export function useLoad<T>(load: () => Promise<T>, deps: unknown[]) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const run = useCallback(load, deps);
  const reload = useCallback(() => {
    run()
      .then((d) => {
        setData(d);
        setLoaded(true);
        setError(null);
      })
      .catch((e: Error) => setError(e.message));
  }, [run]);
  useEffect(reload, [reload]);
  return { data, loaded, error, reload, setError };
}

export const styles = StyleSheet.create({
  section: { gap: Spacing.two },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  row: { flexDirection: 'row', alignItems: 'center', padding: Spacing.three, borderRadius: Spacing.three, gap: Spacing.three },
  bar: { height: 12, borderRadius: 6, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 6 },
  inline: { flexDirection: 'row', gap: Spacing.two, alignItems: 'center' },
});
