import { useState } from 'react';
import { View } from 'react-native';

import type { IsoDate } from '@daily-notebook/shared';

import { Button, ErrorText, Field } from '@/components/form';
import { ThemedText } from '@/components/themed-text';
import { addExercise, deleteExercise, listExercises } from '@/lib/data';

import { ChipRow, Row, Section, useLoad } from './common';

const TYPES = ['Walk', 'Run', 'Gym', 'Yoga', 'Cycling', 'Sports', 'Other'].map((t) => ({ value: t, label: t }));

export function ExerciseLog({ date }: { date: IsoDate }) {
  const { data, error, reload, setError } = useLoad(() => listExercises(date), [date]);
  const [type, setType] = useState<string | null>('Walk');
  const [minutes, setMinutes] = useState('');
  const [busy, setBusy] = useState(false);
  const total = (data ?? []).reduce((s, e) => s + e.minutes, 0);

  async function add() {
    const m = Number(minutes);
    if (!type || !Number.isInteger(m) || m <= 0) return setError('Pick an activity and enter whole minutes.');
    setBusy(true);
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
      <Section title={`Today: ${total} minutes`}>
        {(data ?? []).map((e) => (
          <Row key={e.id} title={e.type} detail={`${e.minutes} min`} onDelete={() => deleteExercise(e.id).then(reload, (x: Error) => setError(x.message))} />
        ))}
        {data?.length === 0 ? <ThemedText themeColor="textSecondary">Nothing logged yet.</ThemedText> : null}
      </Section>
      <Section title="Add activity">
        <ChipRow options={TYPES} value={type} onChange={setType} />
        <View>
          <Field value={minutes} onChangeText={(t) => setMinutes(t.replace(/\D/g, ''))} placeholder="Minutes" keyboardType="number-pad" />
        </View>
        <ErrorText>{error}</ErrorText>
        <Button title="Add" onPress={add} busy={busy} />
      </Section>
    </>
  );
}
