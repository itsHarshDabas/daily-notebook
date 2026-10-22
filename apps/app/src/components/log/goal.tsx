import { useState } from 'react';
import { View } from 'react-native';

import { monthKey, type IsoDate } from '@daily-notebook/shared';

import { Banner, Button, Field, ProgressBar, Text } from '@/components/ui';
import { TrackerColors } from '@/constants/theme';
import { addGoalProgress, createGoal, getGoal } from '@/lib/data';

import { Section, styles, useLoad } from './common';

const round = (n: number) => Math.round(n * 100) / 100;

function monthName(month: string) {
  const [y, m] = month.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}

export function GoalLog({ date }: { date: IsoDate }) {
  const color = TrackerColors.monthlyGoal;
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

  if (!loaded) return <Banner text={error} />;

  if (!data) {
    return (
      <Section title={`Goal for ${monthName(month)}`}>
        <Text color="textSecondary">Pick one measurable goal for the month, like "Run 50 km" or "Read 4 books".</Text>
        <Field label="Goal" value={title} onChangeText={setTitle} placeholder="e.g. Run" maxLength={80} />
        <View style={styles.inline}>
          <View style={{ flex: 1 }}>
            <Field label="Target" value={target} onChangeText={(t) => setTarget(t.replace(/[^\d.]/g, ''))} placeholder="50" keyboardType="decimal-pad" />
          </View>
          <View style={{ flex: 1 }}>
            <Field label="Unit" value={unit} onChangeText={setUnit} placeholder="km" maxLength={20} />
          </View>
        </View>
        <Banner text={error} />
        <Button
          title="Set goal"
          icon="flag"
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

  const { goal, total, byDate } = data;
  const todays = byDate[date] ?? 0;
  const done = total >= goal.target;
  return (
    <>
      <Section title={goal.title} right={<Text variant="caption" color="textSecondary">{monthName(month)}</Text>}>
        <View style={styles.big}>
          <Text variant="display" tint={color}>
            {round(total)}
          </Text>
          <Text color="textSecondary">
            / {goal.target} {goal.unit}
          </Text>
        </View>
        <ProgressBar value={total} max={goal.target} color={color} height={10} />
        <Text variant="caption" color="textSecondary">
          {done ? 'Goal reached. Nice work! 🎉' : `${round(goal.target - total)} ${goal.unit} to go`}
          {todays > 0 ? ` · ${round(todays)} ${goal.unit} logged this day` : ''}
        </Text>
      </Section>
      <Section title="Log progress">
        <View style={styles.inline}>
          <View style={{ flex: 1 }}>
            <Field value={amount} onChangeText={(t) => setAmount(t.replace(/[^\d.]/g, ''))} placeholder={`Amount (${goal.unit})`} keyboardType="decimal-pad" />
          </View>
          <Button
            title="Add"
            icon="add"
            compact
            busy={busy}
            onPress={() => {
              const a = Number(amount);
              if (!(a > 0)) return setError('Enter an amount above 0.');
              run(async () => {
                await addGoalProgress(goal, date, a);
                setAmount('');
              });
            }}
          />
        </View>
        <Banner text={error} />
      </Section>
    </>
  );
}
