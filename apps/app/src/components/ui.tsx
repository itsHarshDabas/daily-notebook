import Ionicons from '@expo/vector-icons/Ionicons';
import { useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text as RNText,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextProps as RNTextProps,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';

import { Fonts, MaxContentWidth, Radius, Spacing, type ThemeColor } from '@/constants/theme';
import type { IconName } from '@/constants/trackers';
import { useTheme } from '@/hooks/use-theme';

const TYPE = StyleSheet.create({
  display: { fontFamily: Fonts.bold, fontSize: 32, lineHeight: 38, letterSpacing: -0.6 },
  title: { fontFamily: Fonts.bold, fontSize: 22, lineHeight: 28, letterSpacing: -0.3 },
  heading: { fontFamily: Fonts.semibold, fontSize: 17, lineHeight: 22, letterSpacing: -0.2 },
  body: { fontFamily: Fonts.regular, fontSize: 15, lineHeight: 22 },
  bodyStrong: { fontFamily: Fonts.semibold, fontSize: 15, lineHeight: 22 },
  caption: { fontFamily: Fonts.medium, fontSize: 13, lineHeight: 18 },
  micro: { fontFamily: Fonts.semibold, fontSize: 11, lineHeight: 14, letterSpacing: 0.6, textTransform: 'uppercase' },
  number: { fontFamily: Fonts.bold, fontSize: 28, lineHeight: 32, letterSpacing: -0.5, fontVariant: ['tabular-nums'] },
});

export type TextVariant = keyof typeof TYPE;

export function Text({
  variant = 'body',
  color = 'text',
  tint,
  style,
  ...rest
}: RNTextProps & { variant?: TextVariant; color?: ThemeColor; tint?: string }) {
  const theme = useTheme();
  return <RNText style={[TYPE[variant], { color: tint ?? theme[color] }, style]} {...rest} />;
}

export function Screen({
  children,
  scroll = true,
  header,
  edges = ['top'],
}: {
  children: ReactNode;
  scroll?: boolean;
  header?: ReactNode;
  edges?: ('top' | 'bottom')[];
}) {
  const theme = useTheme();
  const body = <View style={styles.screenInner}>{children}</View>;
  return (
    <View style={[styles.fill, { backgroundColor: theme.background }]}>
      <SafeAreaView style={styles.fill} edges={edges}>
        {header}
        {scroll ? (
          <ScrollView contentContainerStyle={styles.screenScroll} keyboardShouldPersistTaps="handled">
            {body}
          </ScrollView>
        ) : (
          body
        )}
      </SafeAreaView>
    </View>
  );
}

export function Card({
  children,
  style,
  onPress,
  accessibilityLabel,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  accessibilityLabel?: string;
}) {
  const theme = useTheme();
  const base = [styles.card, { backgroundColor: theme.surface, borderColor: theme.border }, style];
  if (!onPress) return <View style={base}>{children}</View>;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [
        base,
        hovered && { borderColor: theme.textTertiary },
        pressed && { transform: [{ scale: 0.98 }], opacity: 0.9 },
      ]}>
      {children}
    </Pressable>
  );
}

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

export function Button({
  title,
  onPress,
  variant = 'primary',
  icon,
  busy,
  disabled,
  compact,
}: {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  icon?: IconName;
  busy?: boolean;
  disabled?: boolean;
  compact?: boolean;
}) {
  const theme = useTheme();
  const off = disabled || busy;
  const bg = { primary: theme.accent, secondary: theme.surfaceAlt, ghost: 'transparent', danger: 'transparent' }[variant];
  const fg = { primary: theme.onAccent, secondary: theme.text, ghost: theme.accent, danger: theme.danger }[variant];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!off, busy: !!busy }}
      onPress={onPress}
      disabled={off}
      style={({ pressed }) => [
        styles.button,
        compact && styles.buttonCompact,
        { backgroundColor: bg },
        variant === 'danger' && { borderWidth: 1, borderColor: theme.danger },
        off && { opacity: 0.45 },
        pressed && { opacity: 0.8 },
      ]}>
      {busy ? (
        <ActivityIndicator color={fg} />
      ) : (
        <>
          {icon ? <Ionicons name={icon} size={18} color={fg} /> : null}
          <Text variant="bodyStrong" tint={fg}>
            {title}
          </Text>
        </>
      )}
    </Pressable>
  );
}

export function IconButton({
  icon,
  onPress,
  label,
  color,
}: {
  icon: IconName;
  onPress: () => void;
  label: string;
  color?: string;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      style={({ pressed }) => [styles.iconButton, { backgroundColor: theme.surfaceAlt }, pressed && { opacity: 0.7 }]}>
      <Ionicons name={icon} size={20} color={color ?? theme.text} />
    </Pressable>
  );
}

export function Field({ label, hint, style, ...props }: TextInputProps & { label?: string; hint?: string }) {
  const theme = useTheme();
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.fieldWrap}>
      {label ? (
        <Text variant="caption" color="textSecondary">
          {label}
        </Text>
      ) : null}
      <TextInput
        placeholderTextColor={theme.textTertiary}
        {...props}
        onFocus={(e) => {
          setFocused(true);
          props.onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          props.onBlur?.(e);
        }}
        style={[
          styles.field,
          {
            color: theme.text,
            backgroundColor: theme.surface,
            borderColor: focused ? theme.accent : theme.border,
          },
          props.multiline && { minHeight: 96, textAlignVertical: 'top' },
          style,
        ]}
      />
      {hint ? (
        <Text variant="caption" color="textTertiary">
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

export function Chip({
  label,
  selected,
  onPress,
  color,
  icon,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  color?: string;
  icon?: IconName;
}) {
  const theme = useTheme();
  const active = color ?? theme.accent;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: selected ? `${active}22` : theme.surface,
          borderColor: selected ? active : theme.border,
        },
        pressed && { opacity: 0.75 },
      ]}>
      {icon ? <Ionicons name={icon} size={15} color={selected ? active : theme.textSecondary} /> : null}
      <Text variant="caption" tint={selected ? (color ? theme.text : active) : theme.text}>
        {label}
      </Text>
    </Pressable>
  );
}

