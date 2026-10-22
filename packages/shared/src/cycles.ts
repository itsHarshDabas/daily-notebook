import { parseIsoDate, toIsoDate, type IsoDate } from './grid.ts';

export interface CycleStart {
  startDate: IsoDate;
}

const DAY_MS = 86_400_000;

/** Average cycle length in days from consecutive starts, using the most recent `window` cycles. */
export function averageCycleLength(starts: CycleStart[], window = 6): number | null {
  const sorted = starts.map((s) => parseIsoDate(s.startDate).getTime()).sort((a, b) => a - b);
  const lengths: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    lengths.push(Math.round((sorted[i] - sorted[i - 1]) / DAY_MS));
  }
  const recent = lengths.slice(-window);
  if (recent.length < 1) return null;
  return Math.round(recent.reduce((a, b) => a + b, 0) / recent.length);
}

/**
 * Predicted next start = last start + average length. Needs 2 logged starts
 * (one full cycle); returns null before that.
 */
export function predictNextStart(starts: CycleStart[]): IsoDate | null {
  const avg = averageCycleLength(starts);
  if (avg == null) return null;
  const last = starts.map((s) => s.startDate).sort().at(-1)!;
  const next = parseIsoDate(last);
  next.setDate(next.getDate() + avg);
  return toIsoDate(next);
}
