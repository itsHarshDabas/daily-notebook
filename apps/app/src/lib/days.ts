import { CORE_TRACKERS, toIsoDate, type IsoDate, type TrackerKey } from '@daily-notebook/shared';

import { supabase } from './supabase';

export interface DayRow {
  date: IsoDate;
  mood_score: number | null;
  calories_total: number | null;
  water_ml: number | null;
  sleep_hours: number | null;
  period_flow: 'light' | 'medium' | 'heavy' | null;
}

export interface DaySummary {
  date: IsoDate;
  logged: Set<TrackerKey>;
}

/**
 * Which trackers were logged on each day between `from` and `to`, merging the day rows
 * with the per-entry tables (exercise, expenses, monthly goal progress).
 */
export async function loadDaySummaries(from: Date, to: Date): Promise<Map<IsoDate, DaySummary>> {
  const range = { from: toIsoDate(from), to: toIsoDate(to) };
  const [days, exercises, expenses, progress] = await Promise.all([
    supabase.from('days').select('date, mood_score, calories_total, water_ml, sleep_hours, period_flow').gte('date', range.from).lte('date', range.to),
    supabase.from('exercises').select('date').gte('date', range.from).lte('date', range.to),
    supabase.from('expenses').select('date').gte('date', range.from).lte('date', range.to),
    supabase.from('goal_progress').select('date').gte('date', range.from).lte('date', range.to),
  ]);
  const error = days.error ?? exercises.error ?? expenses.error ?? progress.error;
  if (error) throw error;

  const out = new Map<IsoDate, DaySummary>();
  const mark = (date: IsoDate, key: TrackerKey) => {
    const s = out.get(date) ?? { date, logged: new Set<TrackerKey>() };
    s.logged.add(key);
    out.set(date, s);
  };
  for (const d of (days.data ?? []) as DayRow[]) {
    if (d.mood_score != null) mark(d.date, 'mood');
    if (d.calories_total) mark(d.date, 'calories');
    if (d.water_ml) mark(d.date, 'water');
    if (d.sleep_hours) mark(d.date, 'sleep');
    if (d.period_flow) mark(d.date, 'period');
  }
  for (const r of exercises.data ?? []) mark(r.date, 'exercise');
  for (const r of expenses.data ?? []) mark(r.date, 'expenses');
  for (const r of progress.data ?? []) mark(r.date, 'monthlyGoal');
  return out;
}

export { CORE_TRACKERS };