export function ChipGroup({ children }: { children: ReactNode }) {
  return <View style={styles.chipGroup}>{children}</View>;
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string; icon?: IconName }[];
  value: T;
  onChange: (v: T) => void;
}) {
  const theme = useTheme();
  return (
    <View style={[styles.segmented, { backgroundColor: theme.surfaceAlt }]} accessibilityRole="tablist">
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            onPress={() => onChange(o.value)}
            style={[styles.segment, on && { backgroundColor: theme.surface, shadowColor: theme.shadow }, on && styles.segmentOn]}>
            {o.icon ? <Ionicons name={o.icon} size={15} color={on ? theme.text : theme.textSecondary} /> : null}
            <Text variant="caption" color={on ? 'text' : 'textSecondary'}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function ProgressBar({ value, max, color, height = 8 }: { value: number; max: number; color: string; height?: number }) {
  const theme = useTheme();
  const pct = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0;
  return (
    <View style={[styles.bar, { height, backgroundColor: theme.gridEmpty }]}>
      <View style={[styles.barFill, { width: `${pct * 100}%`, backgroundColor: color }]} />
    </View>
  );
}

export function ProgressRing({
  progress,
  size = 44,
  stroke = 5,
  color,
  children,
}: {
  progress: number;
  size?: number;
  stroke?: number;
  color: string;
  children?: ReactNode;
}) {
  const theme = useTheme();
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(1, progress));
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={theme.gridEmpty} strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${c} ${c}`}
          strokeDashoffset={c * (1 - p)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      {children}
    </View>
  );
}

export function SectionHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <View style={styles.sectionHeader}>
      <Text variant="micro" color="textSecondary">
        {title}
      </Text>
      {action}
    </View>
  );
}

export function Banner({ tone = 'danger', text, icon }: { tone?: 'danger' | 'warning' | 'success' | 'info'; text: string | null; icon?: IconName }) {
  const theme = useTheme();
  if (!text) return null;
  const color = { danger: theme.danger, warning: theme.warning, success: theme.success, info: theme.accent }[tone];
  const fallback: IconName = tone === 'success' ? 'checkmark-circle' : tone === 'info' ? 'information-circle' : 'alert-circle';
  return (
    <View style={[styles.banner, { backgroundColor: `${color}1A`, borderColor: `${color}55` }]} accessibilityRole="alert">
      <Ionicons name={icon ?? fallback} size={18} color={color} />
      <Text variant="caption" style={{ flex: 1 }}>
        {text}
      </Text>
    </View>
  );
}

export function ListRow({
  title,
  detail,
  right,
  onDelete,
  icon,
  color,
}: {
  title: string;
  detail?: string | null;
  right?: string;
  onDelete?: () => void;
  icon?: IconName;
  color?: string;
}) {
  const theme = useTheme();
  return (
    <View style={[styles.listRow, { borderColor: theme.border }]}>
      {icon ? (
        <View style={[styles.rowIcon, { backgroundColor: `${color ?? theme.accent}1F` }]}>
          <Ionicons name={icon} size={16} color={color ?? theme.accent} />
        </View>
      ) : null}
      <View style={{ flex: 1 }}>
        <Text variant="bodyStrong" numberOfLines={1}>
          {title}
        </Text>
        {detail ? (
          <Text variant="caption" color="textSecondary" numberOfLines={1}>
            {detail}
          </Text>
        ) : null}
      </View>
      {right ? <Text variant="bodyStrong">{right}</Text> : null}
      {onDelete ? (
        <Pressable onPress={onDelete} accessibilityRole="button" accessibilityLabel={`Delete ${title}`} hitSlop={10}>
          <Ionicons name="trash-outline" size={18} color={theme.textTertiary} />
        </Pressable>
      ) : null}
    </View>
  );
}

export function Empty({ icon, text }: { icon: IconName; text: string }) {
  const theme = useTheme();
  return (
    <View style={styles.empty}>
      <Ionicons name={icon} size={22} color={theme.textTertiary} />
      <Text variant="caption" color="textTertiary">
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  screenScroll: { flexGrow: 1 },
  screenInner: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.four - 4,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.five,
    gap: Spacing.four,
  },
  card: { borderRadius: Radius.lg, borderWidth: StyleSheet.hairlineWidth, padding: Spacing.three },
  button: {
    minHeight: 50,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.four,
    flexDirection: 'row',
    gap: Spacing.two,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonCompact: { minHeight: 40, paddingHorizontal: Spacing.three },
  iconButton: { width: 40, height: 40, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
  fieldWrap: { gap: 6 },
  field: {
    fontFamily: Fonts.regular,
    fontSize: 16,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.three,
    paddingVertical: 13,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: Radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  chipGroup: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  segmented: { flexDirection: 'row', borderRadius: Radius.md, padding: 3 },
  segment: {
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: Radius.sm,
  },
  segmentOn: { shadowOpacity: 0.08, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
  bar: { borderRadius: Radius.pill, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: Radius.pill },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: -Spacing.two },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.three,
    paddingVertical: 10,
  },
  listRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  rowIcon: { width: 32, height: 32, borderRadius: Radius.sm, alignItems: 'center', justifyContent: 'center' },
  empty: { alignItems: 'center', gap: 6, paddingVertical: Spacing.three },
});
