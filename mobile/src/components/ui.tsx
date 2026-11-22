import type { ComponentProps, ReactNode } from 'react';
import {
  ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View,
  type StyleProp, type TextInputProps, type TextStyle, type ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../data/settings';
import { SWATCHES } from '../theme';

export type IconName = ComponentProps<typeof Ionicons>['name'];

export function Screen({ children, scroll = true, padded = true }: { children: ReactNode; scroll?: boolean; padded?: boolean }) {
  const t = useTheme();
  const style = [{ flex: 1, backgroundColor: t.bg }];
  const content = { padding: padded ? 16 : 0, paddingBottom: 120, gap: 12 };
  if (!scroll) return <View style={[style, content]}>{children}</View>;
  return (
    <ScrollView style={style} contentContainerStyle={content} keyboardShouldPersistTaps="handled">
      {children}
    </ScrollView>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const t = useTheme();
  return <View style={[styles.card, { backgroundColor: t.card, borderColor: t.border }, style]}>{children}</View>;
}

export function T({ children, style, muted, bold, size = 15, color, numberOfLines }: {
  children: ReactNode; style?: StyleProp<TextStyle>; muted?: boolean; bold?: boolean; size?: number; color?: string; numberOfLines?: number;
}) {
  const t = useTheme();
  return (
    <Text
      numberOfLines={numberOfLines}
      style={[{ color: color ?? (muted ? t.muted : t.text), fontSize: size, fontWeight: bold ? '700' : '400', fontVariant: ['tabular-nums'] }, style]}
    >
      {children}
    </Text>
  );
}

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost';

export function Button({ title, onPress, variant = 'primary', icon, disabled, loading, style }: {
  title: string; onPress: () => void; variant?: Variant; icon?: IconName; disabled?: boolean; loading?: boolean; style?: StyleProp<ViewStyle>;
}) {
  const t = useTheme();
  const bg = { primary: t.primary, secondary: t.card, danger: t.danger, ghost: 'transparent' }[variant];
  const fg = { primary: t.onPrimary, secondary: t.text, danger: '#fff', ghost: t.primary }[variant];
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: bg, borderColor: variant === 'secondary' ? t.border : 'transparent', opacity: disabled ? 0.5 : pressed ? 0.8 : 1 },
        style,
      ]}
    >
      {loading ? <ActivityIndicator color={fg} /> : icon ? <Ionicons name={icon} size={18} color={fg} /> : null}
      <Text style={{ color: fg, fontWeight: '600', fontSize: 15 }}>{title}</Text>
    </Pressable>
  );
}

export function IconButton({ icon, onPress, label, color, size = 22 }: { icon: IconName; onPress: () => void; label: string; color?: string; size?: number }) {
  const t = useTheme();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} hitSlop={10} onPress={onPress} style={({ pressed }) => ({ padding: 6, opacity: pressed ? 0.6 : 1 })}>
      <Ionicons name={icon} size={size} color={color ?? t.text} />
    </Pressable>
  );
}

export function Input(props: TextInputProps & { label?: string; error?: boolean }) {
  const t = useTheme();
  const { label, error, style, ...rest } = props;
  return (
    <View style={{ gap: 6 }}>
      {label && <Label>{label}</Label>}
      <TextInput
        placeholderTextColor={t.muted}
        {...rest}
        style={[styles.input, { backgroundColor: t.input, borderColor: error ? t.danger : t.border, color: t.text }, style]}
      />
    </View>
  );
}

export function Label({ children }: { children: ReactNode }) {
  const t = useTheme();
  return <Text style={{ color: t.muted, fontSize: 13, fontWeight: '600' }}>{children}</Text>;
}

export function Segmented<V extends string>({ value, options, onChange }: { value: V; options: { value: V; label: string }[]; onChange: (v: V) => void }) {
  const t = useTheme();
  return (
    <View style={[styles.segmented, { backgroundColor: t.dark ? t.input : '#f1f5f9' }]}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(o.value)}
            style={[styles.segment, active && { backgroundColor: t.card, shadowOpacity: 0.08 }]}
          >
            <Text style={{ color: active ? t.text : t.muted, fontWeight: '600', fontSize: 14 }}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Chip({ label, active, onPress, color }: { label: string; active: boolean; onPress: () => void; color?: string }) {
  const t = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, { borderColor: active ? (color ?? t.primary) : t.border, backgroundColor: active ? t.primarySoft : t.card }]}
    >
      <Text style={{ color: active ? t.text : t.muted, fontSize: 13, fontWeight: '600' }}>{label}</Text>
    </Pressable>
  );
}

export function ProgressBar({ value }: { value: number }) {
  const t = useTheme();
  const pct = Math.min(100, Math.max(0, value * 100));
  const color = value >= 1 ? t.danger : value >= 0.8 ? '#f59e0b' : t.success;
  return (
    <View style={{ height: 8, borderRadius: 4, backgroundColor: t.track, overflow: 'hidden' }}>
      <View style={{ width: `${pct}%`, height: '100%', borderRadius: 4, backgroundColor: color }} />
    </View>
  );
}

export function EmptyState({ icon, title, hint, action }: { icon: IconName; title: string; hint?: string; action?: ReactNode }) {
  const t = useTheme();
  return (
    <View style={{ alignItems: 'center', paddingVertical: 32, gap: 8 }}>
      <Ionicons name={icon} size={40} color={t.border} />
      <T bold>{title}</T>
      {hint && <T muted size={13} style={{ textAlign: 'center', maxWidth: 280 }}>{hint}</T>}
      {action}
    </View>
  );
}

export function ColorPicker({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
      {SWATCHES.map((c) => (
        <Pressable
          key={c}
          accessibilityLabel={`Color ${c}`}
          onPress={() => onChange(c)}
          style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: c, borderWidth: value === c ? 3 : 0, borderColor: '#fff', outlineColor: c, outlineWidth: value === c ? 2 : 0, outlineStyle: 'solid' }}
        />
      ))}
    </View>
  );
}

export function Row({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 12 }, style]}>{children}</View>;
}

export function ErrorText({ children }: { children: ReactNode }) {
  const t = useTheme();
  return children ? <Text style={{ color: t.danger, fontSize: 14 }}>{children}</Text> : null;
}

const styles = StyleSheet.create({
  card: { borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, padding: 16 },
  button: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, borderWidth: 1 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16 },
  segmented: { flexDirection: 'row', borderRadius: 12, padding: 4, alignSelf: 'flex-start' },
  segment: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 9, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowRadius: 2, shadowOpacity: 0 },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, borderWidth: 1 },
});
