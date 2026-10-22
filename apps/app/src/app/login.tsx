import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';

import { BrandMark } from '@/components/brand';
import { OtpInput } from '@/components/otp-input';
import { Banner, Button, Field, Screen, Text } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { supabase } from '@/lib/supabase';

const RESEND_SECONDS = 60;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function friendly(message: string): string {
  if (/fetch|network/i.test(message)) return "Couldn't reach the server. Check your connection and try again.";
  if (/expired|invalid/i.test(message)) return 'That code is wrong or has expired. Try again or send a new one.';
  if (/rate|security purposes/i.test(message)) return 'Too many attempts. Wait a minute, then try again.';
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
    setCode('');
    setStep('code');
    setCooldown(RESEND_SECONDS);
  }

  async function verify(token = code) {
    if (token.length !== 6) return setError('Enter the 6-digit code from the email.');
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.verifyOtp({ email, token, type: 'email' });
    setBusy(false);
    // On success the auth listener updates the session and the router moves on.
    if (error) setError(friendly(error.message));
  }

  return (
    <Screen edges={['top', 'bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.wrap}>
        <View style={styles.card}>
          <BrandMark />
          <View style={{ gap: Spacing.two }}>
            <Text variant="display">{step === 'email' ? 'Daily Notebook' : 'Check your email'}</Text>
            <Text color="textSecondary">
              {step === 'email'
                ? 'Your day in a minute: mood, food, water, sleep, movement and money, all in one grid.'
                : `We sent a 6-digit code to ${email}.`}
            </Text>
          </View>

          {step === 'email' ? (
            <View style={styles.form}>
              <Field
                label="Email"
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                inputMode="email"
                returnKeyType="send"
                onSubmitEditing={sendCode}
                autoFocus
              />
              <Banner text={error} />
              <Button title="Continue with email" icon="mail-outline" onPress={sendCode} busy={busy} />
              <Text variant="caption" color="textTertiary" style={styles.center}>
                No password needed. New here? Your account is created on first sign-in.
              </Text>
            </View>
          ) : (
            <View style={styles.form}>
              <OtpInput value={code} onChange={setCode} onComplete={verify} />
              <Banner text={error} />
              <Button title="Verify and sign in" onPress={() => verify()} busy={busy} disabled={code.length !== 6} />
              <View style={styles.row}>
                <Button
                  variant="ghost"
                  compact
                  title={cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
                  onPress={sendCode}
                  disabled={cooldown > 0 || busy}
                />
                <Button
                  variant="ghost"
                  compact
                  title="Change email"
                  onPress={() => {
                    setStep('email');
                    setError(null);
                  }}
                />
              </View>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, minHeight: 560, justifyContent: 'center' },
  card: { width: '100%', maxWidth: 420, alignSelf: 'center', gap: Spacing.four },
  form: { gap: Spacing.three },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  center: { textAlign: 'center' },
});
