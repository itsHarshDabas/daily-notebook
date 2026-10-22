import { parseIsoDate, toIsoDate, type IsoDate } from './grid.ts';
import {
  allLevel,
  calorieShade,
  exerciseLevel,
  expenseLevel,
  monthlyGoalLevel,
  moodLevel,
  periodLevel,
  sleepLevel,
  waterLevel,
  type Level,
  type PeriodFlow,
  type Targets,
} from './levels.ts';
import type { TrackerKey } from './trackers.ts';

/** Everything the grids need about one day, merged from the tracker tables. */
export interface DayValues {
  mood?: number | null;
  calories?: number | null;
  water?: number | null;
  sleep?: number | null;
  exercise?: number | null;
  expenses?: number | null;
  monthlyGoal?: number | null;
  period?: PeriodFlow | null;
}

export type HistoryKey = TrackerKey | 'all';

export interface LevelContext {
  targets: Targets;
  /** Monthly goal target by month (YYYY-MM), so each month's days shade against that month's goal. */
  goalTargets?: Record<string, number>;
  /** Trackers that count toward the "All" grid. */
  visible: TrackerKey[];
}

export function isLogged(key: TrackerKey, v: DayValues | undefined): boolean {
  const x = v?.[key];
  return x != null && x !== 0;
}

function daysInMonth(date: IsoDate): number {
  const d = parseIsoDate(date);
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
}

export interface Shade {
  level: Level;
  /** Calories over target; drawn in a warning colour. */
  over?: boolean;
}

export function shadeFor(key: HistoryKey, date: IsoDate, v: DayValues | undefined, ctx: LevelContext): Shade {
  if (!v) return { level: 0 };
  const t = ctx.targets;
  switch (key) {
    case 'all':
      return { level: allLevel(ctx.visible.filter((k) => isLogged(k, v)).length, ctx.visible.length) };
    case 'mood':
      return { level: moodLevel(v.mood) };
    case 'calories':
      return calorieShade(v.calories, t);
    case 'water':
      return { level: waterLevel(v.water, t) };
    case 'sleep':
      return { level: sleepLevel(v.sleep, t) };
    case 'exercise':
      return { level: exerciseLevel(v.exercise, t) };
    case 'expenses':
      return { level: expenseLevel(v.expenses, t, daysInMonth(date)) };
    case 'monthlyGoal':
      return { level: monthlyGoalLevel(v.monthlyGoal, ctx.goalTargets?.[date.slice(0, 7)] ?? 0, daysInMonth(date)) };
    case 'period':
      return { level: periodLevel(v.period) };
  }
}

/** Raw number behind a day, used for the skyline's bar heights. */
export function rawValue(key: HistoryKey, v: DayValues | undefined, ctx: LevelContext): number {
  if (!v) return 0;
  if (key === 'all') return ctx.visible.filter((k) => isLogged(k, v)).length;
  if (key === 'period') return periodLevel(v.period);
  return Number(v[key] ?? 0);
}

export interface HistoryStats {
  daysLogged: number;
  currentStreak: number;
  longestStreak: number;
  /** Mean of logged days' raw values; null for "all" and period. */
  average: number | null;
}

/**
 * Streaks count consecutive logged days. The current streak still counts if today
 * isn't logged yet but yesterday was, so it doesn't reset first thing in the morning.
 */
export function computeStats(key: HistoryKey, values: Map<IsoDate, DayValues>, today: Date, ctx: LevelContext, days = 371): HistoryStats {
  const logged = (d: IsoDate) => {
    const v = values.get(d);
    return key === 'all' ? ctx.visible.some((k) => isLogged(k, v)) : isLogged(key, v);
  };
  const dates: IsoDate[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i);
    dates.push(toIsoDate(d));
  }

  let longest = 0;
  let run = 0;
  let count = 0;
  let sum = 0;
  for (const d of dates) {
    if (logged(d)) {
      run++;
      count++;
      if (key !== 'all' && key !== 'period') sum += Number(values.get(d)?.[key] ?? 0);
      longest = Math.max(longest, run);
    } else run = 0;
  }

  let current = 0;
  let i = dates.length - 1;
  if (!logged(dates[i])) i--;
  for (; i >= 0 && logged(dates[i]); i--) current++;

  return {
    daysLogged: count,
    currentStreak: current,
    longestStreak: longest,
    average: key === 'all' || key === 'period' || count === 0 ? null : Math.round((sum / count) * 10) / 10,
  };
}
