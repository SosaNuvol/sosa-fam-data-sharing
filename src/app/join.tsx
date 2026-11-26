import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '../lib/auth';
import { savePendingInvite } from '../lib/tokenStore';

/**
 * Where an invite link lands: sosafam://join?code=K7QM2XPA (or the Expo Go equivalent).
 * Keeps the code, then joins right away if signed in, or after sign-in / account creation.
 */
export default function Join() {
  const { code } = useLocalSearchParams<{ code?: string }>();
  const { status, joinPendingInvite } = useAuth();
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const clean = (code ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    (clean ? savePendingInvite(clean) : Promise.resolve()).finally(() => setSaved(true));
  }, [code]);

  useEffect(() => {
    if (!saved || status !== 'signedIn') return;
    joinPendingInvite().finally(() => router.replace('/'));
  }, [saved, status, joinPendingInvite]);

  if (saved && status === 'signedOut') return <Redirect href={{ pathname: '/sign-in', params: { invited: '1' } }} />;
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator />
    </View>
  );
}
