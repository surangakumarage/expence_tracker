import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { listBudgets, listTransactions, useQuery } from '../../data/db';
import { useAccounts, useCategories } from '../../data/hooks';
import { useSettings } from '../../data/settings';
import { monthKey, monthLabel, monthRange, shiftMonth } from '../../lib/format';
import { accountBalances, budgetStatus, byCategory, totals } from '../../lib/stats';
import type { TxType } from '../../lib/types';
import { Donut, MonthBars } from '../../components/Charts';
import { MonthPicker } from '../../components/MonthPicker';
import { TransactionRow } from '../../components/TransactionRow';
import { Button, Card, EmptyState, ProgressBar, Row, Screen, Segmented, T, type IconName } from '../../components/ui';

const compact = (minor: number) => new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 1 }).format(minor / 100);

export default function Dashboard() {
  const { fmt, theme: t } = useSettings();
  const [month, setMonth] = useState(monthKey(new Date()));
  const [breakdown, setBreakdown] = useState<TxType>('expense');
  const { byId: cats } = useCategories();
  const { list: accounts, byId: accs } = useAccounts();
  const all = useQuery(() => listTransactions());
  const budgetRows = useQuery(listBudgets);

  const data = useMemo(() => {
    const txs = all ?? [];
    const budgets = budgetRows ?? [];
    const { start, end } = monthRange(month);
    const monthTxs = txs.filter((x) => x.date >= start && x.date <= end);
    const trend = Array.from({ length: 6 }, (_, i) => {
      const m = shiftMonth(month, i - 5);
      const tt = totals(txs.filter((x) => x.date.startsWith(m)));
      return { label: monthLabel(m, 'short').split(' ')[0], income: tt.income, expense: tt.expense };
    });
    const bal = accountBalances(accounts, txs);
    const netWorth = [...bal.entries()].filter(([id]) => !accs.get(id)?.archived).reduce((s, [, v]) => s + v, 0);
    return {
      t: totals(monthTxs),
      byCat: { expense: byCategory(monthTxs, 'expense'), income: byCategory(monthTxs, 'income') },
      trend,
      netWorth,
      budgets: budgetStatus(budgets, monthTxs),
      recent: monthTxs.slice(0, 5),
    };
  }, [all, month, accounts, accs, budgetRows]);

  if (!all) return <Screen><View /></Screen>;

  const pie = data.byCat[breakdown];
  const pieTotal = breakdown === 'income' ? data.t.income : data.t.expense;
  const alerts = data.budgets.filter((b) => b.ratio >= 0.8);
  const savingsRate = data.t.income > 0 ? Math.round((data.t.net / data.t.income) * 100) : null;

  return (
    <Screen>
      <MonthPicker value={month} onChange={setMonth} />

      <View style={{ flexDirection: 'row', gap: 12 }}>
        <Stat label="Income" value={fmt(data.t.income)} icon="arrow-up" color={t.success} />
        <Stat label="Expenses" value={fmt(data.t.expense)} icon="arrow-down" color={t.danger} />
      </View>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <Stat label="Net savings" value={fmt(data.t.net)} hint={savingsRate != null ? `${savingsRate}% of income` : undefined} icon="trending-up" color={t.primary} />
        <Stat label="Total balance" value={fmt(data.netWorth)} hint="All accounts" icon="wallet" color="#0ea5e9" />
      </View>

      {alerts.map((a) => {
        const over = a.ratio >= 1;
        const name = cats.get(a.budget.categoryId)?.name;
        return (
          <Row key={a.budget.id} style={{ backgroundColor: over ? t.dangerSoft : t.warningSoft, padding: 12, borderRadius: 12, gap: 8 }}>
            <Ionicons name="warning" size={16} color={over ? t.danger : t.warning} />
            <T size={13} color={over ? t.danger : t.warning} style={{ flex: 1 }}>
              {over ? `${name}: over budget by ${fmt(-a.remaining)}` : `${name}: ${Math.round(a.ratio * 100)}% used, ${fmt(a.remaining)} left`}
            </T>
          </Row>
        );
      })}

      <Card style={{ gap: 12 }}>
        <Row style={{ justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <T bold>{breakdown === 'income' ? 'Income' : 'Spending'} by category</T>
          <Segmented value={breakdown} onChange={setBreakdown} options={[{ value: 'expense', label: 'Expenses' }, { value: 'income', label: 'Income' }]} />
        </Row>
        {pie.length === 0 ? (
          <EmptyState icon="receipt-outline" title={breakdown === 'income' ? 'No income this month' : 'No expenses this month'} />
        ) : (
          <>
            <Donut
              data={pie.map((p) => ({ value: p.amount, color: cats.get(p.categoryId)?.color ?? '#94a3b8' }))}
              center={
                <>
                  <T muted size={12}>Total</T>
                  <T bold size={15} color={breakdown === 'income' ? t.success : t.danger}>{fmt(pieTotal)}</T>
                </>
              }
            />
            <View style={{ gap: 8 }}>
              {pie.map((p) => {
                const c = cats.get(p.categoryId);
                return (
                  <Row key={p.categoryId} style={{ gap: 8 }}>
                    <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: c?.color }} />
                    <T size={14} numberOfLines={1} style={{ flex: 1 }}>{c?.name}</T>
                    <T muted size={13}>{Math.round((p.amount / pieTotal) * 100)}%</T>
                    <T bold size={14} style={{ minWidth: 90, textAlign: 'right' }}>{fmt(p.amount)}</T>
                  </Row>
                );
              })}
            </View>
          </>
        )}
      </Card>

      <Card style={{ gap: 12 }}>
        <T bold>Last 6 months</T>
        <MonthBars data={data.trend} fmtCompact={compact} />
      </Card>

      <Card style={{ gap: 12 }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <T bold>Budgets</T>
          <Button title="Manage" variant="ghost" onPress={() => router.navigate('/budgets')} style={{ paddingVertical: 4 }} />
        </Row>
        {data.budgets.length === 0 ? (
          <EmptyState icon="pie-chart-outline" title="No budgets yet" hint="Set monthly limits per category to get alerts before you overspend." />
        ) : (
          data.budgets.slice(0, 5).map((b) => (
            <View key={b.budget.id} style={{ gap: 6 }}>
              <Row style={{ justifyContent: 'space-between' }}>
                <T size={14}>{cats.get(b.budget.categoryId)?.name}</T>
                <T muted size={13}>{fmt(b.spent)} / {fmt(b.budget.amount)}</T>
              </Row>
              <ProgressBar value={b.ratio} />
            </View>
          ))
        )}
      </Card>

      <Card>
        <Row style={{ justifyContent: 'space-between' }}>
          <T bold>Recent transactions</T>
          <Button title="View all" variant="ghost" onPress={() => router.navigate('/transactions')} style={{ paddingVertical: 4 }} />
        </Row>
        {data.recent.length === 0 ? (
          <EmptyState
            icon="receipt-outline"
            title="Nothing recorded this month"
            action={<Button title="Add transaction" icon="add" onPress={() => router.push('/transaction')} />}
          />
        ) : (
          data.recent.map((x) => (
            <TransactionRow key={x.id} tx={x} category={cats.get(x.categoryId)} account={accs.get(x.accountId)} onPress={() => router.push({ pathname: '/transaction', params: { id: String(x.id) } })} />
          ))
        )}
      </Card>
    </Screen>
  );
}

function Stat({ label, value, hint, icon, color }: { label: string; value: string; hint?: string; icon: IconName; color: string }) {
  return (
    <Card style={{ flex: 1, gap: 6, padding: 14 }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <T muted size={13}>{label}</T>
        <View style={{ backgroundColor: `${color}22`, borderRadius: 8, padding: 4 }}>
          <Ionicons name={icon} size={14} color={color} />
        </View>
      </Row>
      <T bold size={18} numberOfLines={1}>{value}</T>
      {hint && <T muted size={11}>{hint}</T>}
    </Card>
  );
}
