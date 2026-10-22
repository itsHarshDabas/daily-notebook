import * as Crypto from 'expo-crypto';

import { DEFAULT_TARGETS, monthKey, type IsoDate, type PeriodFlow, type Targets } from '@daily-notebook/shared';

import { api } from './api';
import { cacheGet, cacheUpdate, readThrough, setExecutor, write } from './offline';
import { supabase } from './supabase';

export type MealKind = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface Day {
  date: IsoDate;
  mood_score: number | null;
  stress: number | null;
  calories_total: number | null;
  water_ml: number | null;
  sleep_bed: string | null;
  sleep_wake: string | null;
  sleep_hours: number | null;
  sleep_quality: number | null;
  period_flow: PeriodFlow | null;
  period_symptoms: string[];
}

export interface Meal { id: string; meal: MealKind; food_name: string; calories: number; food_doc_id: string | null }
export interface Exercise { id: string; type: string; minutes: number }
export interface Expense { id: string; amount: number; category: string; note: string | null }
export interface MonthlyGoal { id: string; month: string; title: string; unit: string; target: number }
export interface Cycle { id: string; start_date: IsoDate; end_date: IsoDate | null }

// ---------- write operations (serializable so they can wait in the offline outbox) ----------

type Op =
  | { kind: 'upsert'; table: string; row: Record<string, unknown>; onConflict: string }
  | { kind: 'update'; table: string; id: string; patch: Record<string, unknown> }
  | { kind: 'delete'; table: string; id: string }
  | { kind: 'api'; path: string; method: string; body?: unknown };

async function run(op: Op): Promise<void> {
  if (op.kind === 'api') {
    await api(op.path, {
      method: op.method,
      ...(op.body !== undefined ? { headers: { 'content-type': 'application/json' }, body: JSON.stringify(op.body) } : {}),
    });
    return;
  }
  const q = supabase.from(op.table);
  const res =
    op.kind === 'upsert'
      ? await q.upsert(op.row, { onConflict: op.onConflict })
      : op.kind === 'update'
        ? await q.update(op.patch).eq('id', op.id)
        : await q.delete().eq('id', op.id);
  if (res.error) throw new Error(res.error.message);
}
setExecutor((op) => run(op as Op));

async function userId(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const id = data.session?.user.id;
  if (!id) throw new Error('Not signed in');
  return id;
}

