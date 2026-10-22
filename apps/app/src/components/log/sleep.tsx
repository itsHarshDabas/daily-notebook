import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { sleepHours, type IsoDate } from '@daily-notebook/shared';

import { Banner, Button, Field, Text } from '@/components/ui';
import { TrackerColors } from '@/constants/theme';
import { getDay, saveDay } from '@/lib/data';

import { ChipRow, Section, styles, useLoad } from './common';

const QUALITY = [
  { value: 1, label: 'Very poor' },
  { value: 2, label: 'Poor' },
  { value: 3, label: 'Okay' },
  { value: 4, label: 'Good' },
  { value: 5, label: 'Great' },
];

function formatClock(t: string): string {
  // Accept "2330" or "23.30" as well as "23:30".
  const d = t.replace(/[^\d]/g, '').slice(0, 4);
  return d.length > 2 ? `${d.slice(0, d.length - 2)}:${d.slice(-2)}` : d;
}

export function SleepLog({ date, onDone }: { date: IsoDate; onDone: () => void }) {
  const color = TrackerColors.sleep;
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
    if (hours == null) return setError('Enter bedtime and wake time as 24-hour times, like 23:30 and 07:00.');
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
          <View style={{ flex: 1 }}>
            <Field label="Went to bed" value={bed} onChangeText={(t) => setBed(formatClock(t))} placeholder="23:30" keyboardType="number-pad" maxLength={5} />
          </View>
          <View style={{ flex: 1 }}>
            <Field label="Woke up" value={wake} onChangeText={(t) => setWake(formatClock(t))} placeholder="07:00" keyboardType="number-pad" maxLength={5} />
          </View>
        </View>
        <View style={styles.big}>
          <Text variant="display" tint={hours != null ? color : undefined} color="textTertiary">
            {hours ?? '–'}
          </Text>
          <Text color="textSecondary">hours asleep</Text>
        </View>
      </Section>
      <Section title="Sleep quality">
        <ChipRow options={QUALITY} value={quality} onChange={setQuality} color={color} />
      </Section>
      <Banner text={error} />
      <Button title="Save" icon="checkmark" onPress={save} busy={busy} disabled={!loaded} />
    </>
  );
}
