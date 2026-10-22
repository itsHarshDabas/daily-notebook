import { useState } from 'react';

import type { IsoDate } from '@daily-notebook/shared';

import { Button, ErrorText, Field } from '@/components/form';
import { ThemedText } from '@/components/themed-text';
import { useAuth } from '@/lib/auth';
import { addExpense, deleteExpense, getTargets, listExpenses, monthSpend } from '@/lib/data';

import { ChipRow, ProgressBar, Row, Section, useLoad } from './common';

const CATEGORIES = ['Food', 'Transport', 'Shopping', 'Bills', 'Health', 'Fun', 'Other'].map((c) => ({ value: c, label: c }));

export function ExpensesLog({ date }: { date: IsoDate }) {
  const { profile } = useAuth();
  const currency = profile?.currency ?? 'INR';
  const fmt = (n: number) => new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(n);
  const { data, error, reload, setError } = useLoad(
    async () => ({ items: await listExpenses(date), month: await monthSpend(date), targets: await getTargets() }),
    [date],
  );
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<string | null>('Food');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const budget = data?.targets.budgetPerMonth ?? 0;

  async function add() {
    const a = Number(amount);
    if (!category || !(a > 0)) return setError('Enter an amount and pick a category.');
    setBusy(true);
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
        <Section title={budget > 0 ? `This month: ${fmt(data.month)} of ${fmt(budget)}` : `This month: ${fmt(data.month)}`}>
          {budget > 0 ? <ProgressBar value={data.month} max={budget} color={data.month > budget ? '#e5534b' : '#40c463'} /> : null}
        </Section>
      ) : null}
      <Section title="Today">
        {(data?.items ?? []).map((e) => (
          <Row
            key={e.id}
            title={`${fmt(Number(e.amount))} · ${e.category}`}
            detail={e.note ?? undefined}
            onDelete={() => deleteExpense(e.id).then(reload, (x: Error) => setError(x.message))}
          />
        ))}
        {data?.items.length === 0 ? <ThemedText themeColor="textSecondary">No spending logged.</ThemedText> : null}
      </Section>
      <Section title="Add expense">
        <Field value={amount} onChangeText={(t) => setAmount(t.replace(/[^\d.]/g, ''))} placeholder={`Amount (${currency})`} keyboardType="decimal-pad" />
        <ChipRow options={CATEGORIES} value={category} onChange={setCategory} />
        <Field value={note} onChangeText={setNote} placeholder="Note (optional)" maxLength={200} />
        <ErrorText>{error}</ErrorText>
        <Button title="Add" onPress={add} busy={busy} />
      </Section>
    </>
  );
}
