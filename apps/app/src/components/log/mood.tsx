import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import type { IsoDate } from '@daily-notebook/shared';

import { Banner, Button, Field, Text } from '@/components/ui';
import { Radius, TrackerColors } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { getDay, getNote, saveDay, saveNote } from '@/lib/data';

import { ChipRow, Section, useLoad } from './common';

const MOODS = [
  { value: 1, emoji: '😞', label: 'Awful' },
  { value: 2, emoji: '🙁', label: 'Bad' },
  { value: 3, emoji: '😐', label: 'Okay' },
  { value: 4, emoji: '🙂', label: 'Good' },
  { value: 5, emoji: '😄', label: 'Great' },
];
const STRESS = [
  { value: 1, label: 'Calm' },
  { value: 2, label: 'Low' },
  { value: 3, label: 'Medium' },
  { value: 4, label: 'High' },
  { value: 5, label: 'Very high' },
];

export function MoodLog({ date, onDone }: { date: IsoDate; onDone: () => void }) {
  const theme = useTheme();
  const color = TrackerColors.mood;
  const { data, loaded, error, setError } = useLoad(async () => ({ day: await getDay(date), note: await getNote(date, 'mood') }), [date]);
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
      <Section title="How do you feel?">
        <View style={styles.moods}>
          {MOODS.map((m) => {
            const on = mood === m.value;
            return (
              <Pressable
                key={m.value}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                accessibilityLabel={m.label}
                onPress={() => setMood(on ? null : m.value)}
                style={[styles.mood, { borderColor: on ? color : theme.border, backgroundColor: on ? `${color}22` : theme.surface }]}>
                <Text style={styles.emoji}>{m.emoji}</Text>
                <Text variant="caption" color={on ? 'text' : 'textSecondary'}>
                  {m.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </Section>
      <Section title="Stress level">
        <ChipRow options={STRESS} value={stress} onChange={setStress} color={color} />
      </Section>
      <Section title="Journal">
        <Field value={note} onChangeText={setNote} placeholder="What's on your mind today?" multiline maxLength={5000} />
      </Section>
      <Banner text={error} />
      <Button title="Save" icon="checkmark" onPress={save} busy={busy} disabled={!loaded} />
    </>
  );
}

const styles = StyleSheet.create({
  moods: { flexDirection: 'row', gap: 8 },
  mood: { flex: 1, alignItems: 'center', gap: 4, paddingVertical: 12, borderRadius: Radius.md, borderWidth: 1 },
  emoji: { fontSize: 28, lineHeight: 34 },
});
