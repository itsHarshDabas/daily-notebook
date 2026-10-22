import { ActivityIndicator, Pressable, StyleSheet, TextInput, type TextInputProps } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function Field(props: TextInputProps) {
  const theme = useTheme();
  return (
    <TextInput
      placeholderTextColor={theme.textSecondary}
      {...props}
      style={[styles.field, { color: theme.text, backgroundColor: theme.backgroundElement }, props.style]}
    />
  );
}

export function Button({
  title,
  onPress,
  busy,
  disabled,
  variant = 'primary',
}: {
  title: string;
  onPress: () => void;
  busy?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'plain';
}) {
  const theme = useTheme();
  const off = disabled || busy;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={off}
      style={({ pressed }) => [
        styles.button,
        variant === 'primary' ? { backgroundColor: theme.text } : null,
        (pressed || off) && { opacity: 0.6 },
      ]}>
      {busy ? (
        <ActivityIndicator color={variant === 'primary' ? theme.background : theme.text} />
      ) : (
        <ThemedText type="smallBold" style={{ color: variant === 'primary' ? theme.background : theme.text }}>
          {title}
        </ThemedText>
      )}
    </Pressable>
  );
}

export function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[
        styles.chip,
        { backgroundColor: selected ? theme.text : theme.backgroundElement },
      ]}>
      <ThemedText type="small" style={{ color: selected ? theme.background : theme.text }}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

export function ErrorText({ children }: { children: string | null }) {
  if (!children) return null;
  return (
    <ThemedText type="small" style={{ color: '#d33' }}>
      {children}
    </ThemedText>
  );
}

const styles = StyleSheet.create({
  field: {
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    fontSize: 16,
  },
  button: {
    borderRadius: Spacing.three,
    paddingVertical: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  chip: {
    borderRadius: 999,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
});
