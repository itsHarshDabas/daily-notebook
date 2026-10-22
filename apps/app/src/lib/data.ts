import { DEFAULT_TARGETS, monthKey, type IsoDate, type PeriodFlow, type Targets } from '@daily-notebook/shared';

import { api } from './api';
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

async function userId(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const id = data.session?.user.id;
  if (!id) throw new Error('Not signed in');
  return id;
}

/** Rows of a list query; supabase-js types lists as nullable even when the query succeeded. */
function rows<T>(res: { data: T[] | null; error: { message: string } | null }): T[] {
  return check(res) ?? [];
}

function check<T>(res: { data: T; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data;
}

const DAY_COLUMNS =
  'date, mood_score, stress, calories_total, water_ml, sleep_bed, sleep_wake, sleep_hours, sleep_quality, period_flow, period_symptoms';

export async function getDay(date: IsoDate): Promise<Day | null> {
  return check(await supabase.from('days').select(DAY_COLUMNS).eq('date', date).maybeSingle<Day>());
}

/** Creates the day row if needed and sets only the given fields. */
export async function saveDay(date: IsoDate, patch: Partial<Omit<Day, 'date'>>): Promise<void> {
  check(await supabase.from('days').upsert({ user_id: await userId(), date, ...patch }, { onConflict: 'user_id,date' }));
  logActivity('update', 'days', date);
}

export async function getTargets(): Promise<Targets> {
  const row = check(
    await supabase
      .from('targets')
      .select('calories, water_ml, sleep_hours, exercise_min_week, budget_month')
      .maybeSingle<{ calories: number; water_ml: number; sleep_hours: number; exercise_min_week: number; budget_month: number }>(),
  );
  if (!row) return DEFAULT_TARGETS;
  return {
    calories: row.calories,
    waterMl: row.water_ml,
    sleepHours: Number(row.sleep_hours),
    exerciseMinutesPerWeek: row.exercise_min_week,
    budgetPerMonth: Number(row.budget_month),
  };
}

// Meals: the day keeps calories_total in sync so grids need only the days table.
export async function listMeals(date: IsoDate): Promise<Meal[]> {
  return rows<Meal>(await supabase.from('meals').select('id, meal, food_name, calories, food_doc_id').eq('date', date).order('updated_at'));
}

async function syncCalories(date: IsoDate): Promise<void> {
  const meals = await listMeals(date);
  await saveDay(date, { calories_total: meals.reduce((s, m) => s + m.calories, 0) });
}

export async function addMeal(date: IsoDate, m: Omit<Meal, 'id'>): Promise<void> {
  check(await supabase.from('meals').insert({ user_id: await userId(), date, ...m }));
  logActivity('create', 'meals', date);
  await syncCalories(date);
}

export async function deleteMeal(date: IsoDate, id: string): Promise<void> {
  check(await supabase.from('meals').delete().eq('id', id));
  logActivity('delete', 'meals', id);
  await syncCalories(date);
}

export async function listExercises(date: IsoDate): Promise<Exercise[]> {
  return rows<Exercise>(await supabase.from('exercises').select('id, type, minutes').eq('date', date).order('updated_at'));
}

export async function addExercise(date: IsoDate, e: Omit<Exercise, 'id'>): Promise<void> {
  check(await supabase.from('exercises').insert({ user_id: await userId(), date, ...e }));
  logActivity('create', 'exercises', date);
}

export async function deleteExercise(id: string): Promise<void> {
  check(await supabase.from('exercises').delete().eq('id', id));
  logActivity('delete', 'exercises', id);
}

export async function listExpenses(date: IsoDate): Promise<Expense[]> {
  return rows<Expense>(await supabase.from('expenses').select('id, amount, category, note').eq('date', date).order('updated_at'));
}

export async function monthSpend(date: IsoDate): Promise<number> {
  const month = monthKey(date);
  const rows = check(
    await supabase.from('expenses').select('amount').gte('date', `${month}-01`).lte('date', `${month}-31`),
  ) as { amount: number }[];
  return rows.reduce((s, r) => s + Number(r.amount), 0);
}

export async function addExpense(date: IsoDate, e: Omit<Expense, 'id'>): Promise<void> {
  check(await supabase.from('expenses').insert({ user_id: await userId(), date, ...e }));
  logActivity('create', 'expenses', date);
}

export async function deleteExpense(id: string): Promise<void> {
  check(await supabase.from('expenses').delete().eq('id', id));
  logActivity('delete', 'expenses', id);
}

export async function getGoal(month: string): Promise<{ goal: MonthlyGoal; total: number } | null> {
  const goal = check(
    await supabase.from('monthly_goals').select('id, month, title, unit, target').eq('month', month).maybeSingle<MonthlyGoal>(),
  );
  if (!goal) return null;
  const progress = check(await supabase.from('goal_progress').select('date, amount').eq('goal_id', goal.id)) as {
    date: IsoDate;
    amount: number;
  }[];
  return {
    goal: { ...goal, target: Number(goal.target) },
    total: progress.reduce((s, p) => s + Number(p.amount), 0),
  };
}

export async function createGoal(month: string, g: Pick<MonthlyGoal, 'title' | 'unit' | 'target'>): Promise<void> {
  check(await supabase.from('monthly_goals').insert({ user_id: await userId(), month, ...g }));
  logActivity('create', 'monthly_goals', month);
}

export async function addGoalProgress(goalId: string, date: IsoDate, amount: number): Promise<void> {
  check(await supabase.from('goal_progress').insert({ user_id: await userId(), goal_id: goalId, date, amount }));
  logActivity('create', 'goal_progress', date);
}

export async function listCycles(): Promise<Cycle[]> {
  return rows<Cycle>(await supabase.from('cycles').select('id, start_date, end_date').order('start_date'));
}

export async function startCycle(date: IsoDate): Promise<void> {
  check(await supabase.from('cycles').upsert({ user_id: await userId(), start_date: date }, { onConflict: 'user_id,start_date' }));
  logActivity('create', 'cycles', date);
}

export async function endCycle(id: string, date: IsoDate): Promise<void> {
  check(await supabase.from('cycles').update({ end_date: date }).eq('id', id));
  logActivity('update', 'cycles', id);
}

// MongoDB side, through the API.
export interface Food { id: string; barcode: string; name: string; brand: string | null; kcalPer100g: number | null; kcalPerServing: number | null; servingSize: string | null }

export function lookupBarcode(barcode: string): Promise<Food> {
  return api<Food>(`/foods/barcode/${encodeURIComponent(barcode)}`);
}

export async function getNote(date: IsoDate, kind: 'mood' | 'period' | 'goal'): Promise<string> {
  const { notes } = await api<{ notes: { date: string; kind: string; text: string }[] }>(`/notes?from=${date}&to=${date}`);
  return notes.find((n) => n.kind === kind)?.text ?? '';
}

export async function saveNote(date: IsoDate, kind: 'mood' | 'period' | 'goal', text: string): Promise<void> {
  if (!text.trim()) {
    await api(`/notes/${date}/${kind}`, { method: 'DELETE' });
    return;
  }
  await api(`/notes/${date}/${kind}`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ text: text.trim() }),
  });
}

