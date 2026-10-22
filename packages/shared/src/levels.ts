/**
 * Every tracker maps a day to a 0-4 level, like GitHub's contribution grid.
 * 0 always means "nothing logged". The 2D grid colours by level; the 3D skyline
 * uses the raw value for height, so both views read from the same data.
 */
export type Level = 0 | 1 | 2 | 3 | 4;

export interface Targets {
  calories: number;
  waterMl: number;
  sleepHours: number;
  exerciseMinutesPerWeek: number;
  budgetPerMonth: number;
}

export const DEFAULT_TARGETS: Targets = {
  calories: 2000,
  waterMl: 2000,
  sleepHours: 8,
  exerciseMinutesPerWeek: 150,
  budgetPerMonth: 0,
};

export type PeriodFlow = 'light' | 'medium' | 'heavy';

function clampLevel(n: number): Level {
  return Math.max(0, Math.min(4, Math.round(n))) as Level;
}

/** Fraction of a target, banded so 0 < f < 0.25 is level 1 and f >= 1 is level 4. */
export function levelFromRatio(value: number | null | undefined, target: number): Level {
  if (value == null || value <= 0 || target <= 0) return 0;
  const ratio = value / target;
  if (ratio >= 1) return 4;
  if (ratio >= 0.75) return 3;
  if (ratio >= 0.5) return 2;
  return 1;
}

/** Mood 1-5 maps to levels 1-4 (1 and 2 share the lowest band so 0 stays "not logged"). */
export function moodLevel(score: number | null | undefined): Level {
  if (score == null || score < 1) return 0;
  return clampLevel(Math.max(1, score - 1));
}

export function waterLevel(ml: number | null | undefined, t: Targets): Level {
  return levelFromRatio(ml, t.waterMl);
}

export function sleepLevel(hours: number | null | undefined, t: Targets): Level {
  return levelFromRatio(hours, t.sleepHours);
}

/** Daily exercise is judged against a seventh of the weekly target. */
export function exerciseLevel(minutes: number | null | undefined, t: Targets): Level {
  return levelFromRatio(minutes, t.exerciseMinutesPerWeek / 7);
}

export interface CalorieShade {
  level: Level;
  /** True when the day went over target; the UI draws these in a warm colour. */
  over: boolean;
}

export function calorieShade(kcal: number | null | undefined, t: Targets): CalorieShade {
  if (kcal == null || kcal <= 0) return { level: 0, over: false };
  if (kcal > t.calories * 1.1) return { level: 4, over: true };
  return { level: levelFromRatio(kcal, t.calories), over: false };
}

/**
 * Spending shade is relative to an even daily share of the monthly budget,
 * so quiet days stay light. Without a budget, any spend is level 1-4 by amount bands.
 */
export function expenseLevel(amount: number | null | undefined, t: Targets, daysInMonth = 30): Level {
  if (amount == null || amount <= 0) return 0;
  if (t.budgetPerMonth <= 0) return 2;
  const daily = t.budgetPerMonth / daysInMonth;
  const ratio = amount / daily;
  if (ratio >= 2) return 4;
  if (ratio >= 1) return 3;
  if (ratio >= 0.5) return 2;
  return 1;
}

/** Any progress logged toward the month's goal counts; bigger chunks shade darker. */
export function monthlyGoalLevel(amount: number | null | undefined, target: number, daysInMonth = 30): Level {
  if (amount == null || amount <= 0 || target <= 0) return 0;
  return levelFromRatio(amount, (target / daysInMonth) * 2);
}

const FLOW_LEVEL: Record<PeriodFlow, Level> = { light: 2, medium: 3, heavy: 4 };

export function periodLevel(flow: PeriodFlow | null | undefined): Level {
  return flow ? FLOW_LEVEL[flow] : 0;
}

/** The "All" grid: how many visible trackers were logged that day, scaled to 0-4. */
export function allLevel(loggedCount: number, trackerCount: number): Level {
  if (loggedCount <= 0 || trackerCount <= 0) return 0;
  return levelFromRatio(loggedCount, trackerCount);
}
