import { Redirect, router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, FlatList, Pressable, RefreshControl, ScrollView, Text, TextInput, View } from 'react-native';
import { Chip } from '../components/Chip';
import { Button, colors, ErrorText, Muted, Title } from '../components/ui';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { useHouseholdEvents } from '../lib/realtime';
import type { GroceryList } from '../lib/types';

/** The family's grocery lists: the app's first screen. */
export default function Home() {
  const { status, me, current, selectHousehold } = useAuth();
  const [lists, setLists] = useState<GroceryList[]>([]);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const householdId = current?.householdId;

  const load = useCallback(async () => {
    if (!householdId) return;
    setLoading(true);
    try {
      setLists(await api<GroceryList[]>(`/households/${householdId}/grocery-lists`));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load lists.');
    } finally {
      setLoading(false);
    }
  }, [householdId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  useHouseholdEvents(householdId, {
    groceryListsChanged: load,
    groceryItemUpserted: load,
    groceryItemDeleted: load,
    reconnected: load,
  });

  if (status === 'signedOut') return <Redirect href="/sign-in" />;
  if (status === 'signedIn' && !current) return <Redirect href="/welcome" />;
  if (!current) return null;

  const create = async () => {
    if (!name.trim()) return;
    setBusy(true);
    try {
      const list = await api<GroceryList>(`/households/${current.householdId}/grocery-lists`, { method: 'POST', body: { name: name.trim() } });
      setName('');
      router.push({ pathname: '/list/[listId]', params: { listId: list.id } });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create the list.');
    } finally {
      setBusy(false);
    }
  };

  const confirmDelete = (list: GroceryList) => {
    Alert.alert(`Delete "${list.name}"?`, 'The list and all its items are removed for everyone in the family.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await api(`/households/${current.householdId}/grocery-lists/${list.id}`, { method: 'DELETE' });
            setLists((all) => all.filter((l) => l.id !== list.id));
            setError(null);
          } catch (e) {
            setError(e instanceof Error ? e.message : 'Could not delete the list.');
          }
        },
      },
    ]);
  };

  return (
    <FlatList
      style={{ backgroundColor: '#fff' }}
      contentContainerStyle={{ padding: 24, gap: 10 }}
      data={lists}
      keyExtractor={(l) => l.id}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
      ListHeaderComponent={
        <View style={{ gap: 12, marginBottom: 8 }}>
          <Title>{current.householdName}</Title>
          {me && me.households.length > 1 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {me.households.map((h) => (
                <Chip key={h.householdId} label={h.householdName} selected={h.householdId === current.householdId} onPress={() => selectHousehold(h.householdId)} />
              ))}
            </ScrollView>
          )}
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Chip label="Family" onPress={() => router.push('/family')} />
            <Chip label="Stores" onPress={() => router.push('/stores')} />
          </View>
          <Text style={{ fontSize: 18, fontWeight: '600', marginTop: 8, color: colors.text }}>Grocery lists</Text>
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="New list, e.g. This week"
              placeholderTextColor={colors.muted}
              onSubmitEditing={create}
              returnKeyType="done"
              style={{ flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, color: colors.text }}
            />
            <View style={{ width: 90 }}>
              <Button title="Create" onPress={create} busy={busy} />
            </View>
          </View>
          <ErrorText message={error} />
          {lists.length > 0 && <Muted>Press and hold a list to delete it.</Muted>}
        </View>
      }
      ListEmptyComponent={loading ? undefined : <Muted>No lists yet. Create one and share it with the family.</Muted>}
      renderItem={({ item }) => (
        <Pressable
          onPress={() => router.push({ pathname: '/list/[listId]', params: { listId: item.id } })}
          onLongPress={() => confirmDelete(item)}
          style={({ pressed }) => ({
            padding: 16,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: colors.border,
            backgroundColor: pressed ? colors.surface : '#fff',
          })}
        >
          <Text style={{ fontSize: 17, fontWeight: '600', color: colors.text }}>{item.name}</Text>
          <Muted>
            {item.itemCount === 0
              ? 'Empty'
              : item.openCount === 0
                ? `All ${item.itemCount} items done`
                : `${item.openCount} of ${item.itemCount} items left`}
          </Muted>
        </Pressable>
      )}
    />
  );
}
