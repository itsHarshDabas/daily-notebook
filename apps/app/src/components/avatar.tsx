import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui';
import { useTheme } from '@/hooks/use-theme';
import { avatarUrl } from '@/lib/api';
import { useAuth } from '@/lib/auth';

export function Avatar({ size = 40, uri, name }: { size?: number; uri?: string | null; name?: string | null }) {
  const theme = useTheme();
  const { session, profile } = useAuth();
  const fileId = profile?.avatarFileId;
  const initials = (name ?? profile?.name ?? '?')
    .split(/\s+/)
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  const round = { width: size, height: size, borderRadius: size / 2 };

  if (uri) return <Image source={{ uri }} style={round} />;
  if (fileId && session) {
    return (
      <Image
        source={{ uri: avatarUrl(fileId), headers: { authorization: `Bearer ${session.access_token}` } }}
        style={[round, { backgroundColor: theme.surfaceAlt }]}
        transition={150}
      />
    );
  }
  return (
    <View style={[round, styles.initials, { backgroundColor: theme.accentSoft }]}>
      <Text variant={size > 60 ? 'title' : 'bodyStrong'} color="accent">
        {initials}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  initials: { alignItems: 'center', justifyContent: 'center' },
});
