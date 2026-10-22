import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Switch, View } from 'react-native';

import { DEFAULT_TARGETS, type Targets } from '@daily-notebook/shared';

import { Avatar } from '@/components/avatar';
import { Banner, Button, Card, Chip, ChipGroup, Field, Screen, SectionHeader, Segmented, Text } from '@/components/ui';
import { Spacing, TrackerColors } from '@/constants/theme';
import { GENDERS } from '@/constants/trackers';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth';
import { uploadAvatar } from '@/lib/avatar';
import { confirm } from '@/lib/confirm';
import { getTargets, saveTargets } from '@/lib/data';
import { flush, useSyncStatus } from '@/lib/offline';
import { pickAvatar } from '@/lib/photo';
import { useAppTheme, type ThemePreference } from '@/lib/theme';

const CURRENCIES = ['INR', 'USD', 'EUR', 'GBP', 'AED', 'CAD', 'AUD', 'JPY'];

export default function SettingsScreen() {
  const theme = useTheme();
  const { preference, setPreference } = useAppTheme();
  const { profile, session, updateProfile, signOut, deleteAccount } = useAuth();
  const sync = useSyncStatus();
  const [name, setName] = useState(profile?.name ?? '');
  const [targets, setTargets] = useState<Targets>(DEFAULT_TARGETS);
  const [draft, setDraft] = useState<Record<keyof Targets, string>>(toDraft(DEFAULT_TARGETS));
  const [message, setMessage] = useState<{ tone: 'success' | 'danger'; text: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      getTargets().then((t) => {
        setTargets(t);
        setDraft(toDraft(t));
      });
    }, []),
  );

  if (!profile) return null;

  async function task(label: string, fn: () => Promise<void>, done?: string) {
    setBusy(label);
    setMessage(null);
    try {
      await fn();
      if (done) setMessage({ tone: 'success', text: done });
    } catch (e) {
      setMessage({ tone: 'danger', text: e instanceof Error ? e.message : 'Something went wrong.' });
    } finally {
      setBusy(null);
    }
  }

  const parsed = fromDraft(draft);
  const targetsChanged = parsed && JSON.stringify(parsed) !== JSON.stringify(targets);

  return (
    <Screen>
      <Text variant="display">Settings</Text>
      <Banner tone={message?.tone} text={message?.text ?? null} />

      <SectionHeader title="Profile" />
      <Card style={{ gap: Spacing.three }}>
        <View style={styles.profileRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Change profile photo"
            onPress={() =>
              task('photo', async () => {
                const p = await pickAvatar();
                if (!p) return;
                await updateProfile({ avatarPath: await uploadAvatar(p) });
              }, 'Photo updated.')
            }>
            <Avatar size={64} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text variant="heading">{profile.name}</Text>
            <Text variant="caption" color="textSecondary">
              {session?.user.email}
            </Text>
          </View>
        </View>
        <Field label="Name" value={name} onChangeText={setName} maxLength={60} />
        {name.trim() && name.trim() !== profile.name ? (
          <Button title="Save name" compact busy={busy === 'name'} onPress={() => task('name', () => updateProfile({ name: name.trim() }), 'Name saved.')} />
        ) : null}
        <View style={{ gap: Spacing.two }}>
          <Text variant="caption" color="textSecondary">
            Gender
          </Text>
          <ChipGroup>
            {GENDERS.map((g) => (
              <Chip key={g.value} label={g.label} selected={profile.gender === g.value} onPress={() => task('gender', () => updateProfile({ gender: g.value }))} />
            ))}
          </ChipGroup>
        </View>
        {profile.gender === 'female' ? (
          <View style={styles.switchRow}>
            <View style={{ flex: 1 }}>
              <Text variant="bodyStrong">Period tracking</Text>
              <Text variant="caption" color="textSecondary">
                Shows the period tracker on Today and History.
              </Text>
            </View>
            <Switch
              value={!profile.periodTrackingHidden}
              onValueChange={(on) => task('period', () => updateProfile({ periodTrackingHidden: !on }))}
              trackColor={{ true: TrackerColors.period, false: theme.border }}
            />
          </View>
        ) : null}
      </Card>

      <SectionHeader title="Appearance" />
      <Card>
        <Segmented<ThemePreference>
          value={preference}
          onChange={setPreference}
          options={[
            { value: 'system', label: 'System', icon: 'phone-portrait-outline' },
            { value: 'light', label: 'Light', icon: 'sunny-outline' },
            { value: 'dark', label: 'Dark', icon: 'moon-outline' },
          ]}
        />
      </Card>

      <SectionHeader title="Daily targets" />
      <Card style={{ gap: Spacing.three }}>
        <View style={styles.targetGrid}>
          <TargetField label="Calories (kcal)" value={draft.calories} onChange={(v) => setDraft({ ...draft, calories: v })} />
          <TargetField label="Water (ml)" value={draft.waterMl} onChange={(v) => setDraft({ ...draft, waterMl: v })} />
          <TargetField label="Sleep (hours)" value={draft.sleepHours} onChange={(v) => setDraft({ ...draft, sleepHours: v })} decimal />
          <TargetField label="Exercise (min / week)" value={draft.exerciseMinutesPerWeek} onChange={(v) => setDraft({ ...draft, exerciseMinutesPerWeek: v })} />
          <TargetField label={`Monthly budget (${profile.currency})`} value={draft.budgetPerMonth} onChange={(v) => setDraft({ ...draft, budgetPerMonth: v })} decimal />
        </View>
        {!parsed ? <Text variant="caption" color="danger">Every target must be a number above 0 (budget can be 0 for none).</Text> : null}
        <Button
          title="Save targets"
          disabled={!targetsChanged}
          busy={busy === 'targets'}
          onPress={() =>
            parsed &&
            task('targets', async () => {
              await saveTargets(parsed);
              setTargets(parsed);
            }, 'Targets saved.')
          }
        />
        <View style={{ gap: Spacing.two }}>
          <Text variant="caption" color="textSecondary">
            Currency
          </Text>
          <ChipGroup>
            {CURRENCIES.map((c) => (
              <Chip key={c} label={c} selected={profile.currency === c} onPress={() => task('currency', () => updateProfile({ currency: c }))} />
            ))}
          </ChipGroup>
        </View>
      </Card>

      <SectionHeader title="Sync" />
      <Card style={{ gap: Spacing.three }}>
        <View style={styles.switchRow}>
          <View style={{ flex: 1 }}>
            <Text variant="bodyStrong">{sync.online ? 'Online' : 'Offline'}</Text>
            <Text variant="caption" color="textSecondary">
              {sync.pending ? `${sync.pending} change${sync.pending === 1 ? '' : 's'} waiting to sync` : 'Everything is synced across your devices.'}
            </Text>
          </View>
          <View style={[styles.dot, { backgroundColor: sync.online ? theme.success : theme.warning }]} />
        </View>
        {sync.pending ? <Button title="Sync now" variant="secondary" compact icon="sync-outline" busy={sync.syncing} onPress={() => flush()} /> : null}
      </Card>

      <SectionHeader title="Account" />
      <Card style={{ gap: Spacing.two }}>
        <Button title="Sign out" variant="secondary" icon="log-out-outline" onPress={signOut} />
        <Button
          title="Delete account and all data"
          variant="danger"
          icon="trash-outline"
          busy={busy === 'delete'}
          onPress={async () => {
            const ok = await confirm('Delete account?', 'This permanently deletes your account and everything you have logged, on every device.', 'Delete');
            if (ok) task('delete', deleteAccount);
          }}
        />
      </Card>
      <Text variant="caption" color="textTertiary" style={{ textAlign: 'center' }}>
        Daily Notebook · your data stays private to your account
      </Text>
    </Screen>
  );
}

