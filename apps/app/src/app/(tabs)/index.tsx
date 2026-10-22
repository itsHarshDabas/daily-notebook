import { Image } from 'expo-image';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { TRACKER_LABELS, toIsoDate, visibleTrackers } from '@daily-notebook/shared';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing, TopTabInset } from '@/constants/theme';
import { avatarUrl } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { daySummary } from '@/lib/data';

export default function TodayScreen() {
  const { profile, session } = useAuth();
  const [summary, setSummary] = useState<Partial<Record<string, string | null>>>({});
  const currency = profile?.currency ?? 'INR';

  // Refresh whenever the tab comes back into view, e.g. after closing a log screen.
  useFocusEffect(
    useCallback(() => {
      daySummary(toIsoDate(new Date()), currency).then(setSummary, (e: Error) => console.warn('Could not load today', e.message));
    }, [currency]),
  );

  if (!profile) return null;
  const trackers = visibleTrackers(profile);

  return (
    <ThemedView style={styles.fill}>
      <SafeAreaView style={styles.fill}>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.header}>
            {profile.avatarFileId && session ? (
              <Image
                source={{ uri: avatarUrl(profile.avatarFileId), headers: { authorization: `Bearer ${session.access_token}` } }}
                style={styles.avatar}
              />
            ) : null}
            <ThemedText type="subtitle">Hi, {profile.name}</ThemedText>
          </View>
          <View style={styles.cards}>
            {trackers.map((t) => (
              <Pressable
                key={t}
                style={styles.cardWrap}
                accessibilityRole="button"
                onPress={() => router.push({ pathname: '/log/[tracker]', params: { tracker: t } })}>
                <ThemedView type="backgroundElement" style={styles.card}>
                  <ThemedText type="smallBold">{TRACKER_LABELS[t]}</ThemedText>
                  <ThemedText type="small" themeColor={summary[t] ? 'text' : 'textSecondary'}>
                    {summary[t] ?? 'Tap to log'}
                  </ThemedText>
                </ThemedView>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: {
    padding: Spacing.four,
    paddingTop: TopTabInset + Spacing.four,
    paddingBottom: BottomTabInset + Spacing.four,
    gap: Spacing.four,
    maxWidth: MaxContentWidth,
    width: '100%',
    alignSelf: 'center',
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  avatar: { width: 48, height: 48, borderRadius: 24 },
  cards: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.three },
  cardWrap: { flexBasis: '46%', flexGrow: 1 },
  card: { padding: Spacing.three, borderRadius: Spacing.three, gap: Spacing.one, minHeight: 72 },
});