function check<T>(res: { data: T; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data;
}

/** Rows of a list query; supabase-js types lists as nullable even when the query succeeded. */
function rows<T>(res: { data: T[] | null; error: { message: string } | null }): T[] {
  return check(res) ?? [];
}

function activity(action: 'create' | 'update' | 'delete', entity: string, entityId: string): Promise<unknown> {
  // The activity log is nice to have; failures here never block logging.
  return write('activity', {
    kind: 'api',
    path: '/activity',
    method: 'POST',
    body: { device: null, events: [{ action, entity, entityId, at: new Date().toISOString() }] },
  } satisfies Op).catch(() => {});
}

// ---------- days ----------

const DAY_COLUMNS =
  'date, mood_score, stress, calories_total, water_ml, sleep_bed, sleep_wake, sleep_hours, sleep_quality, period_flow, period_symptoms';

export function getDay(date: IsoDate): Promise<Day | null> {
  return readThrough(`day:${date}`, async () =>
    check(await supabase.from('days').select(DAY_COLUMNS).eq('date', date).maybeSingle<Day>()),
  );
}

/** Creates the day row if needed and sets only the given fields. */
export async function saveDay(date: IsoDate, patch: Partial<Omit<Day, 'date'>>): Promise<void> {
  await write(
    'Update day',
    { kind: 'upsert', table: 'days', row: { user_id: await userId(), date, ...patch }, onConflict: 'user_id,date' } satisfies Op,
    () =>
      cacheUpdate<Day | null>(`day:${date}`, (d) => ({
        ...(d ?? emptyDay(date)),
        ...patch,
      })),
  );
  activity('update', 'days', date);
}

function emptyDay(date: IsoDate): Day {
  return {
    date,
    mood_score: null,
    stress: null,
    calories_total: null,
    water_ml: null,
    sleep_bed: null,
    sleep_wake: null,
    sleep_hours: null,
    sleep_quality: null,
    period_flow: null,
    period_symptoms: [],
  };
}

// ---------- targets ----------

type TargetRow = { calories: number; water_ml: number; sleep_hours: number; exercise_min_week: number; budget_month: number };

export async function getTargets(): Promise<Targets> {
  const row = await readThrough('targets', async () =>
    check(await supabase.from('targets').select('calories, water_ml, sleep_hours, exercise_min_week, budget_month').maybeSingle<TargetRow>()),
  ).catch(() => null);
  if (!row) return DEFAULT_TARGETS;
  return {
    calories: row.calories,
    waterMl: row.water_ml,
    sleepHours: Number(row.sleep_hours),
    exerciseMinutesPerWeek: row.exercise_min_week,
    budgetPerMonth: Number(row.budget_month),
  };
}

export async function saveTargets(t: Targets): Promise<void> {
  const row: TargetRow = {
    calories: t.calories,
    water_ml: t.waterMl,
    sleep_hours: t.sleepHours,
    exercise_min_week: t.exerciseMinutesPerWeek,
    budget_month: t.budgetPerMonth,
  };
  await write('Update targets', { kind: 'upsert', table: 'targets', row: { user_id: await userId(), ...row }, onConflict: 'user_id' } satisfies Op, () =>
    cacheUpdate<TargetRow>('targets', () => row),
  );
}

// ---------- list helpers ----------

function listKey(table: string, date: IsoDate) {
  return `${table}:${date}`;
}

async function insertRow<T extends { id: string }>(table: string, date: IsoDate, item: Omit<T, 'id'>, label: string): Promise<T> {
  const full = { id: Crypto.randomUUID(), ...item } as T;
  await write(
    label,
    { kind: 'upsert', table, row: { user_id: await userId(), date, ...full }, onConflict: 'id' } satisfies Op,
    () => cacheUpdate<T[]>(listKey(table, date), (list) => [...(list ?? []), full]),
  );
  activity('create', table, full.id);
  return full;
}

async function deleteRow(table: string, date: IsoDate, id: string, label: string): Promise<void> {
  await write(label, { kind: 'delete', table, id } satisfies Op, () =>
    cacheUpdate<{ id: string }[]>(listKey(table, date), (list) => (list ?? []).filter((r) => r.id !== id)),
  );
  activity('delete', table, id);
}

// ---------- meals ----------

export function listMeals(date: IsoDate): Promise<Meal[]> {
  return readThrough(listKey('meals', date), async () =>
    rows<Meal>(await supabase.from('meals').select('id, meal, food_name, calories, food_doc_id').eq('date', date).order('updated_at')),
  );
}

// The day keeps calories_total in sync so grids need only the days table.
async function syncCalories(date: IsoDate): Promise<void> {
  const meals = (await cacheGet<Meal[]>(listKey('meals', date))) ?? (await listMeals(date));
  await saveDay(date, { calories_total: meals.reduce((s, m) => s + m.calories, 0) });
}

export async function addMeal(date: IsoDate, m: Omit<Meal, 'id'>): Promise<void> {
  await listMeals(date).catch(() => []);
  await insertRow<Meal>('meals', date, m, 'Add food');
  await syncCalories(date);
}

export async function deleteMeal(date: IsoDate, id: string): Promise<void> {
  await deleteRow('meals', date, id, 'Delete food');
  await syncCalories(date);
}

// ---------- exercise ----------

export function listExercises(date: IsoDate): Promise<Exercise[]> {
  return readThrough(listKey('exercises', date), async () =>
    rows<Exercise>(await supabase.from('exercises').select('id, type, minutes').eq('date', date).order('updated_at')),
  );
}

export const addExercise = (date: IsoDate, e: Omit<Exercise, 'id'>) => insertRow<Exercise>('exercises', date, e, 'Add exercise');
export const deleteExercise = (date: IsoDate, id: string) => deleteRow('exercises', date, id, 'Delete exercise');

// ---------- expenses ----------

export function listExpenses(date: IsoDate): Promise<Expense[]> {
  return readThrough(listKey('expenses', date), async () =>
    rows<Expense>(await supabase.from('expenses').select('id, amount, category, note').eq('date', date).order('updated_at')),
  );
}

export async function monthSpend(date: IsoDate): Promise<number> {
  const month = monthKey(date);
  const list = await readThrough(`spend:${month}`, async () =>
    rows<{ amount: number }>(await supabase.from('expenses').select('amount').gte('date', `${month}-01`).lte('date', `${month}-31`)),
  );
  return list.reduce((s, r) => s + Number(r.amount), 0);
}

export async function addExpense(date: IsoDate, e: Omit<Expense, 'id'>): Promise<void> {
  await insertRow<Expense>('expenses', date, e, 'Add expense');
  await cacheUpdate<{ amount: number }[]>(`spend:${monthKey(date)}`, (l) => [...(l ?? []), { amount: e.amount }]);
}

export async function deleteExpense(date: IsoDate, id: string, amount: number): Promise<void> {
  await deleteRow('expenses', date, id, 'Delete expense');
  await cacheUpdate<{ amount: number }[]>(`spend:${monthKey(date)}`, (l) => {
    const copy = [...(l ?? [])];
    const i = copy.findIndex((r) => Number(r.amount) === amount);
    if (i >= 0) copy.splice(i, 1);
    return copy;
  });
}

// ---------- monthly goal ----------

export interface GoalState {
  goal: MonthlyGoal;
  total: number;
  /** Progress per day, for the grid and today's card. */
  byDate: Record<IsoDate, number>;
}

export function getGoal(month: string): Promise<GoalState | null> {
  return readThrough(`goal:${month}`, async () => {
    const goal = check(
      await supabase.from('monthly_goals').select('id, month, title, unit, target').eq('month', month).maybeSingle<MonthlyGoal>(),
    );
    if (!goal) return null;
    const progress = rows<{ date: IsoDate; amount: number }>(await supabase.from('goal_progress').select('date, amount').eq('goal_id', goal.id));
    const byDate: Record<IsoDate, number> = {};
    for (const p of progress) byDate[p.date] = (byDate[p.date] ?? 0) + Number(p.amount);
    return { goal: { ...goal, target: Number(goal.target) }, total: progress.reduce((s, p) => s + Number(p.amount), 0), byDate };
  });
}

export async function createGoal(month: string, g: Pick<MonthlyGoal, 'title' | 'unit' | 'target'>): Promise<void> {
  const goal: MonthlyGoal = { id: Crypto.randomUUID(), month, ...g };
  await write('Set monthly goal', { kind: 'upsert', table: 'monthly_goals', row: { user_id: await userId(), ...goal }, onConflict: 'id' } satisfies Op, () =>
    cacheUpdate<GoalState | null>(`goal:${month}`, () => ({ goal, total: 0, byDate: {} })),
  );
  activity('create', 'monthly_goals', goal.id);
}

export async function addGoalProgress(goal: MonthlyGoal, date: IsoDate, amount: number): Promise<void> {
  const id = Crypto.randomUUID();
  await write(
    'Log goal progress',
    { kind: 'upsert', table: 'goal_progress', row: { id, user_id: await userId(), goal_id: goal.id, date, amount }, onConflict: 'id' } satisfies Op,
    () =>
      cacheUpdate<GoalState | null>(`goal:${goal.month}`, (s) =>
        s ? { ...s, total: s.total + amount, byDate: { ...s.byDate, [date]: (s.byDate[date] ?? 0) + amount } } : s,
      ),
  );
  activity('create', 'goal_progress', id);
}

// ---------- cycles ----------

export function listCycles(): Promise<Cycle[]> {
  return readThrough('cycles', async () => rows<Cycle>(await supabase.from('cycles').select('id, start_date, end_date').order('start_date')));
}

export async function startCycle(date: IsoDate): Promise<void> {
  const cycle: Cycle = { id: Crypto.randomUUID(), start_date: date, end_date: null };
  await write('Period started', { kind: 'upsert', table: 'cycles', row: { user_id: await userId(), ...cycle }, onConflict: 'id' } satisfies Op, () =>
    cacheUpdate<Cycle[]>('cycles', (l) => [...(l ?? []).filter((c) => c.start_date !== date), cycle].sort((a, b) => a.start_date.localeCompare(b.start_date))),
  );
  activity('create', 'cycles', cycle.id);
}

export async function endCycle(id: string, date: IsoDate): Promise<void> {
  await write('Period ended', { kind: 'update', table: 'cycles', id, patch: { end_date: date } } satisfies Op, () =>
    cacheUpdate<Cycle[]>('cycles', (l) => (l ?? []).map((c) => (c.id === id ? { ...c, end_date: date } : c))),
  );
  activity('update', 'cycles', id);
}

// ---------- MongoDB side, through the API ----------

export interface Food {
  id: string;
  barcode: string;
  name: string;
  brand: string | null;
  kcalPer100g: number | null;
  kcalPerServing: number | null;
  servingSize: string | null;
}

export function lookupBarcode(barcode: string): Promise<Food> {
  return api<Food>(`/foods/barcode/${encodeURIComponent(barcode)}`);
}

export async function searchFoods(q: string): Promise<Food[]> {
  const { foods } = await api<{ foods: Food[] }>(`/foods/search?q=${encodeURIComponent(q)}`);
  return foods;
}

export type NoteKind = 'mood' | 'period' | 'goal';

export async function getNote(date: IsoDate, kind: NoteKind): Promise<string> {
  const { notes } = await readThrough(`notes:${date}`, () =>
    api<{ notes: { date: string; kind: string; text: string }[] }>(`/notes?from=${date}&to=${date}`),
  ).catch(() => ({ notes: [] as { date: string; kind: string; text: string }[] }));
  return notes.find((n) => n.kind === kind)?.text ?? '';
}

export async function saveNote(date: IsoDate, kind: NoteKind, text: string): Promise<void> {
  const clean = text.trim();
  const op: Op = clean
    ? { kind: 'api', path: `/notes/${date}/${kind}`, method: 'PUT', body: { text: clean } }
    : { kind: 'api', path: `/notes/${date}/${kind}`, method: 'DELETE' };
  await write('Save note', op, () =>
    cacheUpdate<{ notes: { date: string; kind: string; text: string }[] }>(`notes:${date}`, (c) => ({
      notes: [...(c?.notes ?? []).filter((n) => n.kind !== kind), ...(clean ? [{ date, kind, text: clean }] : [])],
    })),
  );
}

// ---------- Today summary ----------

export interface TodayCard {
  value: string | null;
  /** 0-1 toward the day's target where one exists, for the ring. */
  progress: number | null;
}

export async function daySummary(date: IsoDate, currency: string): Promise<Record<string, TodayCard>> {
  const [day, exercises, expenses, goal, targets, spent] = await Promise.all([
    getDay(date).catch(() => null),
    listExercises(date).catch(() => []),
    listExpenses(date).catch(() => []),
    getGoal(monthKey(date)).catch(() => null),
    getTargets(),
    monthSpend(date).catch(() => 0),
  ]);
  const money = (n: number) => new Intl.NumberFormat(undefined, { style: 'currency', currency, maximumFractionDigits: 0 }).format(n);
  const moods = ['', 'Awful', 'Bad', 'Okay', 'Good', 'Great'];
  const exMin = exercises.reduce((s, e) => s + e.minutes, 0);
  const spentToday = expenses.reduce((s, e) => s + Number(e.amount), 0);
  const ratio = (v: number | null | undefined, t: number) => (v ? Math.min(1, v / t) : 0);
  return {
    mood: { value: day?.mood_score ? moods[day.mood_score] : null, progress: day?.mood_score ? day.mood_score / 5 : 0 },
    calories: { value: day?.calories_total ? `${day.calories_total} kcal` : null, progress: ratio(day?.calories_total, targets.calories) },
    monthlyGoal: {
      value: goal ? `${goal.total} / ${goal.goal.target} ${goal.goal.unit}` : null,
      progress: goal ? Math.min(1, goal.total / goal.goal.target) : 0,
    },
    water: { value: day?.water_ml ? `${(day.water_ml / 1000).toFixed(day.water_ml % 1000 ? 2 : 0)} L` : null, progress: ratio(day?.water_ml, targets.waterMl) },
    sleep: { value: day?.sleep_hours ? `${day.sleep_hours} h` : null, progress: ratio(day?.sleep_hours, targets.sleepHours) },
    exercise: { value: exMin ? `${exMin} min` : null, progress: ratio(exMin, targets.exerciseMinutesPerWeek / 7) },
    expenses: {
      value: expenses.length ? money(spentToday) : null,
      progress: targets.budgetPerMonth > 0 ? Math.min(1, spent / targets.budgetPerMonth) : null,
    },
    period: { value: day?.period_flow ? `${day.period_flow[0].toUpperCase()}${day.period_flow.slice(1)} flow` : null, progress: null },
  };
}
