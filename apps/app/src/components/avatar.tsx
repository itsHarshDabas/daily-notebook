import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui';
import { useTheme } from '@/hooks/use-theme';
import { avatarUrl } from '@/lib/avatar';
import { useAuth } from '@/lib/auth';

export function Avatar({ size = 40, uri, name }: { size?: number; uri?: string | null; name?: string | null }) {
  const theme = useTheme();
  const { profile } = useAuth();
  const path = profile?.avatarPath;
  const [signed, setSigned] = useState<string | null>(null);

  useEffect(() => {
    if (!path || uri) return setSigned(null);
    let live = true;
    avatarUrl(path).then((u) => live && setSigned(u), () => live && setSigned(null));
    return () => {
      live = false;
    };
  }, [path, uri]);
  const initials = (name ?? profile?.name ?? '?')
    .split(/\s+/)
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  const round = { width: size, height: size, borderRadius: size / 2 };

  if (uri) return <Image source={{ uri }} style={round} />;
  if (path && signed) {
    return (
      <Image
        // Signed URLs change; cache by the storage path, which is new for every upload.
        source={{ uri: signed, cacheKey: path }}
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
