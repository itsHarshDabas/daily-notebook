/** Parses "HH:MM" (24-hour) into minutes after midnight, or null if invalid. */
export function parseClock(s: string): number | null {
  const m = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(s.trim());
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}

/** Hours slept between bedtime and wake time, crossing midnight if needed, to one decimal. */
export function sleepHours(bed: string, wake: string): number | null {
  const b = parseClock(bed);
  const w = parseClock(wake);
  if (b == null || w == null) return null;
  const minutes = (w - b + 24 * 60) % (24 * 60);
  return Math.round((minutes / 60) * 10) / 10;
}

export function monthKey(date: string): string {
  return date.slice(0, 7);
}
