import { useEffect, useState } from 'react';

import type { IsoDate } from '@daily-notebook/shared';

import { Button, ErrorText, Field } from '@/components/form';
import { getDay, getNote, saveDay, saveNote } from '@/lib/data';

import { ChipRow, Section, useLoad } from './common';

const MOODS = [
  { value: 1, label: '😞 Awful' },
  { value: 2, label: '🙁 Bad' },
  { value: 3, label: '😐 Okay' },
  { value: 4, label: '🙂 Good' },
  { value: 5, label: '😄 Great' },
];
const STRESS = [1, 2, 3, 4, 5].map((v) => ({ value: v, label: String(v) }));

export function MoodLog({ date, onDone }: { date: IsoDate; onDone: () => void }) {
  const { data, error, setError } = useLoad(
    async () => ({ day: await getDay(date), note: await getNote(date, 'mood').catch(() => '') }),
    [date],
  );
  const [mood, setMood] = useState<number | null>(null);
  const [stress, setStress] = useState<number | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!data) return;
    setMood(data.day?.mood_score ?? null);
    setStress(data.day?.stress ?? null);
    setNote(data.note);
  }, [data]);

  async function save() {
    setBusy(true);
    try {
      await saveDay(date, { mood_score: mood, stress });
      await saveNote(date, 'mood', note);
      onDone();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Section title="How do you feel today?">
        <ChipRow options={MOODS} value={mood} onChange={setMood} />
      </Section>
      <Section title="Stress level (1 = calm, 5 = very stressed)">
        <ChipRow options={STRESS} value={stress} onChange={setStress} />
      </Section>
      <Section title="Note (optional)">
        <Field value={note} onChangeText={setNote} placeholder="What's on your mind?" multiline maxLength={5000} />
      </Section>
      <ErrorText>{error}</ErrorText>
      <Button title="Save" onPress={save} busy={busy} disabled={!data} />
    </>
  );
}
