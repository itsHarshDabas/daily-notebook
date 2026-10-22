import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  DEFAULT_TARGETS,
  allLevel,
  buildGrid,
  calorieShade,
  moodLevel,
  predictNextStart,
  showsPeriodTracker,
  visibleTrackers,
  waterLevel,
} from './index.ts';

test('period tracker shows only for female users who have not hidden it', () => {
  assert.equal(showsPeriodTracker({ gender: 'female', periodTrackingHidden: false }), true);
  assert.equal(showsPeriodTracker({ gender: 'female', periodTrackingHidden: true }), false);
  assert.equal(showsPeriodTracker({ gender: 'male', periodTrackingHidden: false }), false);
  assert.equal(showsPeriodTracker({ gender: null, periodTrackingHidden: false }), false);
  assert.equal(visibleTrackers({ gender: 'female', periodTrackingHidden: false }).length, 8);
  assert.equal(visibleTrackers({ gender: 'other', periodTrackingHidden: false }).length, 7);
});

test('water level bands against target', () => {
  const t = DEFAULT_TARGETS;
  assert.equal(waterLevel(0, t), 0);
  assert.equal(waterLevel(null, t), 0);
  assert.equal(waterLevel(400, t), 1);
  assert.equal(waterLevel(1000, t), 2);
  assert.equal(waterLevel(1600, t), 3);
  assert.equal(waterLevel(2500, t), 4);
});

test('mood keeps 0 for unlogged days', () => {
  assert.deepEqual([null, 1, 2, 3, 4, 5].map(moodLevel), [0, 1, 1, 2, 3, 4]);
});

test('calories over target are flagged', () => {
  assert.deepEqual(calorieShade(2500, DEFAULT_TARGETS), { level: 4, over: true });
  assert.deepEqual(calorieShade(2000, DEFAULT_TARGETS), { level: 4, over: false });
  assert.deepEqual(calorieShade(900, DEFAULT_TARGETS), { level: 1, over: false });
});

test('all-trackers level', () => {
  assert.equal(allLevel(0, 7), 0);
  assert.equal(allLevel(7, 7), 4);
  assert.equal(allLevel(4, 7), 2);
});

test('grid starts on a Sunday and ends on the given day', () => {
  const end = new Date(2026, 9, 22); // Thu 22 Oct 2026
  const cells = buildGrid(end, 53);
  assert.equal(cells[0].weekday, 0);
  assert.equal(cells.at(-1)!.date, '2026-10-22');
  assert.equal(cells.at(-1)!.week, 52);
  assert.equal(cells.length, 52 * 7 + 5);
});

test('next period prediction needs two starts', () => {
  assert.equal(predictNextStart([{ startDate: '2026-09-01' }]), null);
  assert.equal(
    predictNextStart([{ startDate: '2026-08-04' }, { startDate: '2026-09-01' }, { startDate: '2026-09-30' }]),
    '2026-10-29', // cycles of 28 and 29 days average to 28.5, rounded to 29
  );
});

test('sleep hours cross midnight', async () => {
  const { sleepHours, parseClock } = await import('./index.ts');
  assert.equal(sleepHours('23:30', '07:00'), 7.5);
  assert.equal(sleepHours('01:15', '09:00'), 7.8);
  assert.equal(sleepHours('22:00', '22:00'), 0);
  assert.equal(sleepHours('25:00', '07:00'), null);
  assert.equal(parseClock('7:05'), 425);
});
