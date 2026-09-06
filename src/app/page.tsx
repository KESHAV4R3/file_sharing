'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { AdminProvider } from '@/context/AdminContext';
import AuthCard from '@/components/AuthCard';
import Dashboard from '@/components/Dashboard';
import AdminLogin from '@/components/admin/AdminLogin';
import AdminDashboard from '@/components/admin/AdminDashboard';
import { useAdmin } from '@/context/AdminContext';
import { X } from 'lucide-react';

function AdminModal({ onClose }: { onClose: () => void }) {
  const { isAdminAuthenticated } = useAdmin();
  return (
    <div className="fixed inset-0 z-[999] flex items-start justify-center overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm"
        onClick={!isAdminAuthenticated ? onClose : undefined}
      />
      {/* Modal container */}
      <div className="relative z-10 w-full min-h-screen">
        {/* Close button */}
        <button
          onClick={onClose}
          className="fixed top-4 right-4 z-50 p-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
        {isAdminAuthenticated ? <AdminDashboard /> : <AdminLogin />}
      </div>
    </div>
  );
}

function AppContent() {
  const { isAuthenticated } = useAuth();
  const [showAdmin, setShowAdmin] = useState(false);

  return (
    <>
      {!isAuthenticated ? (
        <main className="min-h-screen flex items-center justify-center p-4 sm:p-6 bg-slate-950 relative overflow-hidden">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-cyan-600/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 w-full max-w-md">
            <AuthCard onAdminClick={() => setShowAdmin(true)} />
          </div>
        </main>
      ) : (
        <Dashboard />
      )}
      {showAdmin && (
        <AdminProvider>
          <AdminModal onClose={() => setShowAdmin(false)} />
        </AdminProvider>
      )}
    </>
  );
}

export default function Home() {
  return <AppContent />;
}
