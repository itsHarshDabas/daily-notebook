import { StyleSheet, View } from 'react-native';

import { Radius, TrackerColors, levelColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

// A fixed little contribution grid used as the app's mark.
const PATTERN = [
  [1, 2, 0, 3, 4, 2, 1],
  [2, 4, 3, 1, 0, 3, 4],
  [0, 3, 4, 4, 2, 1, 3],
  [3, 1, 2, 4, 4, 3, 2],
];

export function BrandMark({ size = 56 }: { size?: number }) {
  const theme = useTheme();
  const cell = (size - 10) / 7 - 2;
  return (
    <View style={[styles.mark, { width: size + 8, padding: 6, backgroundColor: theme.surface, borderColor: theme.border }]}>
      {PATTERN.map((row, r) => (
        <View key={r} style={styles.row}>
          {row.map((l, c) => (
            <View
              key={c}
              style={{ width: cell, height: cell, borderRadius: 2, backgroundColor: levelColor(TrackerColors.exercise, l, theme.gridEmpty) }}
            />
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  mark: { borderRadius: Radius.md, borderWidth: StyleSheet.hairlineWidth, gap: 2, alignItems: 'center' },
  row: { flexDirection: 'row', gap: 2 },
});
