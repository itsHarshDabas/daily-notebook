import { useMemo, useRef, useState } from 'react';
import { PanResponder, StyleSheet, View } from 'react-native';
import Svg, { Polygon } from 'react-native-svg';

import { bounds, buildGrid, skylineFaces, type IsoDate, type Shade } from '@daily-notebook/shared';

import { Text } from '@/components/ui';
import { mix } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export interface SkylineProps {
  end: Date;
  value: (date: IsoDate) => number;
  shade: (date: IsoDate) => Shade;
  color: string;
  overColor?: string;
  weeks?: number;
}

/**
 * The year as a 3D city: one tower per day, height = that day's value.
 * Drawn as isometric SVG so it works the same on phones and the web; drag sideways to rotate.
 */
export function Skyline({ end, value, shade, color, overColor, weeks = 53 }: SkylineProps) {
  const theme = useTheme();
  const [angle, setAngle] = useState(-28);
  const [width, setWidth] = useState(320);
  const start = useRef(angle);
  const angleRef = useRef(angle);
  angleRef.current = angle;
  const pan = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 4 && Math.abs(g.dx) > Math.abs(g.dy),
        onPanResponderGrant: () => {
          start.current = angleRef.current;
        },
        onPanResponderMove: (_, g) => setAngle(start.current + g.dx * 0.4),
      }),
    [],
  );

  const cells = useMemo(() => buildGrid(end, weeks), [end, weeks]);
  const max = useMemo(() => Math.max(1, ...cells.map((c) => value(c.date))), [cells, value]);

  const faces = useMemo(() => {
    const bars = cells.map((c) => ({ key: c.date, week: c.week, weekday: c.weekday, height: value(c.date) / max }));
    return skylineFaces(bars, { angle, tilt: 58, cell: 10, maxHeight: 70 });
  }, [cells, value, max, angle]);
  const b = bounds(faces);
  const pad = 6;
  const height = Math.min(360, (width * (b.height + pad * 2)) / (b.width + pad * 2));

  const fills = useMemo(() => {
    const map = new Map<string, { top: string; left: string; right: string }>();
    for (const c of cells) {
      const s = shade(c.date);
      const base = s.level === 0 ? theme.gridEmpty : s.over && overColor ? overColor : mix(theme.gridEmpty, color, 0.35 + s.level * 0.16);
      map.set(c.date, { top: base, left: mix(base, '#000000', 0.22), right: mix(base, '#000000', 0.38) });
    }
    return map;
  }, [cells, shade, color, overColor, theme.gridEmpty]);

  return (
    <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)} {...pan.panHandlers}>
      <Svg width="100%" height={height} viewBox={`${b.minX - pad} ${b.minY - pad} ${b.width + pad * 2} ${b.height + pad * 2}`}>
        {faces.map((f) => {
          const date = f.key.slice(0, 10);
          const fill = fills.get(date)!;
          return (
            <Polygon
              key={f.key}
              points={f.points.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ')}
              fill={fill[f.side]}
              stroke={f.side === 'top' ? mix(fill.top, '#000000', 0.08) : 'none'}
              strokeWidth={0.3}
            />
          );
        })}
      </Svg>
      <View style={styles.hint}>
        <Text variant="caption" color="textTertiary">
          Drag sideways to rotate · taller = more
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hint: { alignItems: 'center', marginTop: 6 },
});
