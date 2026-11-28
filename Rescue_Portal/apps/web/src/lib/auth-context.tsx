'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { api, getAccessToken, setAccessToken } from './api';
import type { AuthResponse, AuthUser } from './types';

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    if (!getAccessToken()) {
      setLoading(false);
      return () => {
        active = false;
      };
    }
    api<AuthUser>('/auth/me')
      .then((profile) => {
        if (active) setUser(profile);
      })
      .catch(() => {
        setAccessToken(null);
        if (active) setUser(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const onExpired = () => {
      setAccessToken(null);
      setUser(null);
    };
    window.addEventListener('rescue-auth-expired', onExpired);
    return () => window.removeEventListener('rescue-auth-expired', onExpired);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const session = await api<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setAccessToken(session.accessToken);
    setUser(session.user);
  }, []);

  const logout = useCallback(async () => {
    setAccessToken(null);
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    const profile = await api<AuthUser>('/auth/me');
    setUser(profile);
  }, []);

  const value = useMemo(
    () => ({ user, loading, login, logout, refreshUser }),
    [user, loading, login, logout, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
