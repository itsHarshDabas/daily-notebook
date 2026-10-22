import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { Card, Chip, ChipGroup, Text } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import type { IconName } from '@/constants/trackers';

export function Section({ title, children, right }: { title: string; children: ReactNode; right?: ReactNode }) {
  return (
    <Card style={styles.section}>
      <View style={styles.sectionHead}>
        <Text variant="heading" style={{ flex: 1 }}>
          {title}
        </Text>
        {right}
      </View>
      {children}
    </Card>
  );
}

export function ChipRow<T extends string | number>({
  options,
  value,
  onChange,
  color,
}: {
  options: { value: T; label: string; icon?: IconName }[];
  value: T | null;
  onChange: (v: T | null) => void;
  color?: string;
}) {
  return (
    <ChipGroup>
      {options.map((o) => (
        // Tapping the selected chip again clears it.
        <Chip
          key={String(o.value)}
          label={o.label}
          icon={o.icon}
          color={color}
          selected={value === o.value}
          onPress={() => onChange(value === o.value ? null : o.value)}
        />
      ))}
    </ChipGroup>
  );
}

/** Loads data for a screen and exposes a reload; errors surface as a message instead of crashing. */
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
  section: { gap: Spacing.three },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  inline: { flexDirection: 'row', gap: Spacing.two, alignItems: 'flex-end' },
  big: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
});
