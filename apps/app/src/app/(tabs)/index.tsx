import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { TRACKER_LABELS, isLogged, toIsoDate, visibleTrackers, type DayValues, type TrackerKey } from '@daily-notebook/shared';

import { Avatar } from '@/components/avatar';
import { SyncBanner } from '@/components/sync-banner';
import { Card, ProgressRing, Screen, SectionHeader, Text } from '@/components/ui';
import { Radius, Spacing, TrackerColors, levelColor } from '@/constants/theme';
import { TrackerIcons } from '@/constants/trackers';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth';
import { daySummary, type TodayCard } from '@/lib/data';
import { loadHistory } from '@/lib/history';

function greeting(d: Date) {
  const h = d.getHours();
  return h < 5 ? 'Good night' : h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

const PROMPTS: Record<TrackerKey, string> = {
  mood: 'How are you feeling?',
  calories: 'Log a meal',
  monthlyGoal: 'Set this month’s goal',
  water: 'Add a glass',
  sleep: 'How did you sleep?',
  exercise: 'Log a workout',
  expenses: 'Add a spend',
  period: 'Log your cycle',
};

export default function TodayScreen() {
  const theme = useTheme();
  const { profile } = useAuth();
  const [cards, setCards] = useState<Record<string, TodayCard>>({});
  const [week, setWeek] = useState<{ date: string; label: string; count: number }[]>([]);
  const currency = profile?.currency ?? 'INR';
  const now = new Date();
  const trackers = profile ? visibleTrackers(profile) : [];

  // Refresh whenever the tab comes back into view, e.g. after closing a log screen.
  useFocusEffect(
    useCallback(() => {
      const today = new Date();
      daySummary(toIsoDate(today), currency).then(setCards, (e: Error) => console.warn('Could not load today', e.message));
      const from = new Date(today);
      from.setDate(today.getDate() - 6);
      loadHistory(from, today).then(
        ({ values }) =>
          setWeek(
            Array.from({ length: 7 }, (_, i) => {
              const d = new Date(from);
              d.setDate(from.getDate() + i);
              const iso = toIsoDate(d);
              const v: DayValues | undefined = values.get(iso);
              return { date: iso, label: d.toLocaleDateString(undefined, { weekday: 'narrow' }), count: trackers.filter((t) => isLogged(t, v)).length };
            }),
          ),
        () => {},
      );
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currency, trackers.length]),
  );

  if (!profile) return null;
  const done = trackers.filter((t) => cards[t]?.value).length;

  return (
    <Screen>
      <View style={styles.header}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="micro" color="textSecondary">
            {now.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}
          </Text>
          <Text variant="display" numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.8}>
            {greeting(now)}
            {profile.name ? `, ${profile.name.split(' ')[0]}` : ''}
          </Text>
        </View>
        <Avatar size={44} />
      </View>

      <SyncBanner />

      <Card style={styles.summary}>
        <ProgressRing progress={trackers.length ? done / trackers.length : 0} size={64} stroke={7} color={theme.accent}>
          <Text variant="bodyStrong">
            {done}/{trackers.length}
          </Text>
        </ProgressRing>
        <View style={{ flex: 1, gap: 8 }}>
          <Text variant="heading">{done === trackers.length && done > 0 ? 'All done for today' : `${trackers.length - done} left to log today`}</Text>
          <View style={styles.week}>
            {week.map((d) => (
              <View key={d.date} style={styles.weekDay}>
                <View
                  style={[
                    styles.weekCell,
                    { backgroundColor: levelColor(theme.accent, d.count === 0 ? 0 : Math.ceil((d.count / Math.max(1, trackers.length)) * 4), theme.gridEmpty) },
                  ]}
                />
                <Text variant="caption" color="textTertiary" style={{ fontSize: 10 }}>
                  {d.label}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </Card>

      <SectionHeader title="Trackers" />
      <View style={styles.grid}>
        {trackers.map((t) => {
          const color = TrackerColors[t];
          const card = cards[t];
          return (
            <Card
              key={t}
              style={styles.card}
              accessibilityLabel={`${TRACKER_LABELS[t]}: ${card?.value ?? 'not logged'}`}
              onPress={() => router.push({ pathname: '/log/[tracker]', params: { tracker: t } })}>
              <View style={styles.cardTop}>
                <View style={[styles.icon, { backgroundColor: `${color}1F` }]}>
                  <Ionicons name={TrackerIcons[t]} size={18} color={color} />
                </View>
                {card?.progress != null ? <ProgressRing progress={card.progress} size={26} stroke={3.5} color={color} /> : null}
              </View>
              <Text variant="caption" color="textSecondary">
                {TRACKER_LABELS[t]}
              </Text>
              {card?.value ? (
                <Text variant="heading" numberOfLines={1}>
                  {card.value}
                </Text>
              ) : (
                <View style={styles.prompt}>
                  <Text variant="caption" color="textTertiary" numberOfLines={1} style={{ flexShrink: 1 }}>
                    {PROMPTS[t]}
                  </Text>
                  <Ionicons name="add-circle" size={16} color={color} />
                </View>
              )}
            </Card>
          );
        })}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  summary: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  week: { flexDirection: 'row', gap: 6 },
  weekDay: { alignItems: 'center', gap: 3 },
  weekCell: { width: 18, height: 18, borderRadius: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  card: { flexBasis: '45%', flexGrow: 1, gap: 4, minHeight: 112 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  icon: { width: 34, height: 34, borderRadius: Radius.sm, alignItems: 'center', justifyContent: 'center' },
  prompt: { flexDirection: 'row', alignItems: 'center', gap: 4 },
});
