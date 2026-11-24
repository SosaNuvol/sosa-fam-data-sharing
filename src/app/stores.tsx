import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, FlatList, Pressable, Text, TextInput, View } from 'react-native';
import { Button, colors, ErrorText, Muted } from '../components/ui';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { canManageMembers, type Store } from '../lib/types';

/** The stores this family shops at. Items on a list can be tagged with one. */
export default function Stores() {
  const { current } = useAuth();
  const [stores, setStores] = useState<Store[]>([]);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const base = `/households/${current?.householdId}/stores`;

  const load = useCallback(async () => {
    if (!current) return;
    try {
      setStores(await api<Store[]>(`/households/${current.householdId}/stores`));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load stores.');
    }
  }, [current]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const add = async () => {
    if (!name.trim()) return;
    setBusy(true);
    try {
      await api<Store>(base, { method: 'POST', body: { name: name.trim() } });
      setName('');
      setError(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not add the store.');
    } finally {
      setBusy(false);
    }
  };

  const remove = (store: Store) =>
    Alert.alert(`Remove ${store.name}?`, 'Items tagged with it stay on their lists, for any store.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () =>
          api(`${base}/${store.id}`, { method: 'DELETE' })
            .then(load)
            .catch((e) => setError(e instanceof Error ? e.message : 'Could not remove the store.')),
      },
    ]);

  const canRemove = canManageMembers(current?.role);

  return (
    <FlatList
      style={{ backgroundColor: '#fff' }}
      contentContainerStyle={{ padding: 24, gap: 8 }}
      data={stores}
      keyExtractor={(s) => s.id}
      ListHeaderComponent={
        <View style={{ gap: 12, marginBottom: 8 }}>
          <Muted>Tag list items with a store so the shopping can be split between people.</Muted>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="e.g. WinCo, Costco"
              placeholderTextColor={colors.muted}
              onSubmitEditing={add}
              style={{ flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, color: colors.text }}
            />
            <View style={{ width: 80 }}>
              <Button title="Add" onPress={add} busy={busy} />
            </View>
          </View>
          <ErrorText message={error} />
        </View>
      }
      ListEmptyComponent={<Muted>No stores yet.</Muted>}
      renderItem={({ item }) => (
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderColor: colors.border }}>
          <Text style={{ flex: 1, fontSize: 16, color: colors.text }}>{item.name}</Text>
          {canRemove && (
            <Pressable onPress={() => remove(item)} hitSlop={8}>
              <Text style={{ color: colors.danger }}>Remove</Text>
            </Pressable>
          )}
        </View>
      )}
    />
  );
}
