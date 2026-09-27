'use client';

import React, { createContext, useContext, useState, useCallback, useMemo, ReactNode } from 'react';

export interface User {
  id: string;
  username: string;
  canUploadVideo?: boolean;
  unlimitedFileSize?: boolean;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (username: string, password: string) => Promise<{ success: boolean; error?: string; message?: string }>;
  logout: () => void;
  fetchWithAuth: (url: string, options?: RequestInit) => Promise<Response>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  // CRITICAL REQUIREMENT: In-memory only. No cookies, no localStorage, no sessionStorage.
  // Refreshing the browser intentionally resets this state.
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);

  const login = useCallback(async (username: string, password: string) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Failed to log in.' };
      }

      setToken(data.token);
      setUser(data.user);
      return { success: true };
    } catch {
      return { success: false, error: 'Network error during login.' };
    }
  }, []);

  const register = useCallback(async (username: string, password: string) => {
    try {
      let clientTelemetry: Record<string, any> = {};
      if (typeof window !== 'undefined') {
        try {
          clientTelemetry = {
            screenResolution: `${window.screen?.width || 0}x${window.screen?.height || 0}`,
            language: navigator.language || '',
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || '',
            platform: (navigator as any).userAgentData?.platform || navigator.platform || '',
            cpuCores: navigator.hardwareConcurrency || '',
            deviceMemory: (navigator as any).deviceMemory ? `${(navigator as any).deviceMemory} GB` : '',
          };
        } catch {
          // ignore client telemetry read errors
        }
      }

      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          password,
          ...clientTelemetry,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Registration failed.' };
      }

      return { success: true, message: data.message };
    } catch {
      return { success: false, error: 'Network error during registration.' };
    }
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
  }, []);

  const fetchWithAuth = useCallback(
    async (url: string, options: RequestInit = {}) => {
      const headers = new Headers(options.headers || {});
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }
      return fetch(url, {
        ...options,
        headers,
      });
    },
    [token]
  );

  const value = useMemo(
    () => ({
      user,
      token,
      isAuthenticated: !!token && !!user,
      login,
      register,
      logout,
      fetchWithAuth,
    }),
    [user, token, login, register, logout, fetchWithAuth]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
