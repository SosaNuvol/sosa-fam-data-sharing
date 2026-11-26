import * as SecureStore from 'expo-secure-store';
import type { TokenResponse } from './types';

// Tokens live in the iOS Keychain / Android Keystore, never in plain storage.
// With "Remember me" off they stay in memory only, so closing or reloading the app signs you out.
const KEY = 'sosafam.tokens';
const REMEMBER_KEY = 'sosafam.rememberMe';
const EMAIL_KEY = 'sosafam.lastEmail';

let memory: TokenResponse | null = null;
let remember = true;

export async function loadTokens(): Promise<TokenResponse | null> {
  if (memory) return memory;
  const raw = await SecureStore.getItemAsync(KEY);
  if (!raw) return null;
  try {
    memory = JSON.parse(raw) as TokenResponse;
    remember = true;
    return memory;
  } catch {
    await SecureStore.deleteItemAsync(KEY);
    return null;
  }
}

/** Saves new tokens. Refreshed tokens keep the choice made at sign-in. */
export async function saveTokens(tokens: TokenResponse, rememberMe: boolean = remember): Promise<void> {
  memory = tokens;
  remember = rememberMe;
  if (rememberMe) await SecureStore.setItemAsync(KEY, JSON.stringify(tokens));
  else await SecureStore.deleteItemAsync(KEY);
}

export async function clearTokens(): Promise<void> {
  memory = null;
  await SecureStore.deleteItemAsync(KEY);
}

/** The sign-in screen's last choices: "Remember me" and, when it was on, the email. */
export async function loadSignInPrefs(): Promise<{ rememberMe: boolean; email: string }> {
  const [flag, email] = await Promise.all([SecureStore.getItemAsync(REMEMBER_KEY), SecureStore.getItemAsync(EMAIL_KEY)]);
  return { rememberMe: flag !== '0', email: email ?? '' };
}

export async function saveSignInPrefs(rememberMe: boolean, email: string): Promise<void> {
  await SecureStore.setItemAsync(REMEMBER_KEY, rememberMe ? '1' : '0');
  if (rememberMe) await SecureStore.setItemAsync(EMAIL_KEY, email);
  else await SecureStore.deleteItemAsync(EMAIL_KEY);
}

// An invite code from a link, kept until the person has signed in or created an account.
const INVITE_KEY = 'sosafam.pendingInvite';

export async function savePendingInvite(code: string): Promise<void> {
  await SecureStore.setItemAsync(INVITE_KEY, code);
}

export async function takePendingInvite(): Promise<string | null> {
  const code = await SecureStore.getItemAsync(INVITE_KEY);
  if (code) await SecureStore.deleteItemAsync(INVITE_KEY);
  return code;
}
