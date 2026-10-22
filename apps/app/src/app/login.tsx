import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, ErrorText, Field } from '@/components/form';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { supabase } from '@/lib/supabase';

const RESEND_SECONDS = 60;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function friendly(message: string): string {
  if (/fetch|network/i.test(message)) return "Couldn't reach the server. Check your connection and try again.";
  if (/expired/i.test(message)) return 'That code has expired. Send a new one.';
  return message;
}

export default function LoginScreen() {
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  async function sendCode() {
    const clean = email.trim().toLowerCase();
    if (!EMAIL_RE.test(clean)) return setError('Enter a valid email address.');
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.signInWithOtp({ email: clean, options: { shouldCreateUser: true } });
    setBusy(false);
    if (error) return setError(friendly(error.message));
    setEmail(clean);
    setStep('code');
    setCooldown(RESEND_SECONDS);
  }

  async function verify() {
    if (!/^\d{6,10}$/.test(code)) return setError('Enter the code from the email.');
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.verifyOtp({ email, token: code, type: 'email' });
    setBusy(false);
    // On success the auth listener updates the session and the router moves on.
    if (error) setError(friendly(error.message));
  }

  return (
    <ThemedView style={styles.fill}>
      <SafeAreaView style={styles.fill}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.center}>
          <View style={styles.card}>
            <ThemedText type="subtitle">Daily Notebook</ThemedText>
            {step === 'email' ? (
              <>
                <ThemedText themeColor="textSecondary">Sign in with a one-time code sent to your email.</ThemedText>
                <Field
                  value={email}
                  onChangeText={setEmail}
                  placeholder="you@example.com"
                  autoCapitalize="none"
                  autoComplete="email"
                  keyboardType="email-address"
                  inputMode="email"
                  onSubmitEditing={sendCode}
                />
                <ErrorText>{error}</ErrorText>
                <Button title="Send code" onPress={sendCode} busy={busy} />
              </>
            ) : (
              <>
                <ThemedText themeColor="textSecondary">Enter the code we sent to {email}.</ThemedText>
                <Field
                  value={code}
                  onChangeText={(t) => setCode(t.replace(/\D/g, ''))}
                  placeholder="123456"
                  keyboardType="number-pad"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  textContentType="oneTimeCode"
                  maxLength={10}
                  onSubmitEditing={verify}
                  style={styles.code}
                />
                <ErrorText>{error}</ErrorText>
                <Button title="Verify" onPress={verify} busy={busy} />
                <Button
                  variant="plain"
                  title={cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend code'}
                  onPress={sendCode}
                  disabled={cooldown > 0}
                />
                <Button
                  variant="plain"
                  title="Use a different email"
                  onPress={() => {
                    setStep('email');
                    setCode('');
                    setError(null);
                  }}
                />
              </>
            )}
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing.four },
  card: { width: '100%', maxWidth: Math.min(420, MaxContentWidth), gap: Spacing.three },
  code: { fontSize: 24, letterSpacing: 8, textAlign: 'center' },
});
