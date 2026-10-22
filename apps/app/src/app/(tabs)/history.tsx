import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { allLevel, visibleTrackers, type IsoDate } from '@daily-notebook/shared';

import { ContributionGrid } from '@/components/contribution-grid';
import { ErrorText } from '@/components/form';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { loadDaySummaries, type DaySummary } from '@/lib/days';

export default function HistoryScreen() {
  const { profile } = useAuth();
  const end = useMemo(() => new Date(), []);
  const [summaries, setSummaries] = useState<Map<IsoDate, DaySummary>>(new Map());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const from = new Date(end);
    from.setDate(from.getDate() - 53 * 7);
    loadDaySummaries(from, end)
      .then(setSummaries)
      .catch((e: Error) => setError(e.message));
  }, [end]);

  if (!profile) return null;
  const trackers = visibleTrackers(profile);
  const loggedDays = summaries.size;

  return (
    <ThemedView style={styles.fill}>
      <SafeAreaView style={styles.fill}>
        <ScrollView contentContainerStyle={styles.content}>
          <ThemedText type="subtitle">History</ThemedText>
          <ThemedText themeColor="textSecondary">
            {loggedDays} {loggedDays === 1 ? 'day' : 'days'} logged in the last year
          </ThemedText>
          <ContributionGrid
            end={end}
            levelFor={(date) => {
              const s = summaries.get(date);
              const count = s ? trackers.filter((t) => s.logged.has(t)).length : 0;
              return allLevel(count, trackers.length);
            }}
          />
          <ErrorText>{error}</ErrorText>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: {
    padding: Spacing.four,
    paddingBottom: BottomTabInset + Spacing.four,
    gap: Spacing.three,
    maxWidth: MaxContentWidth,
    width: '100%',
    alignSelf: 'center',
  },
});
