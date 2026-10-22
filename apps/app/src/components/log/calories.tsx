import { useState } from 'react';
import { View } from 'react-native';

import type { IsoDate } from '@daily-notebook/shared';

import { Button, ErrorText, Field } from '@/components/form';
import { ThemedText } from '@/components/themed-text';
import { addMeal, deleteMeal, getTargets, listMeals, lookupBarcode, type Food, type MealKind } from '@/lib/data';

import { BarcodeScanner } from './barcode-scanner';
import { ChipRow, ProgressBar, Row, Section, styles, useLoad } from './common';

const MEALS: { value: MealKind; label: string }[] = [
  { value: 'breakfast', label: 'Breakfast' },
  { value: 'lunch', label: 'Lunch' },
  { value: 'dinner', label: 'Dinner' },
  { value: 'snack', label: 'Snack' },
];

function defaultMeal(): MealKind {
  const h = new Date().getHours();
  return h < 11 ? 'breakfast' : h < 16 ? 'lunch' : h < 21 ? 'dinner' : 'snack';
}

export function CaloriesLog({ date }: { date: IsoDate }) {
  const { data, error, reload, setError } = useLoad(async () => ({ meals: await listMeals(date), targets: await getTargets() }), [date]);
  const [meal, setMeal] = useState<MealKind | null>(defaultMeal());
  const [name, setName] = useState('');
  const [kcal, setKcal] = useState('');
  const [food, setFood] = useState<Food | null>(null);
  const [barcode, setBarcode] = useState('');
  const [scanning, setScanning] = useState(false);
  const [busy, setBusy] = useState(false);

  const total = (data?.meals ?? []).reduce((s, m) => s + m.calories, 0);
  const target = data?.targets.calories ?? 2000;

  async function lookup(code: string) {
    setScanning(false);
    setBarcode(code);
    setBusy(true);
    setError(null);
    try {
      const f = await lookupBarcode(code);
      setFood(f);
      setName(f.brand ? `${f.name} (${f.brand})` : f.name);
      const k = f.kcalPerServing ?? f.kcalPer100g;
      if (k != null) setKcal(String(k));
    } catch (e) {
      setFood(null);
      setError(`${(e as Error).message}. You can type the food in instead.`);
    } finally {
      setBusy(false);
    }
  }

  async function add() {
    const k = Number(kcal);
    if (!meal || !name.trim() || !Number.isInteger(k) || k < 0) return setError('Pick a meal, name the food and enter whole calories.');
    setBusy(true);
    try {
      await addMeal(date, { meal, food_name: name.trim(), calories: k, food_doc_id: food?.id ?? null });
      setName('');
      setKcal('');
      setFood(null);
      setBarcode('');
      reload();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Section title={`Today: ${total} / ${target} kcal`}>
        <ProgressBar value={total} max={target} color={total > target * 1.1 ? '#f0883e' : '#40c463'} />
        {MEALS.map((m) => {
          const items = (data?.meals ?? []).filter((x) => x.meal === m.value);
          if (items.length === 0) return null;
          return (
            <View key={m.value} style={{ gap: 6 }}>
              <ThemedText type="small" themeColor="textSecondary">
                {m.label}
              </ThemedText>
              {items.map((x) => (
                <Row key={x.id} title={x.food_name} detail={`${x.calories} kcal`} onDelete={() => deleteMeal(date, x.id).then(reload, (e: Error) => setError(e.message))} />
              ))}
            </View>
          );
        })}
      </Section>

      <Section title="Add food">
        <ChipRow options={MEALS} value={meal} onChange={setMeal} />
        {scanning ? (
          <BarcodeScanner onScanned={lookup} onCancel={() => setScanning(false)} />
        ) : (
          <View style={styles.inline}>
            <View style={{ flex: 1 }}>
              <Field
                value={barcode}
                onChangeText={(t) => setBarcode(t.replace(/\D/g, ''))}
                placeholder="Barcode number"
                keyboardType="number-pad"
                onSubmitEditing={() => barcode && lookup(barcode)}
              />
            </View>
            <Button title="Scan" variant="plain" onPress={() => setScanning(true)} />
            <Button title="Look up" variant="plain" onPress={() => lookup(barcode)} disabled={barcode.length < 8} />
          </View>
        )}
        {food ? (
          <ThemedText type="small" themeColor="textSecondary">
            {food.kcalPerServing != null
              ? `Per serving${food.servingSize ? ` (${food.servingSize})` : ''}: ${food.kcalPerServing} kcal. Adjust if you had more or less.`
              : food.kcalPer100g != null
                ? `Per 100 g: ${food.kcalPer100g} kcal. Adjust for how much you had.`
                : 'No calorie data for this product. Enter it yourself.'}
          </ThemedText>
        ) : null}
        <Field value={name} onChangeText={setName} placeholder="Food" maxLength={120} />
        <Field value={kcal} onChangeText={(t) => setKcal(t.replace(/\D/g, ''))} placeholder="Calories (kcal)" keyboardType="number-pad" />
        <ErrorText>{error}</ErrorText>
        <Button title="Add" onPress={add} busy={busy} />
      </Section>
    </>
  );
}
