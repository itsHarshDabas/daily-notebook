import { useEffect, useState } from 'react';

import { predictNextStart, type IsoDate, type PeriodFlow } from '@daily-notebook/shared';

import { Banner, Button, Chip, ChipGroup, Field, Text } from '@/components/ui';
import { TrackerColors } from '@/constants/theme';
import { endCycle, getDay, getNote, listCycles, saveDay, saveNote, startCycle } from '@/lib/data';

import { ChipRow, Section, useLoad } from './common';

const FLOWS: { value: PeriodFlow; label: string }[] = [
  { value: 'light', label: 'Light' },
  { value: 'medium', label: 'Medium' },
  { value: 'heavy', label: 'Heavy' },
];
const SYMPTOMS = ['Cramps', 'Headache', 'Bloating', 'Mood swings', 'Fatigue', 'Back pain', 'Acne'];

const pretty = (d: IsoDate) => new Date(`${d}T00:00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });

export function PeriodLog({ date, onDone }: { date: IsoDate; onDone: () => void }) {
  const color = TrackerColors.period;
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

  if (!loaded) return <Banner text={error} />;

  return (
    <>
      <Section title="Cycle">
        <Text variant="heading" tint={open ? color : undefined}>
          {open ? `Period since ${pretty(open.start_date)}` : 'No period in progress'}
        </Text>
        <Text variant="caption" color="textSecondary">
          {next ? `Next period predicted around ${pretty(next)}.` : 'Log two period starts to get a prediction.'}
        </Text>
        {open ? (
          <Button title="Period ended this day" icon="stop-circle-outline" variant="secondary" busy={busy} onPress={() => run(() => endCycle(open.id, date))} />
        ) : (
          <Button title="Period started this day" icon="play-circle-outline" variant="secondary" busy={busy} onPress={() => run(() => startCycle(date))} />
        )}
      </Section>
      <Section title="Flow">
        <ChipRow options={FLOWS} value={flow} onChange={setFlow} color={color} />
      </Section>
      <Section title="Symptoms">
        <ChipGroup>
          {SYMPTOMS.map((s) => (
            <Chip
              key={s}
              label={s}
              color={color}
              selected={symptoms.includes(s)}
              onPress={() => setSymptoms((cur) => (cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]))}
            />
          ))}
        </ChipGroup>
      </Section>
      <Section title="Note">
        <Field value={note} onChangeText={setNote} placeholder="Anything to remember (optional)" multiline maxLength={5000} />
      </Section>
      <Banner text={error} />
      <Button
        title="Save"
        icon="checkmark"
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
