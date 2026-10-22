import { useEffect, useState } from 'react';

import type { IsoDate } from '@daily-notebook/shared';

import { Button, ErrorText } from '@/components/form';
import { ThemedText } from '@/components/themed-text';
import { getDay, getTargets, saveDay } from '@/lib/data';
import { View } from 'react-native';

import { ProgressBar, Section, styles, useLoad } from './common';

const GLASS_ML = 250;

export function WaterLog({ date }: { date: IsoDate }) {
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
      <Section title="Water">
        <ThemedText type="subtitle">
          {ml} / {target} ml
        </ThemedText>
        <ThemedText themeColor="textSecondary">{Math.round(ml / GLASS_ML)} glasses</ThemedText>
        <ProgressBar value={ml} max={target} color="#4aa3ff" />
      </Section>
      <View style={styles.inline}>
        <View style={{ flex: 1 }}>
          <Button title="− Glass" variant="plain" onPress={() => change(-GLASS_ML)} disabled={!data || ml === 0} />
        </View>
        <View style={{ flex: 2 }}>
          <Button title="+ Glass (250 ml)" onPress={() => change(GLASS_ML)} disabled={!data} />
        </View>
      </View>
      <ErrorText>{error}</ErrorText>
    </>
  );
}
