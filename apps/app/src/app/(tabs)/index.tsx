import { Image } from 'expo-image';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { TRACKER_LABELS, visibleTrackers } from '@daily-notebook/shared';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { avatarUrl } from '@/lib/api';
import { useAuth } from '@/lib/auth';

export default function TodayScreen() {
  const { profile, session } = useAuth();
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
              <ThemedView key={t} type="backgroundElement" style={styles.card}>
                <ThemedText type="smallBold">{TRACKER_LABELS[t]}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  Not logged yet
                </ThemedText>
              </ThemedView>
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
    paddingBottom: BottomTabInset + Spacing.four,
    gap: Spacing.four,
    maxWidth: MaxContentWidth,
    width: '100%',
    alignSelf: 'center',
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  avatar: { width: 48, height: 48, borderRadius: 24 },
  cards: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.three },
  card: { flexBasis: '46%', flexGrow: 1, padding: Spacing.three, borderRadius: Spacing.three, gap: Spacing.one },
});
