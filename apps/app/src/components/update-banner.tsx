import { useEffect, useState } from 'react';
import { Pressable } from 'react-native';

import { Banner } from '@/components/ui';
import { checkForUpdate, openUpdate, type Update } from '@/lib/update';

export function UpdateBanner() {
  const [update, setUpdate] = useState<Update | null>(null);

  useEffect(() => {
    let live = true;
    checkForUpdate().then((u) => live && setUpdate(u));
    return () => {
      live = false;
    };
  }, []);

  if (!update) return null;
  return (
    <Pressable onPress={openUpdate} accessibilityRole="button" accessibilityLabel="Download the app update">
      <Banner tone="info" icon="arrow-down-circle-outline" text={`A new version is ready (build ${update.build}). Tap to download and install it.`} />
    </Pressable>
  );
}
