import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { TRACKER_LABELS, showsPeriodTracker, toIsoDate, type TrackerKey } from '@daily-notebook/shared';

import { CaloriesLog } from '@/components/log/calories';
import { ExerciseLog } from '@/components/log/exercise';
import { ExpensesLog } from '@/components/log/expenses';
import { GoalLog } from '@/components/log/goal';
import { MoodLog } from '@/components/log/mood';
import { PeriodLog } from '@/components/log/period';
import { SleepLog } from '@/components/log/sleep';
import { WaterLog } from '@/components/log/water';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';

export default function LogScreen() {
  const { tracker, date: dateParam } = useLocalSearchParams<{ tracker: TrackerKey; date?: string }>();
  const { profile } = useAuth();
  const today = toIsoDate(new Date());
  // Backfilling is allowed; future days are not.
  const date = dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam) && dateParam <= today ? dateParam : today;
  const close = () => (router.canGoBack() ? router.back() : router.replace('/'));

  const known = tracker in TRACKER_LABELS && (tracker !== 'period' || (profile && showsPeriodTracker(profile)));

  return (
    <ThemedView style={styles.fill}>
      <SafeAreaView style={styles.fill} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <ThemedText type="subtitle">{known ? TRACKER_LABELS[tracker] : 'Not found'}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {date === today ? 'Today' : date}
            </ThemedText>
          </View>
          <Pressable onPress={close} accessibilityRole="button" hitSlop={12}>
            <ThemedText type="smallBold">Done</ThemedText>
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {tracker === 'mood' && <MoodLog date={date} onDone={close} />}
          {tracker === 'calories' && <CaloriesLog date={date} />}
          {tracker === 'monthlyGoal' && <GoalLog date={date} />}
          {tracker === 'water' && <WaterLog date={date} />}
          {tracker === 'sleep' && <SleepLog date={date} onDone={close} />}
          {tracker === 'exercise' && <ExerciseLog date={date} />}
          {tracker === 'expenses' && <ExpensesLog date={date} />}
          {tracker === 'period' && known && <PeriodLog date={date} onDone={close} />}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: Spacing.four, paddingTop: Spacing.three, gap: Spacing.three },
  content: { padding: Spacing.four, gap: Spacing.four, maxWidth: 560, width: '100%', alignSelf: 'center' },
});
