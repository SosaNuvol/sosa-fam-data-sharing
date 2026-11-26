import { Redirect } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Button, Muted, Screen, Title } from '../components/ui';
import { useAuth } from '../lib/auth';

/** Sends people to the right place: sign in, create or join a family, or home. */
export default function Index() {
  const { status, me, retry, signOut } = useAuth();
  const [busy, setBusy] = useState(false);

  if (status === 'loading') {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }
  if (status === 'unreachable') {
    return (
      <Screen>
        <Title>Can't reach the server</Title>
        <Muted>You're still signed in. Check your connection and try again.</Muted>
        <Button
          title="Try again"
          busy={busy}
          onPress={async () => {
            setBusy(true);
            await retry().finally(() => setBusy(false));
          }}
        />
        <Button title="Sign out" variant="secondary" onPress={signOut} />
      </Screen>
    );
  }
  if (status === 'signedOut') return <Redirect href="/sign-in" />;
  if (!me?.households.length) return <Redirect href="/welcome" />;
  return <Redirect href="/home" />;
}
