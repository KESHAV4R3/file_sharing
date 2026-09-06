'use client';

import React from 'react';
import { useAuth } from '@/context/AuthContext';
import AuthCard from '@/components/AuthCard';
import Dashboard from '@/components/Dashboard';

export default function Home() {
  const { isAuthenticated } = useAuth();

  return !isAuthenticated ? (
    <main className="min-h-screen flex items-center justify-center p-4 sm:p-6 bg-slate-950 relative overflow-hidden">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-cyan-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="relative z-10 w-full max-w-md">
        <AuthCard />
      </div>
    </main>
  ) : (
    <Dashboard />
  );
}

