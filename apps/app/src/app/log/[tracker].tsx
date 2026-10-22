import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { TRACKER_LABELS, parseIsoDate, showsPeriodTracker, toIsoDate, type IsoDate, type TrackerKey } from '@daily-notebook/shared';

import { CaloriesLog } from '@/components/log/calories';
import { ExerciseLog } from '@/components/log/exercise';
import { ExpensesLog } from '@/components/log/expenses';
import { GoalLog } from '@/components/log/goal';
import { MoodLog } from '@/components/log/mood';
import { PeriodLog } from '@/components/log/period';
import { SleepLog } from '@/components/log/sleep';
import { WaterLog } from '@/components/log/water';
import { Button, Empty, IconButton, Screen, Text } from '@/components/ui';
import { Radius, Spacing, TrackerColors } from '@/constants/theme';
import { TrackerIcons } from '@/constants/trackers';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth';

function shift(date: IsoDate, days: number): IsoDate {
  const d = parseIsoDate(date);
  d.setDate(d.getDate() + days);
  return toIsoDate(d);
}

function label(date: IsoDate, today: IsoDate): string {
  if (date === today) return 'Today';
  if (date === shift(today, -1)) return 'Yesterday';
  return parseIsoDate(date).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
}

export default function LogScreen() {
  const theme = useTheme();
  const { tracker, date: dateParam } = useLocalSearchParams<{ tracker: TrackerKey; date?: string }>();
  const { profile } = useAuth();
  const today = toIsoDate(new Date());
  // Backfilling is allowed; future days are not.
  const date = dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam) && dateParam <= today ? dateParam : today;
  const close = () => (router.canGoBack() ? router.back() : router.replace('/'));
  const go = (d: IsoDate) => router.setParams({ date: d });

  const known = tracker in TRACKER_LABELS && (tracker !== 'period' || (profile != null && showsPeriodTracker(profile)));
  const color = known ? TrackerColors[tracker] : theme.textTertiary;

  const header = (
    <View style={[styles.header, { borderColor: theme.border }]}>
      <View style={[styles.icon, { backgroundColor: `${color}1F` }]}>
        <Ionicons name={known ? TrackerIcons[tracker] : 'help-outline'} size={22} color={color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text variant="title" numberOfLines={1}>
          {known ? TRACKER_LABELS[tracker] : 'Not found'}
        </Text>
        <View style={styles.dateRow}>
          <IconButton icon="chevron-back" label="Previous day" onPress={() => go(shift(date, -1))} />
          <Text variant="bodyStrong" color="textSecondary" style={styles.dateText}>
            {label(date, today)}
          </Text>
          {date < today ? <IconButton icon="chevron-forward" label="Next day" onPress={() => go(shift(date, 1))} /> : null}
        </View>
      </View>
      <Button title="Done" compact variant="secondary" onPress={close} />
    </View>
  );

  return (
    <Screen header={header} edges={['top', 'bottom']}>
      {!known ? <Empty icon="help-circle-outline" text="This tracker doesn't exist." /> : null}
      {/* key={date} resets each form's local state when the day changes. */}
      {tracker === 'mood' && <MoodLog key={date} date={date} onDone={close} />}
      {tracker === 'calories' && <CaloriesLog key={date} date={date} />}
      {tracker === 'monthlyGoal' && <GoalLog key={date} date={date} />}
      {tracker === 'water' && <WaterLog key={date} date={date} />}
      {tracker === 'sleep' && <SleepLog key={date} date={date} onDone={close} />}
      {tracker === 'exercise' && <ExerciseLog key={date} date={date} />}
      {tracker === 'expenses' && <ExpensesLog key={date} date={date} />}
      {tracker === 'period' && known && <PeriodLog key={date} date={date} onDone={close} />}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  icon: { width: 44, height: 44, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, marginTop: 4 },
  dateText: { minWidth: 90, textAlign: 'center' },
});
