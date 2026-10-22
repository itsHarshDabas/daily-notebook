import { useEffect, useState } from 'react';

import { sleepHours, type IsoDate } from '@daily-notebook/shared';

import { Button, ErrorText, Field } from '@/components/form';
import { ThemedText } from '@/components/themed-text';
import { getDay, saveDay } from '@/lib/data';
import { View } from 'react-native';

import { ChipRow, Section, styles, useLoad } from './common';

const QUALITY = [
  { value: 1, label: 'Very poor' },
  { value: 2, label: 'Poor' },
  { value: 3, label: 'Okay' },
  { value: 4, label: 'Good' },
  { value: 5, label: 'Great' },
];

export function SleepLog({ date, onDone }: { date: IsoDate; onDone: () => void }) {
  const { data, loaded, error, setError } = useLoad(() => getDay(date), [date]);
  const [bed, setBed] = useState('');
  const [wake, setWake] = useState('');
  const [quality, setQuality] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setBed(data?.sleep_bed?.slice(0, 5) ?? '');
    setWake(data?.sleep_wake?.slice(0, 5) ?? '');
    setQuality(data?.sleep_quality ?? null);
  }, [data]);

  const hours = sleepHours(bed, wake);

  async function save() {
    if (hours == null) return setError('Enter bedtime and wake time as HH:MM, for example 23:30 and 07:00.');
    setBusy(true);
    try {
      await saveDay(date, { sleep_bed: bed, sleep_wake: wake, sleep_hours: hours, sleep_quality: quality });
      onDone();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Section title="Last night">
        <View style={styles.inline}>
          <View style={{ flex: 1, gap: 4 }}>
            <ThemedText type="small" themeColor="textSecondary">Bedtime</ThemedText>
            <Field value={bed} onChangeText={setBed} placeholder="23:30" keyboardType="numbers-and-punctuation" maxLength={5} />
          </View>
          <View style={{ flex: 1, gap: 4 }}>
            <ThemedText type="small" themeColor="textSecondary">Woke up</ThemedText>
            <Field value={wake} onChangeText={setWake} placeholder="07:00" keyboardType="numbers-and-punctuation" maxLength={5} />
          </View>
        </View>
        {hours != null ? <ThemedText>{hours} hours</ThemedText> : null}
      </Section>
      <Section title="Sleep quality">
        <ChipRow options={QUALITY} value={quality} onChange={setQuality} />
      </Section>
      <ErrorText>{error}</ErrorText>
      <Button title="Save" onPress={save} busy={busy} disabled={!loaded} />
    </>
  );
}
