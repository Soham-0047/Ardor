import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api } from './api';
import type { AppConfig, FeatureFlags, User } from './types';

const STORAGE_KEY = 'fanforge:user';

interface AppState {
  config: AppConfig | null;
  configLoading: boolean;
  flags: FeatureFlags;
  user: User | null;
  joinFan: (displayName: string, walletAddress?: string) => Promise<User>;
  setUser: (u: User | null) => void;
  logout: () => void;
}

const DEFAULT_FLAGS: FeatureFlags = {
  ai: false,
  elevenlabs: false,
  solana: false,
  footballData: false,
  memoryDb: false,
};

const AppContext = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [configLoading, setConfigLoading] = useState(true);
  const [user, setUserState] = useState<User | null>(null);

  useEffect(() => {
    api
      .config()
      .then(setConfig)
      .catch(() => setConfig(null))
      .finally(() => setConfigLoading(false));

    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setUserState(JSON.parse(raw) as User);
    } catch {
      /* ignore */
    }
  }, []);

  const setUser = useCallback((u: User | null) => {
    setUserState(u);
    try {
      if (u) localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
      else localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  const joinFan = useCallback(
    async (displayName: string, walletAddress?: string) => {
      const { user: u } = await api.createUser(displayName, walletAddress);
      setUser(u);
      return u;
    },
    [setUser],
  );

  const logout = useCallback(() => setUser(null), [setUser]);

  const value = useMemo<AppState>(
    () => ({
      config,
      configLoading,
      flags: config?.flags ?? DEFAULT_FLAGS,
      user,
      joinFan,
      setUser,
      logout,
    }),
    [config, configLoading, user, joinFan, setUser, logout],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppState {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}

export const useFlags = (): FeatureFlags => useApp().flags;
