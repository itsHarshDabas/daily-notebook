import { toIsoDate, type DayValues, type IsoDate } from '@daily-notebook/shared';

import { readThrough } from './offline';
import { supabase } from './supabase';

export interface HistoryData {
  values: Map<IsoDate, DayValues>;
  goalTargets: Record<string, number>;
}

type Raw = {
  days: { date: IsoDate; mood_score: number | null; calories_total: number | null; water_ml: number | null; sleep_hours: number | null; period_flow: DayValues['period'] }[];
  exercises: { date: IsoDate; minutes: number }[];
  expenses: { date: IsoDate; amount: number }[];
  progress: { date: IsoDate; amount: number }[];
  goals: { month: string; target: number }[];
};

function list<T>(res: { data: T[] | null; error: { message: string } | null }): T[] {
  if (res.error) throw new Error(res.error.message);
  return res.data ?? [];
}

/** Every tracker's value per day between `from` and `to`, for the grids and stats. */
export async function loadHistory(from: Date, to: Date): Promise<HistoryData> {
  const range = { from: toIsoDate(from), to: toIsoDate(to) };
  const raw = await readThrough<Raw>(`history:${range.from}:${range.to}`, async () => {
    const [days, exercises, expenses, progress, goals] = await Promise.all([
      supabase.from('days').select('date, mood_score, calories_total, water_ml, sleep_hours, period_flow').gte('date', range.from).lte('date', range.to),
      supabase.from('exercises').select('date, minutes').gte('date', range.from).lte('date', range.to),
      supabase.from('expenses').select('date, amount').gte('date', range.from).lte('date', range.to),
      supabase.from('goal_progress').select('date, amount').gte('date', range.from).lte('date', range.to),
      supabase.from('monthly_goals').select('month, target').gte('month', range.from.slice(0, 7)).lte('month', range.to.slice(0, 7)),
    ]);
    return { days: list(days), exercises: list(exercises), expenses: list(expenses), progress: list(progress), goals: list(goals) };
  });

  const values = new Map<IsoDate, DayValues>();
  const at = (date: IsoDate) => {
    let v = values.get(date);
    if (!v) values.set(date, (v = {}));
    return v;
  };
  for (const d of raw.days) {
    const v = at(d.date);
    v.mood = d.mood_score;
    v.calories = d.calories_total;
    v.water = d.water_ml;
    v.sleep = d.sleep_hours == null ? null : Number(d.sleep_hours);
    v.period = d.period_flow;
  }
  for (const e of raw.exercises) at(e.date).exercise = (at(e.date).exercise ?? 0) + e.minutes;
  for (const e of raw.expenses) at(e.date).expenses = (at(e.date).expenses ?? 0) + Number(e.amount);
  for (const p of raw.progress) at(p.date).monthlyGoal = (at(p.date).monthlyGoal ?? 0) + Number(p.amount);

  const goalTargets: Record<string, number> = {};
  for (const g of raw.goals) goalTargets[g.month] = Number(g.target);
  return { values, goalTargets };
}
