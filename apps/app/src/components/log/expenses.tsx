import { useState } from 'react';

import type { IsoDate } from '@daily-notebook/shared';

import { Banner, Button, Empty, Field, ListRow, ProgressBar, Text } from '@/components/ui';
import { TrackerColors } from '@/constants/theme';
import type { IconName } from '@/constants/trackers';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth';
import { addExpense, deleteExpense, getTargets, listExpenses, monthSpend } from '@/lib/data';

import { ChipRow, Section, useLoad } from './common';

const CATEGORIES: { value: string; label: string; icon: IconName }[] = [
  { value: 'Food', label: 'Food', icon: 'fast-food-outline' },
  { value: 'Transport', label: 'Transport', icon: 'car-outline' },
  { value: 'Shopping', label: 'Shopping', icon: 'bag-outline' },
  { value: 'Bills', label: 'Bills', icon: 'receipt-outline' },
  { value: 'Health', label: 'Health', icon: 'medkit-outline' },
  { value: 'Fun', label: 'Fun', icon: 'game-controller-outline' },
  { value: 'Other', label: 'Other', icon: 'ellipsis-horizontal-circle-outline' },
];
const ICON = Object.fromEntries(CATEGORIES.map((c) => [c.value, c.icon])) as Record<string, IconName>;

export function ExpensesLog({ date }: { date: IsoDate }) {
  const theme = useTheme();
  const color = TrackerColors.expenses;
  const { profile } = useAuth();
  const currency = profile?.currency ?? 'INR';
  const fmt = (n: number) => new Intl.NumberFormat(undefined, { style: 'currency', currency, maximumFractionDigits: 2, minimumFractionDigits: 0 }).format(n);
  const { data, error, reload, setError } = useLoad(
    async () => ({ items: await listExpenses(date), month: await monthSpend(date), targets: await getTargets() }),
    [date],
  );
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<string | null>('Food');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const budget = data?.targets.budgetPerMonth ?? 0;
  const today = (data?.items ?? []).reduce((s, e) => s + Number(e.amount), 0);

  async function add() {
    const a = Number(amount);
    if (!category || !(a > 0)) return setError('Enter an amount and pick a category.');
    setBusy(true);
    setError(null);
    try {
      await addExpense(date, { amount: Math.round(a * 100) / 100, category, note: note.trim() || null });
      setAmount('');
      setNote('');
      reload();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {data ? (
        <Section title="This month" right={<Text variant="heading">{fmt(data.month)}</Text>}>
          {budget > 0 ? (
            <>
              <ProgressBar value={data.month} max={budget} color={data.month > budget ? theme.danger : color} height={10} />
              <Text variant="caption" color="textSecondary">
                {data.month > budget ? `${fmt(data.month - budget)} over your ${fmt(budget)} budget` : `${fmt(budget - data.month)} left of ${fmt(budget)}`}
              </Text>
            </>
          ) : (
            <Text variant="caption" color="textSecondary">
              Set a monthly budget in Settings to track it here.
            </Text>
          )}
        </Section>
      ) : null}
      <Section title="Spent this day" right={<Text variant="heading" tint={color}>{fmt(today)}</Text>}>
        {(data?.items ?? []).map((e) => (
          <ListRow
            key={e.id}
            icon={ICON[e.category] ?? 'wallet-outline'}
            color={color}
            title={e.category}
            detail={e.note}
            right={fmt(Number(e.amount))}
            onDelete={() => deleteExpense(date, e.id, Number(e.amount)).then(reload, (x: Error) => setError(x.message))}
          />
        ))}
        {data?.items.length === 0 ? <Empty icon="wallet-outline" text="No spending logged." /> : null}
      </Section>
      <Section title="Add expense">
        <Field label={`Amount (${currency})`} value={amount} onChangeText={(t) => setAmount(t.replace(/[^\d.]/g, ''))} placeholder="0" keyboardType="decimal-pad" />
        <ChipRow options={CATEGORIES} value={category} onChange={setCategory} color={color} />
        <Field label="Note" value={note} onChangeText={setNote} placeholder="Optional" maxLength={200} />
        <Banner text={error} />
        <Button title="Add expense" icon="add" onPress={add} busy={busy} />
      </Section>
    </>
  );
}
