import { useEffect, useState } from 'react';
import { Pressable, View } from 'react-native';

import type { IsoDate } from '@daily-notebook/shared';

import { Banner, Button, Empty, Field, ListRow, ProgressBar, Segmented, Text } from '@/components/ui';
import { TrackerColors } from '@/constants/theme';
import type { IconName } from '@/constants/trackers';
import { useTheme } from '@/hooks/use-theme';
import { addMeal, deleteMeal, getTargets, listMeals, lookupBarcode, searchFoods, type Food, type MealKind } from '@/lib/data';

import { BarcodeScanner } from './barcode-scanner';
import { ChipRow, Section, styles, useLoad } from './common';

const MEALS: { value: MealKind; label: string; icon: IconName }[] = [
  { value: 'breakfast', label: 'Breakfast', icon: 'cafe-outline' },
  { value: 'lunch', label: 'Lunch', icon: 'sunny-outline' },
  { value: 'dinner', label: 'Dinner', icon: 'moon-outline' },
  { value: 'snack', label: 'Snack', icon: 'nutrition-outline' },
];

type Mode = 'search' | 'barcode' | 'manual';

function defaultMeal(): MealKind {
  const h = new Date().getHours();
  return h < 11 ? 'breakfast' : h < 16 ? 'lunch' : h < 21 ? 'dinner' : 'snack';
}

function per(f: Food): string {
  if (f.kcalPerServing != null) return `${f.kcalPerServing} kcal per serving${f.servingSize ? ` (${f.servingSize})` : ''}`;
  if (f.kcalPer100g != null) return `${f.kcalPer100g} kcal per 100 g`;
  return 'No calorie data';
}

export function CaloriesLog({ date }: { date: IsoDate }) {
  const theme = useTheme();
  const color = TrackerColors.calories;
  const { data, error, reload, setError } = useLoad(async () => ({ meals: await listMeals(date), targets: await getTargets() }), [date]);
  const [mode, setMode] = useState<Mode>('search');
  const [meal, setMeal] = useState<MealKind | null>(defaultMeal());
  const [name, setName] = useState('');
  const [kcal, setKcal] = useState('');
  const [food, setFood] = useState<Food | null>(null);
  const [barcode, setBarcode] = useState('');
  const [scanning, setScanning] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Food[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [busy, setBusy] = useState(false);

  const total = (data?.meals ?? []).reduce((s, m) => s + m.calories, 0);
  const target = data?.targets.calories ?? 2000;
  const over = total > target * 1.1;

  // Search as the user types, but only once they pause.
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) return setResults(null);
    let live = true;
    setSearching(true);
    const t = setTimeout(() => {
      searchFoods(q)
        .then((r) => live && setResults(r))
        .catch((e: Error) => live && setError(`Search needs a connection. ${e.message}`))
        .finally(() => live && setSearching(false));
    }, 350);
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [query, setError]);

  function pick(f: Food) {
    setFood(f);
    setName(f.brand ? `${f.name} (${f.brand})` : f.name);
    const k = f.kcalPerServing ?? f.kcalPer100g;
    setKcal(k != null ? String(Math.round(k)) : '');
    setMode('manual');
  }

  async function lookup(code: string) {
    setScanning(false);
    setBarcode(code);
    setBusy(true);
    setError(null);
    try {
      pick(await lookupBarcode(code));
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
    setError(null);
    try {
      await addMeal(date, { meal, food_name: name.trim(), calories: k, food_doc_id: food?.id ?? null });
      setName('');
      setKcal('');
      setFood(null);
      setBarcode('');
      setQuery('');
      setMode('search');
      reload();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Section title="Eaten this day">
        <View style={styles.big}>
          <Text variant="display" tint={over ? theme.danger : color}>
            {total}
          </Text>
          <Text variant="body" color="textSecondary">
            / {target} kcal
          </Text>
        </View>
        <ProgressBar value={total} max={target} color={over ? theme.danger : color} height={10} />
        {MEALS.map((m) => {
          const items = (data?.meals ?? []).filter((x) => x.meal === m.value);
          if (items.length === 0) return null;
          return (
            <View key={m.value} style={{ gap: 2 }}>
              <Text variant="micro" color="textSecondary">
                {m.label} · {items.reduce((s, x) => s + x.calories, 0)} kcal
              </Text>
              {items.map((x) => (
                <ListRow
                  key={x.id}
                  icon={m.icon}
                  color={color}
                  title={x.food_name}
                  right={`${x.calories}`}
                  onDelete={() => deleteMeal(date, x.id).then(reload, (e: Error) => setError(e.message))}
                />
              ))}
            </View>
          );
        })}
        {data?.meals.length === 0 ? <Empty icon="restaurant-outline" text="Nothing logged yet." /> : null}
      </Section>

      <Section title="Add food">
        <ChipRow options={MEALS} value={meal} onChange={setMeal} color={color} />
        <Segmented
          value={mode}
          onChange={setMode}
          options={[
            { value: 'search', label: 'Search' },
            { value: 'barcode', label: 'Barcode' },
            { value: 'manual', label: 'Manual' },
          ]}
        />

        {mode === 'search' ? (
          <>
            <Field value={query} onChangeText={setQuery} placeholder="Search foods, e.g. oats" autoCorrect={false} returnKeyType="search" />
            {searching ? (
              <Text variant="caption" color="textSecondary">
                Searching…
              </Text>
            ) : results?.length === 0 ? (
              <Empty icon="search-outline" text="No matches. Try another name or enter it manually." />
            ) : (
              (results ?? []).map((f) => (
                <Pressable key={f.id} onPress={() => pick(f)} accessibilityRole="button" style={({ pressed }) => pressed && { opacity: 0.6 }}>
                  <ListRow icon="add-circle-outline" color={color} title={f.brand ? `${f.name} · ${f.brand}` : f.name} detail={per(f)} />
                </Pressable>
              ))
            )}
          </>
        ) : null}

        {mode === 'barcode' ? (
          scanning ? (
            <BarcodeScanner onScanned={lookup} onCancel={() => setScanning(false)} />
          ) : (
            <>
              <Button title="Scan with camera" icon="scan-outline" variant="secondary" onPress={() => setScanning(true)} />
              <View style={styles.inline}>
                <View style={{ flex: 1 }}>
                  <Field
                    value={barcode}
                    onChangeText={(t) => setBarcode(t.replace(/\D/g, ''))}
                    placeholder="Or type the barcode number"
                    keyboardType="number-pad"
                    onSubmitEditing={() => barcode.length >= 8 && lookup(barcode)}
                  />
                </View>
                <Button title="Look up" compact variant="secondary" busy={busy} onPress={() => lookup(barcode)} disabled={barcode.length < 8} />
              </View>
            </>
          )
        ) : null}

        {mode === 'manual' ? (
          <>
            {food ? <Banner tone="info" icon="information-circle" text={`${per(food)}. Adjust if you had more or less.`} /> : null}
            <Field label="Food" value={name} onChangeText={setName} placeholder="e.g. Chicken wrap" maxLength={120} />
            <Field label="Calories" value={kcal} onChangeText={(t) => setKcal(t.replace(/\D/g, ''))} placeholder="kcal" keyboardType="number-pad" />
            <Button title="Add food" icon="add" onPress={add} busy={busy} />
          </>
        ) : null}
        <Banner text={error} />
      </Section>
    </>
  );
}
