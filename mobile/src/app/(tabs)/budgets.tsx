import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { listBudgets, listTransactions, setBudget, useQuery } from '../../data/db';
import { useCategories } from '../../data/hooks';
import { useSettings } from '../../data/settings';
import { monthKey, monthLabel, monthRange, parseAmount, toInputAmount } from '../../lib/format';
import { byCategory } from '../../lib/stats';
import { CategoryIcon } from '../../components/CategoryIcon';
import { MonthPicker } from '../../components/MonthPicker';
import { Card, IconButton, Input, ProgressBar, Row, Screen, T } from '../../components/ui';

export default function Budgets() {
  const { fmt, theme: t } = useSettings();
  const [month, setMonth] = useState(monthKey(new Date()));
  const { list: categories } = useCategories();
  const budgetRows = useQuery(listBudgets);
  const monthTxs = useQuery(() => listTransactions(monthRange(month)), [month]);
  const budgets = useMemo(() => budgetRows ?? [], [budgetRows]);

  const spent = useMemo(() => new Map(byCategory(monthTxs ?? [], 'expense').map((c) => [c.categoryId, c.amount])), [monthTxs]);
  const limits = useMemo(() => new Map(budgets.map((b) => [b.categoryId, b.amount])), [budgets]);
  const totalBudget = budgets.reduce((s, b) => s + b.amount, 0);
  const totalSpent = budgets.reduce((s, b) => s + (spent.get(b.categoryId) ?? 0), 0);
  const left = totalBudget - totalSpent;

  return (
    <Screen>
      <MonthPicker value={month} onChange={setMonth} />
      <Card style={{ gap: 8 }}>
        <T muted size={13}>Total budgeted · {monthLabel(month)}</T>
        <Row style={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
          <T bold size={22}>{fmt(totalSpent)} <T muted size={14}>of {fmt(totalBudget)}</T></T>
          {totalBudget > 0 && <T bold size={13} color={left < 0 ? t.danger : t.success}>{left < 0 ? `${fmt(-left)} over` : `${fmt(left)} left`}</T>}
        </Row>
        {totalBudget > 0 ? <ProgressBar value={totalSpent / totalBudget} /> : <T muted size={13}>Enter a limit next to any category to start budgeting.</T>}
      </Card>
      <Card style={{ paddingVertical: 4 }}>
        {categories.filter((c) => c.kind === 'expense').map((c, i) => (
          <BudgetRow
            key={c.id}
            first={i === 0}
            categoryId={c.id!}
            name={c.name}
            icon={<CategoryIcon icon={c.icon} color={c.color} />}
            limit={limits.get(c.id!)}
            spent={spent.get(c.id!) ?? 0}
          />
        ))}
      </Card>
    </Screen>
  );
}

function BudgetRow({ categoryId, name, icon, limit, spent, first }: { categoryId: number; name: string; icon: React.ReactNode; limit?: number; spent: number; first: boolean }) {
  const { fmt, theme: t } = useSettings();
  const [value, setValue] = useState(limit != null ? toInputAmount(limit) : '');
  const [lastLimit, setLastLimit] = useState(limit);
  if (limit !== lastLimit) {
    setLastLimit(limit);
    setValue(limit != null ? toInputAmount(limit) : '');
  }
  const parsed = value.trim() === '' ? null : parseAmount(value);
  const invalid = parsed != null && (!Number.isFinite(parsed) || parsed <= 0);

  function save() {
    if (invalid) return;
    if ((parsed ?? undefined) !== limit) setBudget(categoryId, parsed);
  }

  return (
    <View style={{ paddingVertical: 12, gap: 8, borderTopWidth: first ? 0 : 1, borderColor: t.border }}>
      <Row>
        {icon}
        <View style={{ flex: 1, gap: 2 }}>
          <T bold size={14}>{name}</T>
          <T muted size={12}>{fmt(spent)}{limit != null ? ` of ${fmt(limit)}` : ' · no budget'}</T>
        </View>
        <Input
          value={value}
          onChangeText={setValue}
          onBlur={save}
          onSubmitEditing={save}
          keyboardType="decimal-pad"
          placeholder="Limit"
          error={invalid}
          accessibilityLabel={`${name} monthly budget`}
          style={{ width: 100, textAlign: 'right', paddingVertical: 6 }}
        />
        {limit != null && <IconButton icon="trash-outline" label="Remove budget" color={t.muted} size={18} onPress={() => setBudget(categoryId, null)} />}
      </Row>
      {limit != null && <ProgressBar value={spent / limit} />}
    </View>
  );
}
