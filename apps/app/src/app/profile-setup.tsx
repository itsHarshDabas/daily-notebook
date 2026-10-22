import { Image } from 'expo-image';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { Gender } from '@daily-notebook/shared';

import { Button, Chip, ErrorText, Field } from '@/components/form';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { uploadAvatar } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

const GENDERS: { value: Gender; label: string }[] = [
  { value: 'female', label: 'Female' },
  { value: 'male', label: 'Male' },
  { value: 'other', label: 'Other' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' },
];

export default function ProfileSetupScreen() {
  const { session, refreshProfile } = useAuth();
  const theme = useTheme();
  const [name, setName] = useState('');
  const [gender, setGender] = useState<Gender | null>(null);
  const [photo, setPhoto] = useState<{ uri: string; mimeType: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pickPhoto() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });
    if (result.canceled) return;
    // Resize to 512 px before upload so photos stay small in MongoDB.
    const image = await ImageManipulator.manipulate(result.assets[0].uri).resize({ width: 512 }).renderAsync();
    const saved = await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.8 });
    setPhoto({ uri: saved.uri, mimeType: 'image/jpeg' });
  }

  async function save() {
    if (!session) return;
    if (!name.trim()) return setError('Add your name.');
    setBusy(true);
    setError(null);
    try {
      const avatarFileId = photo ? await uploadAvatar(photo.uri, photo.mimeType) : null;
      const { error } = await supabase
        .from('profiles')
        .update({ name: name.trim(), gender, ...(avatarFileId ? { avatar_file_id: avatarFileId } : {}) })
        .eq('id', session.user.id);
      if (error) throw error;
      await refreshProfile();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save your profile.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <ThemedView style={styles.fill}>
      <SafeAreaView style={styles.fill}>
        <ScrollView contentContainerStyle={styles.content}>
          <ThemedText type="subtitle">Set up your profile</ThemedText>

          <Pressable onPress={pickPhoto} style={styles.avatarWrap} accessibilityRole="button" accessibilityLabel="Choose profile photo">
            {photo ? (
              <Image source={{ uri: photo.uri }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, { backgroundColor: theme.backgroundElement }]} />
            )}
            <ThemedText type="small" themeColor="textSecondary">
              {photo ? 'Change photo' : 'Add a photo (optional)'}
            </ThemedText>
          </Pressable>

          <ThemedText type="smallBold">Name</ThemedText>
          <Field value={name} onChangeText={setName} placeholder="Your name" autoComplete="name" />

          <ThemedText type="smallBold">Gender (optional)</ThemedText>
          <View style={styles.chips}>
            {GENDERS.map((g) => (
              <Chip key={g.value} label={g.label} selected={gender === g.value} onPress={() => setGender(g.value)} />
            ))}
          </View>
          {gender === 'female' && (
            <ThemedText type="small" themeColor="textSecondary">
              Period tracking will appear as an extra tracker. You can hide it in settings.
            </ThemedText>
          )}

          <ErrorText>{error}</ErrorText>
          <Button title="Continue" onPress={save} busy={busy} />
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { padding: Spacing.four, gap: Spacing.three, maxWidth: 480, width: '100%', alignSelf: 'center' },
  avatarWrap: { alignItems: 'center', gap: Spacing.two, alignSelf: 'center' },
  avatar: { width: 96, height: 96, borderRadius: 48 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
});
