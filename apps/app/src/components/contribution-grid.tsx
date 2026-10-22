import { useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View, type ScrollViewInstance } from 'react-native';
import Svg, { Rect, Text as SvgText } from 'react-native-svg';

import { buildGrid, type IsoDate, type Shade } from '@daily-notebook/shared';

import { Text } from '@/components/ui';
import { Fonts, levelColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const GAP = 3;
const TOP = 18;
const LEFT = 28;

export interface ContributionGridProps {
  end: Date;
  shade: (date: IsoDate) => Shade;
  color: string;
  overColor?: string;
  selected?: IsoDate | null;
  onPressDay?: (date: IsoDate) => void;
  weeks?: number;
}

export function ContributionGrid({ end, shade, color, overColor, selected, onPressDay, weeks = 53 }: ContributionGridProps) {
  const theme = useTheme();
  const scroll = useRef<ScrollViewInstance>(null);
  const [width, setWidth] = useState(0);
  const cells = useMemo(() => buildGrid(end, weeks), [end, weeks]);
  // Fill the available width on large screens; keep cells tappable on phones and scroll instead.
  const cell = width ? Math.max(11, Math.min(16, (width - LEFT) / weeks - GAP)) : 12;
  const step = cell + GAP;
  const w = LEFT + weeks * step;
  const h = TOP + 7 * step;
  const today = cells.at(-1)?.date;

  const months = useMemo(() => {
    const out: { week: number; text: string }[] = [];
    let last = -1;
    for (const c of cells) {
      if (c.weekday !== 0) continue;
      const d = new Date(c.date + 'T00:00:00');
      if (d.getMonth() !== last) {
        out.push({ week: c.week, text: d.toLocaleDateString(undefined, { month: 'short' }) });
        last = d.getMonth();
      }
    }
    return out.filter((m, i) => i === 0 || m.week - out[i - 1].week >= 3);
  }, [cells]);

  return (
    <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      <ScrollView
        ref={scroll}
        horizontal
        showsHorizontalScrollIndicator={false}
        onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: false })}>
        <Svg width={w} height={h} accessibilityLabel="Contribution grid">
          {months.map((m) => (
            <SvgText key={m.week} x={LEFT + m.week * step} y={11} fontSize={10} fontFamily={Fonts.medium} fill={theme.textTertiary}>
              {m.text}
            </SvgText>
          ))}
          {['Mon', 'Wed', 'Fri'].map((d, i) => (
            <SvgText key={d} x={0} y={TOP + (1 + i * 2) * step + cell - 2} fontSize={9} fontFamily={Fonts.medium} fill={theme.textTertiary}>
              {d}
            </SvgText>
          ))}
          {cells.map((c) => {
            const s = shade(c.date);
            const fill = s.over && overColor ? overColor : levelColor(color, s.level, theme.gridEmpty);
            const isSel = selected === c.date;
            return (
              <Rect
                key={c.date}
                x={LEFT + c.week * step}
                y={TOP + c.weekday * step}
                width={cell}
                height={cell}
                rx={cell * 0.22}
                fill={fill}
                stroke={isSel ? theme.text : c.date === today ? theme.textTertiary : 'none'}
                strokeWidth={isSel ? 1.5 : 1}
                onPress={onPressDay ? () => onPressDay(c.date) : undefined}
              />
            );
          })}
        </Svg>
      </ScrollView>
      <View style={styles.legend}>
        <Text variant="caption" color="textTertiary">
          Less
        </Text>
        {[0, 1, 2, 3, 4].map((l) => (
          <View key={l} style={[styles.legendCell, { backgroundColor: levelColor(color, l, theme.gridEmpty) }]} />
        ))}
        <Text variant="caption" color="textTertiary">
          More
        </Text>
        {overColor ? (
          <>
            <View style={[styles.legendCell, { backgroundColor: overColor, marginLeft: 10 }]} />
            <Text variant="caption" color="textTertiary">
              Over target
            </Text>
          </>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  legend: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 4, marginTop: 8 },
  legendCell: { width: 11, height: 11, borderRadius: 3 },
});
