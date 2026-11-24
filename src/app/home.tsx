import { Redirect, router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, Pressable, RefreshControl, Text, View } from 'react-native';
import { Button, colors, ErrorText, Muted, Title } from '../components/ui';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { canManageMembers, type Member } from '../lib/types';

/** The current family: its members, switching families, and inviting people. */
export default function Home() {
  const { status, me, current, selectHousehold, signOut } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!current) return;
    setLoading(true);
    setError(null);
    try {
      setMembers(await api<Member[]>(`/households/${current.householdId}/members`));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load members.');
    } finally {
      setLoading(false);
    }
  }, [current]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  if (status === 'signedOut') return <Redirect href="/sign-in" />;
  if (status === 'signedIn' && !current) return <Redirect href="/welcome" />;
  if (!current) return null;

  return (
    <FlatList
      style={{ backgroundColor: '#fff' }}
      contentContainerStyle={{ padding: 24, gap: 12 }}
      data={members}
      keyExtractor={(m) => m.id}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
      ListHeaderComponent={
        <View style={{ gap: 8, marginBottom: 8 }}>
          <Title>{current.householdName}</Title>
          <Muted>You are {current.role === 'Owner' ? 'the owner' : `a${current.role === 'Adult' ? 'n' : ''} ${current.role.toLowerCase()}`} of this family.</Muted>
          {me && me.households.length > 1 && (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
              {me.households.map((h) => (
                <Pressable
                  key={h.householdId}
                  onPress={() => selectHousehold(h.householdId)}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 16,
                    borderWidth: 1,
                    borderColor: h.householdId === current.householdId ? colors.primary : colors.border,
                  }}
                >
                  <Text style={{ color: h.householdId === current.householdId ? colors.primary : colors.text }}>{h.householdName}</Text>
                </Pressable>
              ))}
            </View>
          )}
          <Text style={{ fontSize: 18, fontWeight: '600', marginTop: 16, color: colors.text }}>Members</Text>
          <ErrorText message={error} />
        </View>
      }
      renderItem={({ item }) => (
        <View style={{ paddingVertical: 12, borderBottomWidth: 1, borderColor: colors.border }}>
          <Text style={{ fontSize: 16, color: colors.text }}>{item.displayName}</Text>
          <Muted>{item.role}</Muted>
        </View>
      )}
      ListFooterComponent={
        <View style={{ gap: 12, marginTop: 16 }}>
          {canManageMembers(current.role) && <Button title="Invite someone" onPress={() => router.push('/invite')} />}
          <Button title="Join or create another family" variant="secondary" onPress={() => router.push('/welcome')} />
          <Button title="Sign out" variant="secondary" onPress={signOut} />
        </View>
      }
    />
  );
}
