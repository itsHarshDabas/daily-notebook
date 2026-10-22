import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import type { IsoDate } from '@daily-notebook/shared';

import { Banner, Button, ProgressRing, Text } from '@/components/ui';
import { Spacing, TrackerColors } from '@/constants/theme';
import { getDay, getTargets, saveDay } from '@/lib/data';

import { Section, useLoad } from './common';

const SIZES = [150, 250, 500];

export function WaterLog({ date }: { date: IsoDate }) {
  const color = TrackerColors.water;
  const { data, error, setError } = useLoad(async () => ({ day: await getDay(date), targets: await getTargets() }), [date]);
  const [ml, setMl] = useState(0);

  useEffect(() => {
    if (data) setMl(data.day?.water_ml ?? 0);
  }, [data]);

  // Saves on every tap so nothing is lost if the screen closes.
  async function change(delta: number) {
    const next = Math.max(0, ml + delta);
    setMl(next);
    try {
      await saveDay(date, { water_ml: next });
    } catch (e) {
      setError((e as Error).message);
    }
  }

  const target = data?.targets.waterMl ?? 2000;
  return (
    <>
      <Section title="Today's water">
        <View style={styles.center}>
          <ProgressRing progress={ml / target} size={180} stroke={14} color={color}>
            <Text variant="display">{(ml / 1000).toFixed(2)}</Text>
            <Text variant="caption" color="textSecondary">
              of {(target / 1000).toFixed(1)} L
            </Text>
          </ProgressRing>
          <Text color="textSecondary">{ml >= target ? 'Target reached. Well done!' : `${target - ml} ml to go`}</Text>
        </View>
        <View style={styles.row}>
          {SIZES.map((s) => (
            <View key={s} style={{ flex: 1 }}>
              <Button title={`+${s} ml`} variant={s === 250 ? 'primary' : 'secondary'} compact onPress={() => change(s)} disabled={!data} />
            </View>
          ))}
        </View>
        <Button title="Undo 250 ml" variant="ghost" compact icon="remove-circle-outline" onPress={() => change(-250)} disabled={!data || ml === 0} />
      </Section>
      <Banner text={error} />
    </>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', gap: Spacing.three, paddingVertical: Spacing.two },
  row: { flexDirection: 'row', gap: Spacing.two },
});
