import { useMemo, useState } from 'react';
import { ScrollView, SectionList, View } from 'react-native';
import { router } from 'expo-router';
import { listTransactions, useQuery } from '../../data/db';
import { useAccounts, useCategories } from '../../data/hooks';
import { useSettings } from '../../data/settings';
import { dayLabel, monthKey, monthRange, toInputAmount } from '../../lib/format';
import { groupByDate, totals } from '../../lib/stats';
import { toCSV } from '../../lib/csv';
import { notify, shareTextFile } from '../../lib/platform';
import { MonthPicker } from '../../components/MonthPicker';
import { TransactionRow } from '../../components/TransactionRow';
import { Button, Card, Chip, EmptyState, IconButton, Input, Row, T } from '../../components/ui';

type TypeFilter = 'all' | 'expense' | 'income';

export default function Transactions() {
  const { fmt, theme: t } = useSettings();
  const { list: catList, byId: cats } = useCategories();
  const { byId: accs } = useAccounts();
  const [month, setMonth] = useState(monthKey(new Date()));
  const [allTime, setAllTime] = useState(false);
  const [query, setQuery] = useState('');
  const [type, setType] = useState<TypeFilter>('all');
  const [categoryId, setCategoryId] = useState<number | null>(null);

  const range = allTime ? undefined : monthRange(month);
  const base = useQuery(() => listTransactions(range), [allTime, month]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (base ?? []).filter((x) => {
      if (type !== 'all' && x.type !== type) return false;
      if (categoryId != null && x.categoryId !== categoryId) return false;
      if (q) {
        const hay = `${x.note} ${cats.get(x.categoryId)?.name ?? ''} ${accs.get(x.accountId)?.name ?? ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [base, query, type, categoryId, cats, accs]);

  const sections = useMemo(() => groupByDate(filtered).map((g) => ({ title: g.date, net: g.net, data: g.items })), [filtered]);
  const sum = totals(filtered);
  const visibleCats = catList.filter((c) => type === 'all' || c.kind === type);

  async function exportCSV() {
    const rows = [...filtered].reverse().map((x) => [x.date, x.type, cats.get(x.categoryId)?.name ?? '', accs.get(x.accountId)?.name ?? '', toInputAmount(x.amount), x.note]);
    try {
      await shareTextFile(`transactions-${allTime ? 'all' : month}.csv`, toCSV(['Date', 'Type', 'Category', 'Account', 'Amount', 'Note'], rows), 'text/csv');
    } catch (e) {
      notify('Export failed', String(e));
    }
  }

  const header = (
    <View style={{ gap: 12, paddingBottom: 8 }}>
      <Row>
        <View style={{ flex: 1 }}>{allTime ? <T bold>All time</T> : <MonthPicker value={month} onChange={setMonth} />}</View>
        <Chip label="All time" active={allTime} onPress={() => setAllTime(!allTime)} />
        <IconButton icon="share-outline" label="Export CSV" onPress={exportCSV} />
      </Row>
      <Input placeholder="Search notes, categories, accounts…" value={query} onChangeText={setQuery} accessibilityLabel="Search" />
      <Row style={{ gap: 8 }}>
        {(['all', 'expense', 'income'] as const).map((v) => (
          <Chip key={v} label={v === 'all' ? 'All' : v === 'expense' ? 'Expenses' : 'Income'} active={type === v} onPress={() => { setType(v); setCategoryId(null); }} />
        ))}
      </Row>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
        <Chip label="All categories" active={categoryId == null} onPress={() => setCategoryId(null)} />
        {visibleCats.map((c) => (
          <Chip key={c.id} label={c.name} color={c.color} active={categoryId === c.id} onPress={() => setCategoryId(categoryId === c.id ? null : c.id!)} />
        ))}
      </ScrollView>
      <Row style={{ gap: 8 }}>
        <Summary label="Income" value={fmt(sum.income)} color={t.success} />
        <Summary label="Expenses" value={fmt(sum.expense)} color={t.danger} />
        <Summary label="Net" value={fmt(sum.net)} />
      </Row>
    </View>
  );

  return (
    <SectionList
      style={{ flex: 1, backgroundColor: t.bg }}
      contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
      sections={sections}
      keyExtractor={(x) => String(x.id)}
      ListHeaderComponent={header}
      stickySectionHeadersEnabled={false}
      keyboardShouldPersistTaps="handled"
      renderSectionHeader={({ section }) => (
        <Row style={{ justifyContent: 'space-between', marginTop: 12, paddingBottom: 4, borderBottomWidth: 1, borderColor: t.border }}>
          <T muted size={12} bold>{dayLabel(section.title)}</T>
          <T muted size={12}>{section.net >= 0 ? '+' : '−'}{fmt(Math.abs(section.net))}</T>
        </Row>
      )}
      renderItem={({ item }) => (
        <TransactionRow
          tx={item}
          category={cats.get(item.categoryId)}
          account={accs.get(item.accountId)}
          onPress={() => router.push({ pathname: '/transaction', params: { id: String(item.id) } })}
        />
      )}
      ListEmptyComponent={
        base ? (
          <EmptyState
            icon="receipt-outline"
            title={query || type !== 'all' || categoryId != null ? 'No matching transactions' : 'No transactions yet'}
            action={<Button title="Add transaction" icon="add" onPress={() => router.push('/transaction')} />}
          />
        ) : undefined
      }
    />
  );
}

function Summary({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <Card style={{ flex: 1, padding: 10, alignItems: 'center' }}>
      <T muted size={11}>{label}</T>
      <T bold size={13} color={color} numberOfLines={1}>{value}</T>
    </Card>
  );
}
