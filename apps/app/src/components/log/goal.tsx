import { useState } from 'react';

import { monthKey, type IsoDate } from '@daily-notebook/shared';

import { Button, ErrorText, Field } from '@/components/form';
import { ThemedText } from '@/components/themed-text';
import { addGoalProgress, createGoal, getGoal } from '@/lib/data';

import { ProgressBar, Section, useLoad } from './common';

export function GoalLog({ date }: { date: IsoDate }) {
  const month = monthKey(date);
  const { data, loaded, error, reload, setError } = useLoad(() => getGoal(month), [month]);
  const [title, setTitle] = useState('');
  const [unit, setUnit] = useState('');
  const [target, setTarget] = useState('');
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState(false);

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await fn();
      reload();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (!loaded) return <ErrorText>{error}</ErrorText>;

  if (!data) {
    return (
      <Section title={`Set a goal for ${month}`}>
        <ThemedText themeColor="textSecondary">One measurable goal for the month, like "Run 50 km" or "Save 5000".</ThemedText>
        <Field value={title} onChangeText={setTitle} placeholder="Goal, e.g. Run" maxLength={80} />
        <Field value={target} onChangeText={(t) => setTarget(t.replace(/[^\d.]/g, ''))} placeholder="Target, e.g. 50" keyboardType="decimal-pad" />
        <Field value={unit} onChangeText={setUnit} placeholder="Unit, e.g. km" maxLength={20} />
        <ErrorText>{error}</ErrorText>
        <Button
          title="Set goal"
          busy={busy}
          onPress={() => {
            const t = Number(target);
            if (!title.trim() || !unit.trim() || !(t > 0)) return setError('Fill in the goal, target and unit.');
            run(() => createGoal(month, { title: title.trim(), unit: unit.trim(), target: t }));
          }}
        />
      </Section>
    );
  }

  const { goal, total } = data;
  return (
    <>
      <Section title={goal.title}>
        <ThemedText type="subtitle">
          {total} / {goal.target} {goal.unit}
        </ThemedText>
        <ProgressBar value={total} max={goal.target} />
        <ThemedText themeColor="textSecondary">
          {total >= goal.target ? 'Goal reached. Nice work!' : `${Math.round((goal.target - total) * 100) / 100} ${goal.unit} to go`}
        </ThemedText>
      </Section>
      <Section title="Log progress for this day">
        <Field value={amount} onChangeText={(t) => setAmount(t.replace(/[^\d.]/g, ''))} placeholder={`Amount (${goal.unit})`} keyboardType="decimal-pad" />
        <ErrorText>{error}</ErrorText>
        <Button
          title="Add progress"
          busy={busy}
          onPress={() => {
            const a = Number(amount);
            if (!(a > 0)) return setError('Enter an amount above 0.');
            run(async () => {
              await addGoalProgress(goal.id, date, a);
              setAmount('');
            });
          }}
        />
      </Section>
    </>
  );
}
