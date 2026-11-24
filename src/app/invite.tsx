import { Redirect } from 'expo-router';
import { useState } from 'react';
import { Pressable, Share, Text, View } from 'react-native';
import { Button, colors, ErrorText, Muted, Screen, Title } from '../components/ui';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { canManageMembers, type CreatedInvite } from '../lib/types';

const ROLES = [
  { role: 'Adult', help: 'Can invite and manage members, and sees adult-only items.' },
  { role: 'Member', help: 'Can see and add family information.' },
  { role: 'Child', help: 'Can see shared information, but not adult-only items.' },
] as const;

/** Creates a one-time invite code for the current family and shares it. */
export default function Invite() {
  const { current } = useAuth();
  const [role, setRole] = useState<(typeof ROLES)[number]['role']>('Member');
  const [invite, setInvite] = useState<CreatedInvite | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!current || !canManageMembers(current.role)) return <Redirect href="/home" />;

  const create = async () => {
    setBusy(true);
    setError(null);
    try {
      setInvite(await api<CreatedInvite>(`/households/${current.householdId}/invites`, { method: 'POST', body: { role } }));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create the invite.');
    } finally {
      setBusy(false);
    }
  };

  if (invite) {
    const expires = new Date(invite.expiresAt).toLocaleDateString();
    const message = `Join ${current.householdName} on Sosa Fam with code ${invite.code} (works once, until ${expires}).`;
    return (
      <Screen>
        <Title>Invite code</Title>
        <Text selectable style={{ fontSize: 40, fontWeight: '700', letterSpacing: 4, textAlign: 'center', color: colors.text }}>
          {invite.code}
        </Text>
        <Muted>
          Works once for one person, as {invite.role.toLowerCase()}, until {expires}. You will not see this code again after
          closing.
        </Muted>
        <Button title="Share code" onPress={() => Share.share({ message })} />
      </Screen>
    );
  }

  return (
    <Screen>
      <Title>Invite to {current.householdName}</Title>
      <Muted>Choose what they can do.</Muted>
      <View style={{ gap: 8 }}>
        {ROLES.map((r) => (
          <Pressable
            key={r.role}
            onPress={() => setRole(r.role)}
            accessibilityRole="radio"
            accessibilityState={{ selected: role === r.role }}
            style={{
              padding: 14,
              borderRadius: 10,
              borderWidth: role === r.role ? 2 : 1,
              borderColor: role === r.role ? colors.primary : colors.border,
            }}
          >
            <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text }}>{r.role}</Text>
            <Muted>{r.help}</Muted>
          </Pressable>
        ))}
      </View>
      <ErrorText message={error} />
      <Button title="Create invite code" onPress={create} busy={busy} />
    </Screen>
  );
}
