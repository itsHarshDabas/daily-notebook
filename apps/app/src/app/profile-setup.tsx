import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import type { Gender } from '@daily-notebook/shared';

import { Avatar } from '@/components/avatar';
import { Banner, Button, Chip, ChipGroup, Field, Screen, Text } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { GENDERS } from '@/constants/trackers';
import { uploadAvatar } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { pickAvatar } from '@/lib/photo';

export default function ProfileSetupScreen() {
  const { updateProfile, signOut } = useAuth();
  const [name, setName] = useState('');
  const [gender, setGender] = useState<Gender | null>(null);
  const [photo, setPhoto] = useState<{ uri: string; mimeType: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (!name.trim()) return setError('Add your name.');
    setBusy(true);
    setError(null);
    try {
      let avatarFileId: string | undefined;
      if (photo) {
        // The photo is optional; don't block sign-up if the photo server is unreachable.
        avatarFileId = await uploadAvatar(photo.uri, photo.mimeType).catch(() => {
          setError('Saved without your photo; you can add it later in Settings.');
          return undefined;
        });
      }
      await updateProfile({ name: name.trim(), gender, ...(avatarFileId ? { avatarFileId } : {}) });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save your profile.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen edges={['top', 'bottom']}>
      <View style={styles.wrap}>
        <View style={{ gap: Spacing.two }}>
          <Text variant="micro" color="accent">
            Step 1 of 1
          </Text>
          <Text variant="display">Set up your profile</Text>
          <Text color="textSecondary">This is only visible to you.</Text>
        </View>

        <Pressable
          onPress={() => pickAvatar().then((p) => p && setPhoto(p), (e: Error) => setError(e.message))}
          style={styles.avatar}
          accessibilityRole="button"
          accessibilityLabel="Choose profile photo">
          <Avatar size={96} uri={photo?.uri} name={name || '+'} />
          <Text variant="caption" color="accent">
            {photo ? 'Change photo' : 'Add photo (optional)'}
          </Text>
        </Pressable>

        <Field label="Name" value={name} onChangeText={setName} placeholder="Your name" autoComplete="name" maxLength={60} />

        <View style={{ gap: Spacing.two }}>
          <Text variant="caption" color="textSecondary">
            Gender (optional)
          </Text>
          <ChipGroup>
            {GENDERS.map((g) => (
              <Chip key={g.value} label={g.label} selected={gender === g.value} onPress={() => setGender(gender === g.value ? null : g.value)} />
            ))}
          </ChipGroup>
          {gender === 'female' ? (
            <Text variant="caption" color="textTertiary">
              Period tracking will be added to your trackers. You can hide it any time in Settings.
            </Text>
          ) : null}
        </View>

        <Banner text={error} tone={error?.startsWith('Saved') ? 'warning' : 'danger'} />
        <Button title="Start tracking" icon="arrow-forward" onPress={save} busy={busy} />
        <Button title="Sign out" variant="ghost" compact onPress={signOut} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: { width: '100%', maxWidth: 460, alignSelf: 'center', gap: Spacing.four, paddingTop: Spacing.four },
  avatar: { alignItems: 'center', gap: Spacing.two, alignSelf: 'center' },
});
