'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

interface AdminContextType {
  adminToken: string | null;
  adminId: string | null;
  isAdminAuthenticated: boolean;
  adminLogin: (id: string, password: string) => Promise<{ success: boolean; error?: string }>;
  adminLogout: () => void;
  fetchAsAdmin: (url: string, options?: RequestInit) => Promise<Response>;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

export const AdminProvider = ({ children }: { children: ReactNode }) => {
  const [adminToken, setAdminToken] = useState<string | null>(null);
  const [adminId, setAdminId]       = useState<string | null>(null);

  const adminLogin = async (id: string, password: string) => {
    try {
      const res  = await fetch('/api/admin/login', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ adminId: id, password }),
      });
      const data = await res.json();
      if (!res.ok) return { success: false, error: data.error || 'Login failed.' };
      setAdminToken(data.token);
      setAdminId(data.adminId);
      return { success: true };
    } catch {
      return { success: false, error: 'Network error.' };
    }
  };

  const adminLogout = () => { setAdminToken(null); setAdminId(null); };

  const fetchAsAdmin = async (url: string, options: RequestInit = {}) => {
    const headers = new Headers(options.headers || {});
    if (adminToken) headers.set('Authorization', `Bearer ${adminToken}`);
    return fetch(url, { ...options, headers });
  };

  return (
    <AdminContext.Provider
      value={{ adminToken, adminId, isAdminAuthenticated: !!adminToken, adminLogin, adminLogout, fetchAsAdmin }}
    >
      {children}
    </AdminContext.Provider>
  );
};

export const useAdmin = () => {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error('useAdmin must be used within AdminProvider');
  return ctx;
};
