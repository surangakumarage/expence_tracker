import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { deleteCategory, saveCategory } from '../data/db';
import { useCategories } from '../data/hooks';
import { closeScreen, confirm } from '../lib/platform';
import type { Category, TxType } from '../lib/types';
import { CategoryIcon, ICONS } from '../components/CategoryIcon';
import { Button, ColorPicker, ErrorText, Input, Label, Row, Screen, Segmented, T } from '../components/ui';

export default function CategoryEdit() {
  const { id, kind } = useLocalSearchParams<{ id?: string; kind?: TxType }>();
  const { byId, list } = useCategories();
  const category = id ? byId.get(Number(id)) : undefined;
  if (id && list.length === 0) return <Screen><T muted>Loading…</T></Screen>;
  return <CategoryForm key={category?.id ?? 'new'} category={category} defaultKind={kind === 'income' ? 'income' : 'expense'} />;
}

function CategoryForm({ category, defaultKind }: { category?: Category; defaultKind: TxType }) {
  const [name, setName] = useState(category?.name ?? '');
  const [kind, setKind] = useState<TxType>(category?.kind ?? defaultKind);
  const [color, setColor] = useState(category?.color ?? '#6366f1');
  const [icon, setIcon] = useState(category?.icon ?? 'circle');
  const [error, setError] = useState('');

  async function submit() {
    if (!name.trim()) return setError('Enter a name.');
    await saveCategory({ name: name.trim(), kind, color, icon }, category?.id);
    closeScreen();
  }

  async function remove() {
    if (!category?.id || !(await confirm('Delete category?', `Delete "${category.name}"?`, 'Delete', true))) return;
    const err = await deleteCategory(category.id);
    if (err) setError(err);
    else closeScreen();
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: category ? 'Edit category' : 'New category' }} />
      <Row>
        <CategoryIcon icon={icon} color={color} size={48} />
        <View style={{ flex: 1 }}>
          <Input value={name} onChangeText={setName} placeholder="Category name" maxLength={40} accessibilityLabel="Name" />
        </View>
      </Row>
      {!category && <Segmented value={kind} onChange={setKind} options={[{ value: 'expense', label: 'Expense' }, { value: 'income', label: 'Income' }]} />}
      <Label>Color</Label>
      <ColorPicker value={color} onChange={setColor} />
      <Label>Icon</Label>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {Object.keys(ICONS).map((k) => (
          <Pressable
            key={k}
            accessibilityLabel={k}
            onPress={() => setIcon(k)}
            style={{ borderRadius: 14, borderWidth: 2, borderColor: icon === k ? color : 'transparent', padding: 2 }}
          >
            <CategoryIcon icon={k} color={color} size={38} />
          </Pressable>
        ))}
      </View>
      <ErrorText>{error}</ErrorText>
      <Button title="Save" onPress={submit} />
      {category && <Button title="Delete" variant="ghost" icon="trash-outline" onPress={remove} style={{ alignSelf: 'center' }} />}
    </Screen>
  );
}
