import { useRef, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View, type TextInputInstance } from 'react-native';

import { Text } from '@/components/ui';
import { Fonts, Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** Six boxes backed by one hidden input, so paste and SMS/email autofill still work. */
export function OtpInput({ value, onChange, onComplete, length = 6 }: { value: string; onChange: (v: string) => void; onComplete?: (v: string) => void; length?: number }) {
  const theme = useTheme();
  const input = useRef<TextInputInstance>(null);
  const [focused, setFocused] = useState(true);
  return (
    <Pressable onPress={() => input.current?.focus()} accessibilityLabel="One-time code">
      <View style={styles.row}>
        {Array.from({ length }, (_, i) => {
          const active = focused && (i === value.length || (i === length - 1 && value.length === length));
          return (
            <View
              key={i}
              style={[
                styles.box,
                { backgroundColor: theme.surface, borderColor: active ? theme.accent : theme.border },
                active && { borderWidth: 2 },
              ]}>
              <Text variant="title">{value[i] ?? ''}</Text>
            </View>
          );
        })}
      </View>
      <TextInput
        ref={input}
        value={value}
        onChangeText={(t) => {
          const v = t.replace(/\D/g, '').slice(0, length);
          onChange(v);
          if (v.length === length) onComplete?.(v);
        }}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        autoFocus
        keyboardType="number-pad"
        inputMode="numeric"
        autoComplete="one-time-code"
        textContentType="oneTimeCode"
        maxLength={length}
        caretHidden
        style={styles.hidden}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8, justifyContent: 'space-between' },
  box: { flex: 1, maxWidth: 56, aspectRatio: 0.85, borderWidth: 1, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  hidden: { position: 'absolute', opacity: 0.01, width: 1, height: 1, fontFamily: Fonts.regular },
});
