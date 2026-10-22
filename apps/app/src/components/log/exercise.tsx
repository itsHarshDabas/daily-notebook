import { useState } from 'react';

import type { IsoDate } from '@daily-notebook/shared';

import { Banner, Button, Empty, Field, ListRow, Text } from '@/components/ui';
import { TrackerColors } from '@/constants/theme';
import type { IconName } from '@/constants/trackers';
import { addExercise, deleteExercise, listExercises } from '@/lib/data';

import { ChipRow, Section, useLoad } from './common';

const TYPES: { value: string; label: string; icon: IconName }[] = [
  { value: 'Walk', label: 'Walk', icon: 'walk-outline' },
  { value: 'Run', label: 'Run', icon: 'speedometer-outline' },
  { value: 'Gym', label: 'Gym', icon: 'barbell-outline' },
  { value: 'Yoga', label: 'Yoga', icon: 'body-outline' },
  { value: 'Cycling', label: 'Cycling', icon: 'bicycle-outline' },
  { value: 'Sports', label: 'Sports', icon: 'football-outline' },
  { value: 'Other', label: 'Other', icon: 'fitness-outline' },
];
const ICON = Object.fromEntries(TYPES.map((t) => [t.value, t.icon])) as Record<string, IconName>;

export function ExerciseLog({ date }: { date: IsoDate }) {
  const color = TrackerColors.exercise;
  const { data, error, reload, setError } = useLoad(() => listExercises(date), [date]);
  const [type, setType] = useState<string | null>('Walk');
  const [minutes, setMinutes] = useState('');
  const [busy, setBusy] = useState(false);
  const total = (data ?? []).reduce((s, e) => s + e.minutes, 0);

  async function add() {
    const m = Number(minutes);
    if (!type || !Number.isInteger(m) || m <= 0) return setError('Pick an activity and enter the minutes.');
    setBusy(true);
    setError(null);
    try {
      await addExercise(date, { type, minutes: m });
      setMinutes('');
      reload();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Section title="Activity" right={<Text variant="heading" tint={color}>{total} min</Text>}>
        {(data ?? []).map((e) => (
          <ListRow
            key={e.id}
            icon={ICON[e.type] ?? 'fitness-outline'}
            color={color}
            title={e.type}
            right={`${e.minutes} min`}
            onDelete={() => deleteExercise(date, e.id).then(reload, (x: Error) => setError(x.message))}
          />
        ))}
        {data?.length === 0 ? <Empty icon="barbell-outline" text="No activity logged yet." /> : null}
      </Section>
      <Section title="Add activity">
        <ChipRow options={TYPES} value={type} onChange={setType} color={color} />
        <Field label="Minutes" value={minutes} onChangeText={(t) => setMinutes(t.replace(/\D/g, ''))} placeholder="30" keyboardType="number-pad" maxLength={4} />
        <Banner text={error} />
        <Button title="Add activity" icon="add" onPress={add} busy={busy} />
      </Section>
    </>
  );
}
