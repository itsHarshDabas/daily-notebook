import '@/lib/data';

import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from '@expo-google-fonts/inter';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { AuthProvider, useAuth } from '@/lib/auth';
import { AppThemeProvider, useAppTheme } from '@/lib/theme';

SplashScreen.preventAutoHideAsync();

function RootStack() {
  const { loading, session, profile } = useAuth();
  const { scheme, colors } = useAppTheme();
  const [fontsLoaded, fontError] = useFonts({ Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold });
  const ready = !loading && (fontsLoaded || !!fontError);

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);
  if (!ready) return null;

  const signedIn = !!session;
  // A profile needs at least a name before the trackers make sense.
  const profileDone = !!profile?.name;
  const base = scheme === 'dark' ? DarkTheme : DefaultTheme;

  return (
    <ThemeProvider
      value={{
        ...base,
        colors: { ...base.colors, background: colors.background, card: colors.surface, text: colors.text, border: colors.border, primary: colors.accent },
      }}>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
        <Stack.Protected guard={!signedIn}>
          <Stack.Screen name="login" />
        </Stack.Protected>
        <Stack.Protected guard={signedIn && !profileDone}>
          <Stack.Screen name="profile-setup" />
        </Stack.Protected>
        <Stack.Protected guard={signedIn && profileDone}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="log/[tracker]" options={{ presentation: 'modal' }} />
        </Stack.Protected>
      </Stack>
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <AppThemeProvider>
      <AuthProvider>
        <RootStack />
      </AuthProvider>
    </AppThemeProvider>
  );
}
