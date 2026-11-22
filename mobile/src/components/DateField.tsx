import { useState } from 'react';
import { View } from 'react-native';
import { fromISODate, toISODate, today } from '../lib/format';
import { Chip, IconButton, Input, Label, Row } from './ui';

const ISO = /^\d{4}-\d{2}-\d{2}$/;
const valid = (s: string) => ISO.test(s) && toISODate(fromISODate(s)) === s;

/** Simple cross-platform date input: quick chips, day stepper and YYYY-MM-DD text. */
export function DateField({ label, value, onChange, allowFuture = true, optional }: {
  label: string; value: string; onChange: (v: string) => void; allowFuture?: boolean; optional?: boolean;
}) {
  const [text, setText] = useState(value);
  const [lastValue, setLastValue] = useState(value);
  if (value !== lastValue) {
    setLastValue(value);
    setText(value);
  }

  const shift = (days: number) => {
    const d = fromISODate(valid(value) ? value : today());
    d.setDate(d.getDate() + days);
    const next = toISODate(d);
    if (!allowFuture && next > today()) return;
    onChange(next);
  };
  const yesterday = (() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return toISODate(d);
  })();

  return (
    <View style={{ gap: 6 }}>
      <Label>{label}</Label>
      <Row style={{ gap: 4 }}>
        <IconButton icon="chevron-back" label="Previous day" onPress={() => shift(-1)} />
        <View style={{ flex: 1 }}>
          <Input
            value={text}
            placeholder={optional ? 'YYYY-MM-DD (optional)' : 'YYYY-MM-DD'}
            onChangeText={(v) => {
              setText(v);
              if (valid(v) || (optional && v === '')) onChange(v);
            }}
            error={text !== '' && !valid(text)}
            accessibilityLabel={label}
            style={{ textAlign: 'center' }}
          />
        </View>
        <IconButton icon="chevron-forward" label="Next day" onPress={() => shift(1)} />
      </Row>
      <Row style={{ gap: 8 }}>
        <Chip label="Today" active={value === today()} onPress={() => onChange(today())} />
        <Chip label="Yesterday" active={value === yesterday} onPress={() => onChange(yesterday)} />
        {optional && value !== '' && <Chip label="Clear" active={false} onPress={() => onChange('')} />}
      </Row>
    </View>
  );
}
