import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { predictNextStart, type IsoDate, type PeriodFlow } from '@daily-notebook/shared';

import { Button, Chip, ErrorText, Field } from '@/components/form';
import { ThemedText } from '@/components/themed-text';
import { endCycle, getDay, getNote, listCycles, saveDay, saveNote, startCycle } from '@/lib/data';

import { ChipRow, Section, styles, useLoad } from './common';

const FLOWS: { value: PeriodFlow; label: string }[] = [
  { value: 'light', label: 'Light' },
  { value: 'medium', label: 'Medium' },
  { value: 'heavy', label: 'Heavy' },
];
const SYMPTOMS = ['Cramps', 'Headache', 'Bloating', 'Mood swings', 'Fatigue', 'Back pain', 'Acne'];

export function PeriodLog({ date, onDone }: { date: IsoDate; onDone: () => void }) {
  const { data, loaded, error, reload, setError } = useLoad(
    async () => ({ day: await getDay(date), cycles: await listCycles(), note: await getNote(date, 'period').catch(() => '') }),
    [date],
  );
  const [flow, setFlow] = useState<PeriodFlow | null>(null);
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!data) return;
    setFlow(data.day?.period_flow ?? null);
    setSymptoms(data.day?.period_symptoms ?? []);
    setNote(data.note);
  }, [data]);

  const cycles = data?.cycles ?? [];
  const open = cycles.find((c) => c.end_date == null && c.start_date <= date);
  const next = predictNextStart(cycles.map((c) => ({ startDate: c.start_date })));

  async function run(fn: () => Promise<void>, close = false) {
    setBusy(true);
    setError(null);
    try {
      await fn();
      if (close) onDone();
      else reload();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (!loaded) return <ErrorText>{error}</ErrorText>;

  return (
    <>
      <Section title="Cycle">
        <ThemedText themeColor="textSecondary">
          {open ? `Period started ${open.start_date}.` : 'No period in progress.'}{' '}
          {next ? `Next period predicted around ${next}.` : 'Log 2 period starts to get a prediction.'}
        </ThemedText>
        {open ? (
          <Button title="Period ended on this day" variant="plain" busy={busy} onPress={() => run(() => endCycle(open.id, date))} />
        ) : (
          <Button title="Period started on this day" variant="plain" busy={busy} onPress={() => run(() => startCycle(date))} />
        )}
      </Section>
      <Section title="Flow">
        <ChipRow options={FLOWS} value={flow} onChange={setFlow} />
      </Section>
      <Section title="Symptoms">
        <View style={styles.chips}>
          {SYMPTOMS.map((s) => (
            <Chip
              key={s}
              label={s}
              selected={symptoms.includes(s)}
              onPress={() => setSymptoms((cur) => (cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]))}
            />
          ))}
        </View>
      </Section>
      <Section title="Note (optional)">
        <Field value={note} onChangeText={setNote} placeholder="Anything to remember" multiline maxLength={5000} />
      </Section>
      <ErrorText>{error}</ErrorText>
      <Button
        title="Save"
        busy={busy}
        onPress={() =>
          run(async () => {
            await saveDay(date, { period_flow: flow, period_symptoms: symptoms });
            await saveNote(date, 'period', note);
          }, true)
        }
      />
    </>
  );
}
