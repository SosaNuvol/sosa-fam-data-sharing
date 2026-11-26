import { Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, SectionList, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Chip } from '../../components/Chip';
import { colors, ErrorText, Muted } from '../../components/ui';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { useHouseholdEvents } from '../../lib/realtime';
import type { GroceryItem, GroceryListDetail, Store } from '../../lib/types';

type Filter = string | null; // a store id, or null for every store

/** "2 gal" -> { quantity: 2, unit: "gal" }, "3" -> { quantity: 3 }, "" -> {} */
function parseAmount(text: string): { quantity?: number; unit?: string } {
  const m = text.trim().match(/^(\d+(?:\.\d+)?)\s*(.*)$/);
  if (!m) return text.trim() ? { unit: text.trim().slice(0, 20) } : {};
  return { quantity: Number(m[1]), unit: m[2]?.trim().slice(0, 20) || undefined };
}

function amount(item: GroceryItem) {
  if (item.quantity == null) return item.unit ?? '';
  return `${Number(item.quantity)}${item.unit ? ` ${item.unit}` : ''}`;
}

/**
 * One grocery list. Items are grouped by store; pick a store to see only what to buy there.
 * Check-offs show up for everyone watching the list right away.
 */
export default function ListScreen() {
  const { listId } = useLocalSearchParams<{ listId: string }>();
  const { current } = useAuth();
  const householdId = current?.householdId;
  const base = `/households/${householdId}/grocery-lists/${listId}`;

  const [detail, setDetail] = useState<GroceryListDetail | null>(null);
  const [stores, setStores] = useState<Store[]>([]);
  const [filter, setFilter] = useState<Filter>(null);
  const [name, setName] = useState('');
  const [qty, setQty] = useState('');
  // Store for new items: undefined follows the store filter, null is "any store".
  const [newStoreId, setNewStoreId] = useState<string | null | undefined>(undefined);
  const addStoreId = newStoreId === undefined ? filter : newStoreId;
  const pickFilter = (f: Filter) => {
    setFilter(f);
    setNewStoreId(undefined);
  };
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!householdId || !listId) return;
    try {
      const [d, s] = await Promise.all([
        api<GroceryListDetail>(`/households/${householdId}/grocery-lists/${listId}`),
        api<Store[]>(`/households/${householdId}/stores`),
      ]);
      setDetail(d);
      setStores(s);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load the list.');
    }
  }, [householdId, listId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const upsert = useCallback((item: GroceryItem) => {
    setDetail((d) => {
      if (!d) return d;
      const exists = d.items.some((i) => i.id === item.id);
      return { ...d, items: exists ? d.items.map((i) => (i.id === item.id ? item : i)) : [...d.items, item] };
    });
  }, []);

  useHouseholdEvents(householdId, {
    groceryItemUpserted: (lid, item) => lid === listId && upsert(item),
    groceryItemDeleted: (lid, itemId) =>
      lid === listId && setDetail((d) => (d ? { ...d, items: d.items.filter((i) => i.id !== itemId) } : d)),
    groceryListsChanged: load,
    reconnected: load,
  });

  const sections = useMemo(() => {
    const items = detail?.items ?? [];
    const visible = items.filter((i) => filter === null || i.storeId === null || i.storeId === filter);
    const open = visible.filter((i) => !i.isChecked);
    const groups = new Map<string, GroceryItem[]>();
    for (const i of open) {
      const key = i.storeName ?? 'Any store';
      groups.set(key, [...(groups.get(key) ?? []), i]);
    }
    const ordered = [...groups.entries()].sort(([a], [b]) => (a === 'Any store' ? 1 : b === 'Any store' ? -1 : a.localeCompare(b)));
    const done = visible.filter((i) => i.isChecked);
    return [
      ...ordered.map(([title, data]) => ({ title, data })),
      ...(done.length ? [{ title: `In the cart (${done.length})`, data: done }] : []),
    ];
  }, [detail, filter]);

  const openCount = (storeId: string | null) => detail?.items.filter((i) => !i.isChecked && i.storeId === storeId).length ?? 0;

  const toggle = async (item: GroceryItem) => {
    const next = !item.isChecked;
    upsert({ ...item, isChecked: next, checkedByName: next ? 'You' : null });
    try {
      upsert(await api<GroceryItem>(`${base}/items/${item.id}/checked`, { method: 'PUT', body: { isChecked: next } }));
    } catch (e) {
      upsert(item);
      setError(e instanceof Error ? e.message : 'Could not update the item.');
    }
  };

  const add = async () => {
    if (!name.trim()) return;
    const storeId = addStoreId;
    try {
      const item = await api<GroceryItem>(`${base}/items`, {
        method: 'POST',
        body: { name: name.trim(), storeId, ...parseAmount(qty) },
      });
      upsert(item);
      setName('');
      setQty('');
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not add the item.');
    }
  };

  const remove = (item: GroceryItem) =>
    Alert.alert(`Remove ${item.name}?`, undefined, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          setDetail((d) => (d ? { ...d, items: d.items.filter((i) => i.id !== item.id) } : d));
          await api(`${base}/items/${item.id}`, { method: 'DELETE' }).catch(load);
        },
      },
    ]);

  const clearChecked = () =>
    Alert.alert('Remove everything in the cart?', 'Checked items are removed from the list for everyone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => api(`${base}/clear-checked`, { method: 'POST' }).then(load, load) },
    ]);

  const hasChecked = detail?.items.some((i) => i.isChecked);
  // Android draws the app under its navigation bar (edge-to-edge), so keep the add row above it.
  const insets = useSafeAreaInsets();

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: '#fff' }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
      <Stack.Screen
        options={{
          title: detail?.list.name ?? 'List',
          headerRight: () =>
            hasChecked ? (
              <Pressable onPress={clearChecked} hitSlop={8}>
                <Text style={{ color: colors.primary, fontSize: 16 }}>Clear cart</Text>
              </Pressable>
            ) : null,
        }}
      />

      {stores.length > 0 && (
        <View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 16, paddingVertical: 10 }}>
            <Chip label="All stores" selected={filter === null} onPress={() => pickFilter(null)} />
            {stores.map((s) => (
              <Chip key={s.id} label={`${s.name} (${openCount(s.id)})`} selected={filter === s.id} onPress={() => pickFilter(s.id)} />
            ))}
          </ScrollView>
        </View>
      )}

      <SectionList
        sections={sections}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16 }}
        stickySectionHeadersEnabled={false}
        ListEmptyComponent={detail ? <Muted>Nothing on this list yet. Add the first item below.</Muted> : undefined}
        renderSectionHeader={({ section }) => (
          <Text style={{ fontSize: 14, fontWeight: '700', color: colors.muted, marginTop: 16, marginBottom: 4, textTransform: 'uppercase' }}>
            {section.title}
          </Text>
        )}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => toggle(item)}
            onLongPress={() => remove(item)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: item.isChecked }}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderColor: colors.border }}
          >
            <View
              style={{
                width: 24,
                height: 24,
                borderRadius: 6,
                borderWidth: 2,
                borderColor: item.isChecked ? colors.primary : colors.border,
                backgroundColor: item.isChecked ? colors.primary : '#fff',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {item.isChecked && <Text style={{ color: '#fff', fontWeight: '700' }}>✓</Text>}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 16, color: item.isChecked ? colors.muted : colors.text, textDecorationLine: item.isChecked ? 'line-through' : 'none' }}>
                {item.name}
                {amount(item) ? <Text style={{ color: colors.muted }}>{`  ${amount(item)}`}</Text> : null}
              </Text>
              {(item.isChecked && item.checkedByName) || item.source === 'LowStock' ? (
                <Muted>
                  {[item.isChecked && item.checkedByName ? `Got by ${item.checkedByName}` : null, item.source === 'LowStock' ? 'Low in storage' : null]
                    .filter(Boolean)
                    .join(' · ')}
                </Muted>
              ) : null}
            </View>
            {item.isChecked && item.storeName ? <Muted>{item.storeName}</Muted> : null}
          </Pressable>
        )}
      />

      <View style={{ borderTopWidth: 1, borderColor: colors.border, padding: 12, paddingBottom: 12 + insets.bottom, gap: 8 }}>
        <ErrorText message={error} />
        {stores.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }} keyboardShouldPersistTaps="handled">
            <Muted>Buy at:</Muted>
            <Chip label="Any store" selected={addStoreId === null} onPress={() => setNewStoreId(null)} />
            {stores.map((s) => (
              <Chip key={s.id} label={s.name} selected={addStoreId === s.id} onPress={() => setNewStoreId(s.id)} />
            ))}
          </ScrollView>
        )}
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Add an item"
            placeholderTextColor={colors.muted}
            onSubmitEditing={add}
            returnKeyType="done"
            style={{ flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16, color: colors.text }}
          />
          <TextInput
            value={qty}
            onChangeText={setQty}
            placeholder="Qty"
            placeholderTextColor={colors.muted}
            onSubmitEditing={add}
            style={{ width: 80, borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16, color: colors.text }}
          />
          <Pressable onPress={add} style={{ backgroundColor: colors.primary, borderRadius: 10, paddingHorizontal: 16, justifyContent: 'center' }}>
            <Text style={{ color: '#fff', fontWeight: '600', fontSize: 16 }}>Add</Text>
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
