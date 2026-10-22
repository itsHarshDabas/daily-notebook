import type { ComponentProps } from 'react';
import type Ionicons from '@expo/vector-icons/Ionicons';

import type { Gender, TrackerKey } from '@daily-notebook/shared';

export type IconName = ComponentProps<typeof Ionicons>['name'];

export const TrackerIcons: Record<TrackerKey, IconName> = {
  mood: 'happy-outline',
  calories: 'restaurant-outline',
  monthlyGoal: 'flag-outline',
  water: 'water-outline',
  sleep: 'moon-outline',
  exercise: 'barbell-outline',
  expenses: 'wallet-outline',
  period: 'flower-outline',
};

export const GENDERS: { value: Gender; label: string }[] = [
  { value: 'female', label: 'Female' },
  { value: 'male', label: 'Male' },
  { value: 'other', label: 'Other' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' },
];
