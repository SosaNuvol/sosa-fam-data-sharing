import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from '../lib/auth';

export default function RootLayout() {
  return (
    <AuthProvider>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShadowVisible: false }}>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="join" options={{ headerShown: false }} />
        <Stack.Screen name="sign-in" options={{ title: 'Sign in', headerBackVisible: false }} />
        <Stack.Screen name="welcome" options={{ title: 'Your family', headerBackVisible: false }} />
        <Stack.Screen name="home" options={{ title: 'Groceries', headerBackVisible: false }} />
        <Stack.Screen name="family" options={{ title: 'Family' }} />
        <Stack.Screen name="stores" options={{ title: 'Stores' }} />
        <Stack.Screen name="list/[listId]" options={{ title: 'List' }} />
        <Stack.Screen name="invite" options={{ title: 'Invite someone', presentation: 'modal' }} />
      </Stack>
    </AuthProvider>
  );
}
