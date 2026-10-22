import { useMemo, useRef } from 'react';
import { ScrollView, StyleSheet, View, type ScrollViewInstance } from 'react-native';
import Svg, { Rect, Text as SvgText } from 'react-native-svg';

import { buildGrid, type IsoDate, type Level } from '@daily-notebook/shared';

import { useTheme } from '@/hooks/use-theme';

const CELL = 12;
const GAP = 3;
const TOP = 16;
const LEFT = 26;
const FONT = 'system-ui, -apple-system, Roboto, sans-serif';
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Light-to-dark green ramp like GitHub's; index = level. Level 0 uses the theme's empty colour. */
const RAMP = ['', '#9be9a8', '#40c463', '#30a14e', '#216e39'];
const RAMP_DARK = ['', '#0e4429', '#006d32', '#26a641', '#39d353'];

export interface ContributionGridProps {
  end: Date;
  levelFor: (date: IsoDate) => Level;
  /** Optional per-day colour override, e.g. calories over target. */
  colorFor?: (date: IsoDate) => string | undefined;
  onPressDay?: (date: IsoDate) => void;
  weeks?: number;
}

export function ContributionGrid({ end, levelFor, colorFor, onPressDay, weeks = 53 }: ContributionGridProps) {
  const theme = useTheme();
  const scroll = useRef<ScrollViewInstance>(null);
  const dark = theme.background === '#000000';
  const cells = useMemo(() => buildGrid(end, weeks), [end, weeks]);
  const width = LEFT + weeks * (CELL + GAP);
  const height = TOP + 7 * (CELL + GAP);

  const monthLabels = useMemo(() => {
    const labels: { week: number; text: string }[] = [];
    let last = -1;
    for (const c of cells) {
      if (c.weekday !== 0) continue;
      const m = Number(c.date.slice(5, 7)) - 1;
      if (m !== last) {
        labels.push({ week: c.week, text: MONTHS[m] });
        last = m;
      }
    }
    return labels;
  }, [cells]);

  return (
    // Start scrolled to the newest week, like GitHub.
    <ScrollView
      ref={scroll}
      horizontal
      showsHorizontalScrollIndicator={false}
      onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: false })}>
      <View style={styles.wrap}>
        <Svg width={width} height={height} accessibilityLabel="Contribution grid">
          {monthLabels.map((m) => (
            <SvgText key={`${m.week}`} x={LEFT + m.week * (CELL + GAP)} y={10} fontSize={10} fontFamily={FONT} fill={theme.textSecondary}>
              {m.text}
            </SvgText>
          ))}
          {['Mon', 'Wed', 'Fri'].map((d, i) => (
            <SvgText key={d} x={0} y={TOP + (1 + i * 2) * (CELL + GAP) + CELL - 2} fontSize={9} fontFamily={FONT} fill={theme.textSecondary}>
              {d}
            </SvgText>
          ))}
          {cells.map((c) => {
            const level = levelFor(c.date);
            const fill = colorFor?.(c.date) ?? (level === 0 ? theme.backgroundElement : (dark ? RAMP_DARK : RAMP)[level]);
            return (
              <Rect
                key={c.date}
                x={LEFT + c.week * (CELL + GAP)}
                y={TOP + c.weekday * (CELL + GAP)}
                width={CELL}
                height={CELL}
                rx={2}
                fill={fill}
                onPress={onPressDay ? () => onPressDay(c.date) : undefined}
              />
            );
          })}
        </Svg>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingVertical: 4 },
});