/** Fire-and-forget: the activity log is nice to have and must never block logging. */
function logActivity(action: 'create' | 'update' | 'delete', entity: string, entityId: string): void {
  api('/activity', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ device: null, events: [{ action, entity, entityId, at: new Date().toISOString() }] }),
  }).catch(() => {});
}

/** One line per tracker for the Today cards; null means nothing logged yet. */
export async function daySummary(date: IsoDate, currency: string): Promise<Partial<Record<string, string | null>>> {
  const [day, exercises, expenses, goal] = await Promise.all([getDay(date), listExercises(date), listExpenses(date), getGoal(monthKey(date))]);
  const money = (n: number) => new Intl.NumberFormat(undefined, { style: 'currency', currency, maximumFractionDigits: 0 }).format(n);
  const moods = ['', '😞', '🙁', '😐', '🙂', '😄'];
  const exMin = exercises.reduce((s, e) => s + e.minutes, 0);
  const spent = expenses.reduce((s, e) => s + Number(e.amount), 0);
  return {
    mood: day?.mood_score ? `${moods[day.mood_score]} ${day.mood_score}/5` : null,
    calories: day?.calories_total ? `${day.calories_total} kcal` : null,
    monthlyGoal: goal ? `${goal.total} / ${goal.goal.target} ${goal.goal.unit}` : 'No goal set',
    water: day?.water_ml ? `${day.water_ml} ml` : null,
    sleep: day?.sleep_hours ? `${day.sleep_hours} h` : null,
    exercise: exMin ? `${exMin} min` : null,
    expenses: expenses.length ? money(spent) : null,
    period: day?.period_flow ? `${day.period_flow[0].toUpperCase()}${day.period_flow.slice(1)} flow` : null,
  };
}