function TargetField({ label, value, onChange, decimal }: { label: string; value: string; onChange: (v: string) => void; decimal?: boolean }) {
  return (
    <View style={styles.targetField}>
      <Field
        label={label}
        value={value}
        onChangeText={(t) => onChange(t.replace(decimal ? /[^\d.]/g : /\D/g, ''))}
        keyboardType={decimal ? 'decimal-pad' : 'number-pad'}
      />
    </View>
  );
}

function toDraft(t: Targets): Record<keyof Targets, string> {
  return {
    calories: String(t.calories),
    waterMl: String(t.waterMl),
    sleepHours: String(t.sleepHours),
    exerciseMinutesPerWeek: String(t.exerciseMinutesPerWeek),
    budgetPerMonth: String(t.budgetPerMonth),
  };
}

function fromDraft(d: Record<keyof Targets, string>): Targets | null {
  const t = {
    calories: Number(d.calories),
    waterMl: Number(d.waterMl),
    sleepHours: Number(d.sleepHours),
    exerciseMinutesPerWeek: Number(d.exerciseMinutesPerWeek),
    budgetPerMonth: Number(d.budgetPerMonth),
  };
  const ok = t.calories > 0 && t.waterMl > 0 && t.sleepHours > 0 && t.sleepHours <= 24 && t.exerciseMinutesPerWeek >= 0 && t.budgetPerMonth >= 0;
  return ok && Number.isInteger(t.calories) && Number.isInteger(t.waterMl) ? t : null;
}

const styles = StyleSheet.create({
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  targetGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  targetField: { flexBasis: '45%', flexGrow: 1 },
  dot: { width: 10, height: 10, borderRadius: 5 },
});
