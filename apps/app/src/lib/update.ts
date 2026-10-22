import { Linking, Platform } from 'react-native';

/** CI stamps each APK with its build number; local and web builds have none and never prompt. */
export const BUILD = Number(process.env.EXPO_PUBLIC_BUILD_NUMBER ?? 0);

const RELEASE = 'https://github.com/itsHarshDabas/daily-notebook/releases/download/android-latest';
export const APK_URL = `${RELEASE}/daily-notebook.apk`;

export interface Update {
  build: number;
}

let cached: Promise<Update | null> | undefined;

/** Asks the android-latest release which build it holds. Cached for the app session unless forced. */
export function checkForUpdate(force = false): Promise<Update | null> {
  if (Platform.OS !== 'android' || !BUILD) return Promise.resolve(null);
  if (!cached || force) {
    cached = fetch(`${RELEASE}/version.json?t=${Date.now()}`)
      .then((r) => (r.ok ? (r.json() as Promise<{ build?: number }>) : null))
      .then((v) => (v?.build && v.build > BUILD ? { build: v.build } : null))
      .catch(() => null);
  }
  return cached;
}

/** Opens the APK download in the browser; Android then offers to install it over this version. */
export function openUpdate(): Promise<void> {
  return Linking.openURL(APK_URL);
}
