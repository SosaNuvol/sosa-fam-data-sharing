import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, ApiError, setSignedOutListener } from './api';
import { clearTokens, loadTokens, saveSignInPrefs, saveTokens } from './tokenStore';
import type { Me, Membership, TokenResponse } from './types';

interface AuthState {
  /** 'unreachable': you have a saved login, but the server could not be reached at startup. */
  status: 'loading' | 'signedOut' | 'signedIn' | 'unreachable';
  me: Me | null;
  /** The household the app is showing. */
  current: Membership | null;
  signIn(email: string, password: string, rememberMe: boolean): Promise<void>;
  register(email: string, password: string, displayName: string): Promise<void>;
  signOut(): Promise<void>;
  /** Reloads the user and their households, optionally switching to one. */
  refresh(selectHouseholdId?: string): Promise<void>;
  selectHousehold(householdId: string): void;
  /** Tries the saved login again after 'unreachable'. */
  retry(): Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthState['status']>('loading');
  const [me, setMe] = useState<Me | null>(null);
  const [currentId, setCurrentId] = useState<string | null>(null);

  const refresh = useCallback(async (selectHouseholdId?: string) => {
    const next = await api<Me>('/me');
    setMe(next);
    setCurrentId((prev) => {
      const wanted = selectHouseholdId ?? prev;
      return next.households.some((h) => h.householdId === wanted) ? wanted : next.households[0]?.householdId ?? null;
    });
    setStatus('signedIn');
  }, []);

  const signOutLocal = useCallback(() => {
    setMe(null);
    setCurrentId(null);
    setStatus('signedOut');
  }, []);

  // Restores the saved login. Only a rejected login signs you out: a network or server hiccup
  // at startup keeps the saved login and offers a retry instead of sending you to sign-in.
  const restore = useCallback(async () => {
    setStatus('loading');
    if (!(await loadTokens())) return signOutLocal();
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        return await refresh();
      } catch (e) {
        if (e instanceof ApiError && (e.status === 401 || e.status === 403)) return signOutLocal();
        if (!(await loadTokens())) return signOutLocal();
        await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
      }
    }
    setStatus('unreachable');
  }, [refresh, signOutLocal]);

  useEffect(() => {
    setSignedOutListener(signOutLocal);
    restore();
    return () => setSignedOutListener(null);
  }, [restore, signOutLocal]);

  const value = useMemo<AuthState>(
    () => ({
      status,
      me,
      current: me?.households.find((h) => h.householdId === currentId) ?? null,
      async signIn(email, password, rememberMe) {
        const tokens = await api<TokenResponse>('/auth/login', { method: 'POST', body: { email, password }, auth: false });
        await saveTokens(tokens, rememberMe);
        await saveSignInPrefs(rememberMe, email);
        await refresh();
      },
      async register(email, password, displayName) {
        await saveTokens(
          await api<TokenResponse>('/auth/register', { method: 'POST', body: { email, password, displayName }, auth: false }),
          true,
        );
        await refresh();
      },
      async signOut() {
        const tokens = await loadTokens();
        if (tokens) {
          await api('/auth/logout', { method: 'POST', body: { refreshToken: tokens.refreshToken }, auth: false }).catch(() => {});
        }
        await clearTokens();
        signOutLocal();
      },
      refresh,
      selectHousehold: setCurrentId,
      retry: restore,
    }),
    [status, me, currentId, refresh, signOutLocal, restore],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
