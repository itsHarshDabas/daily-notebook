import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import {
  DEFAULT_TARGETS,
  TRACKER_LABELS,
  computeStats,
  rawValue,
  shadeFor,
  visibleTrackers,
  type HistoryKey,
  type IsoDate,
  type LevelContext,
  type Targets,
} from '@daily-notebook/shared';

import { ContributionGrid } from '@/components/contribution-grid';
import { Skyline } from '@/components/skyline';
import { SyncBanner } from '@/components/sync-banner';
import { Banner, Button, Card, Chip, Screen, Segmented, Text } from '@/components/ui';
import { Spacing, TrackerColors } from '@/constants/theme';
import { TrackerIcons } from '@/constants/trackers';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth';
import { getTargets } from '@/lib/data';
import { loadHistory, type HistoryData } from '@/lib/history';

const UNITS: Partial<Record<HistoryKey, string>> = {
  mood: '/5',
  calories: ' kcal',
  water: ' ml',
  sleep: ' h',
  exercise: ' min',
};

export default function HistoryScreen() {
  const theme = useTheme();
  const { profile } = useAuth();
  const end = useMemo(() => new Date(), []);
  const [data, setData] = useState<HistoryData | null>(null);
  const [targets, setTargets] = useState<Targets>(DEFAULT_TARGETS);
  const [error, setError] = useState<string | null>(null);
  const [key, setKey] = useState<HistoryKey>('all');
  const [view, setView] = useState<'grid' | 'skyline'>('grid');
  const [selected, setSelected] = useState<IsoDate | null>(null);

  useFocusEffect(
    useCallback(() => {
      const from = new Date(end);
      from.setDate(from.getDate() - 53 * 7);
      Promise.all([loadHistory(from, end), getTargets()]).then(
        ([h, t]) => {
          setData(h);
          setTargets(t);
          setError(null);
        },
        (e: Error) => setError(e.message),
      );
    }, [end]),
  );

  const trackers = profile ? visibleTrackers(profile) : [];
  const ctx: LevelContext = useMemo(
    () => ({ targets, goalTargets: data?.goalTargets, visible: trackers }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [targets, data, trackers.length],
  );
  const values = data?.values;
  const shade = useCallback((d: IsoDate) => shadeFor(key, d, values?.get(d), ctx), [key, values, ctx]);
  const raw = useCallback((d: IsoDate) => rawValue(key, values?.get(d), ctx), [key, values, ctx]);
  const stats = useMemo(() => (values ? computeStats(key, values, end, ctx) : null), [key, values, end, ctx]);
  const color = key === 'all' ? theme.accent : TrackerColors[key];
  const overColor = key === 'calories' ? theme.warning : undefined;
  const money = (n: number) => new Intl.NumberFormat(undefined, { style: 'currency', currency: profile?.currency ?? 'INR', maximumFractionDigits: 0 }).format(n);
  const avg = stats?.average == null ? '—' : key === 'expenses' ? money(stats.average) : `${stats.average}${UNITS[key] ?? ''}`;

  const day = selected ? values?.get(selected) : undefined;

  if (!profile) return null;
  return (
    <Screen>
      <View style={{ gap: 2 }}>
        <Text variant="micro" color="textSecondary">
          Last 12 months
        </Text>
        <Text variant="display">History</Text>
      </View>
      <SyncBanner />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        <Chip label="All" icon="apps-outline" selected={key === 'all'} onPress={() => setKey('all')} />
        {trackers.map((t) => (
          <Chip key={t} label={TRACKER_LABELS[t]} icon={TrackerIcons[t]} color={TrackerColors[t]} selected={key === t} onPress={() => setKey(t)} />
        ))}
      </ScrollView>

      <View style={styles.stats}>
        <Stat label="Days logged" value={stats ? String(stats.daysLogged) : '—'} />
        <Stat label="Current streak" value={stats ? `${stats.currentStreak}d` : '—'} accent={stats?.currentStreak ? color : undefined} />
        <Stat label="Best streak" value={stats ? `${stats.longestStreak}d` : '—'} />
        <Stat label="Average" value={avg} />
      </View>

      <Card style={{ gap: Spacing.three }}>
        <View style={styles.cardHead}>
          <Text variant="heading">{key === 'all' ? 'Everything' : TRACKER_LABELS[key]}</Text>
          <View style={{ width: 190 }}>
            <Segmented
              value={view}
              onChange={setView}
              options={[
                { value: 'grid', label: 'Grid', icon: 'grid-outline' },
                { value: 'skyline', label: '3D', icon: 'cube-outline' },
              ]}
            />
          </View>
        </View>
        {error ? <Banner text={error} /> : null}
        {view === 'grid' ? (
          <ContributionGrid end={end} shade={shade} color={color} overColor={overColor} selected={selected} onPressDay={setSelected} />
        ) : (
          <Skyline end={end} value={raw} shade={shade} color={color} overColor={overColor} />
        )}
      </Card>

      {selected ? (
        <Card style={{ gap: Spacing.two }}>
          <View style={styles.cardHead}>
            <Text variant="heading">{new Date(selected + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</Text>
            <Ionicons name="close" size={20} color={theme.textTertiary} onPress={() => setSelected(null)} accessibilityLabel="Close day" />
          </View>
          {trackers.map((t) => {
            const v = day?.[t];
            if (v == null || v === 0) return null;
            const text = t === 'expenses' ? money(Number(v)) : t === 'period' ? String(v) : `${v}${UNITS[t] ?? ''}`;
            return (
              <View key={t} style={styles.dayRow}>
                <Ionicons name={TrackerIcons[t]} size={16} color={TrackerColors[t]} />
                <Text style={{ flex: 1 }} color="textSecondary">
                  {TRACKER_LABELS[t]}
                </Text>
                <Text variant="bodyStrong">{text}</Text>
              </View>
            );
          })}
          {!day || trackers.every((t) => day[t] == null || day[t] === 0) ? <Text color="textTertiary">Nothing logged this day.</Text> : null}
          <Button
            title="Edit this day"
            variant="secondary"
            icon="create-outline"
            compact
            onPress={() => router.push({ pathname: '/log/[tracker]', params: { tracker: key === 'all' ? 'mood' : key, date: selected } })}
          />
        </Card>
      ) : (
        <Text variant="caption" color="textTertiary" style={{ textAlign: 'center' }}>
          Tap a square to see that day.
        </Text>
      )}
    </Screen>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <Card style={styles.stat}>
      <Text variant="number" tint={accent} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      <Text variant="caption" color="textSecondary">
        {label}
      </Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  chips: { gap: 8, paddingRight: 8 },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  stat: { flexBasis: '45%', flexGrow: 1, gap: 2 },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two },
  dayRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, paddingVertical: 4 },
});
