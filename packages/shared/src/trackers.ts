export type Gender = 'female' | 'male' | 'other' | 'prefer_not_to_say';

export type TrackerKey =
  | 'mood'
  | 'calories'
  | 'monthlyGoal'
  | 'water'
  | 'sleep'
  | 'exercise'
  | 'expenses'
  | 'period';

export const CORE_TRACKERS: readonly TrackerKey[] = [
  'mood',
  'calories',
  'monthlyGoal',
  'water',
  'sleep',
  'exercise',
  'expenses',
];

export const TRACKER_LABELS: Record<TrackerKey, string> = {
  mood: 'Mood',
  calories: 'Calories',
  monthlyGoal: 'Monthly goal',
  water: 'Water',
  sleep: 'Sleep',
  exercise: 'Exercise',
  expenses: 'Expenses',
  period: 'Period',
};

export interface ProfileVisibility {
  gender: Gender | null;
  periodTrackingHidden: boolean;
}

/** Period tracking is the hidden 8th tracker: shown only to female users who haven't hidden it. */
export function showsPeriodTracker(profile: ProfileVisibility): boolean {
  return profile.gender === 'female' && !profile.periodTrackingHidden;
}

export function visibleTrackers(profile: ProfileVisibility): TrackerKey[] {
  return showsPeriodTracker(profile) ? [...CORE_TRACKERS, 'period'] : [...CORE_TRACKERS];
}
