import { View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useTheme } from '../data/settings';
import { T } from './ui';

/** Donut chart drawn with stroke-dash segments. */
export function Donut({ data, size = 180, thickness = 26, center }: {
  data: { value: number; color: string }[]; size?: number; thickness?: number; center?: React.ReactNode;
}) {
  const t = useTheme();
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  const total = data.reduce((s, d) => s + d.value, 0);
  const gap = data.length > 1 ? 2 : 0;
  let offset = 0;
  return (
    <View style={{ width: size, height: size, alignSelf: 'center' }}>
      <View style={{ transform: [{ rotate: '-90deg' }] }}>
      <Svg width={size} height={size}>
          <Circle cx={size / 2} cy={size / 2} r={r} stroke={t.track} strokeWidth={thickness} fill="none" />
          {total > 0 &&
            data.map((d, i) => {
              const len = (d.value / total) * c;
              const seg = (
                <Circle
                  key={i}
                  cx={size / 2}
                  cy={size / 2}
                  r={r}
                  stroke={d.color}
                  strokeWidth={thickness}
                  fill="none"
                  strokeDasharray={`${Math.max(0, len - gap)} ${c}`}
                  strokeDashoffset={-offset}
                />
              );
              offset += len;
              return seg;
            })}
      </Svg>
      </View>
      {center && (
        <View style={{ position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center' }} pointerEvents="none">
          {center}
        </View>
      )}
    </View>
  );
}

/** Grouped income/expense bars per month. */
export function MonthBars({ data, height = 160, fmtCompact }: {
  data: { label: string; income: number; expense: number }[]; height?: number; fmtCompact: (n: number) => string;
}) {
  const t = useTheme();
  const max = Math.max(1, ...data.flatMap((d) => [d.income, d.expense]));
  return (
    <View>
      <T muted size={11} style={{ marginBottom: 4 }}>max {fmtCompact(max)}</T>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', height, gap: 6, borderBottomWidth: 1, borderColor: t.border }}>
        {data.map((d) => (
          <View key={d.label} style={{ flex: 1, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: 3, height: '100%' }}>
            <View accessibilityLabel={`${d.label} income`} style={{ width: '38%', height: `${(d.income / max) * 100}%`, backgroundColor: t.success, borderTopLeftRadius: 4, borderTopRightRadius: 4 }} />
            <View accessibilityLabel={`${d.label} expense`} style={{ width: '38%', height: `${(d.expense / max) * 100}%`, backgroundColor: t.danger, borderTopLeftRadius: 4, borderTopRightRadius: 4 }} />
          </View>
        ))}
      </View>
      <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
        {data.map((d) => (
          <T key={d.label} muted size={11} style={{ flex: 1, textAlign: 'center' }}>{d.label}</T>
        ))}
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 16, marginTop: 8 }}>
        <Legend color={t.success} label="Income" />
        <Legend color={t.danger} label="Expense" />
      </View>
    </View>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: color }} />
      <T muted size={12}>{label}</T>
    </View>
  );
}
