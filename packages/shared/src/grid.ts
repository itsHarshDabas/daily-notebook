/** Local calendar date as YYYY-MM-DD. Never a timestamp, so late-night entries don't drift days. */
export type IsoDate = string;

export function toIsoDate(d: Date): IsoDate {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function parseIsoDate(s: IsoDate): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export interface GridCell {
  date: IsoDate;
  /** 0 = Sunday ... 6 = Saturday, the row in the grid. */
  weekday: number;
  /** Column index, 0 = the oldest week shown. */
  week: number;
}

/**
 * Cells for a GitHub-style grid ending on `end` (inclusive), going back `weeks` columns.
 * The first column starts on a Sunday, so it may include days before the range; the last
 * column stops at `end`.
 */
export function buildGrid(end: Date, weeks = 53): GridCell[] {
  const last = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  const start = new Date(last);
  start.setDate(last.getDate() - last.getDay() - (weeks - 1) * 7);
  const cells: GridCell[] = [];
  for (let d = new Date(start), i = 0; d <= last; d.setDate(d.getDate() + 1), i++) {
    cells.push({ date: toIsoDate(d), weekday: d.getDay(), week: Math.floor(i / 7) });
  }
  return cells;
}
