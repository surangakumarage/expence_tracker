import { View } from 'react-native';
import { monthKey, monthLabel, shiftMonth } from '../lib/format';
import { useTheme } from '../data/settings';
import { IconButton, T } from './ui';

export function MonthPicker({ value, onChange }: { value: string; onChange: (m: string) => void }) {
  const t = useTheme();
  const isCurrent = value >= monthKey(new Date());
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: t.card, borderRadius: 12, borderWidth: 1, borderColor: t.border, paddingHorizontal: 4 }}>
      <IconButton icon="chevron-back" label="Previous month" onPress={() => onChange(shiftMonth(value, -1))} />
      <T bold>{monthLabel(value)}</T>
      <IconButton icon="chevron-forward" label="Next month" color={isCurrent ? t.border : t.text} onPress={() => !isCurrent && onChange(shiftMonth(value, 1))} />
    </View>
  );
}
