'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Lock, User as UserIcon, Shield, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';

export default function AuthCard({ onAdminClick }: { onAdminClick?: () => void }) {
  const { login, register } = useAuth();
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!username.trim() || !password) {
      setError('Please fill in both fields.');
      return;
    }

    setLoading(true);

    if (isRegisterMode) {
      const res = await register(username, password);
      setLoading(false);
      if (res.success) {
        setSuccessMsg(res.message || 'Account created! You can now log in.');
        setIsRegisterMode(false);
        setPassword('');
      } else {
        setError(res.error || 'Failed to create account.');
      }
    } else {
      const res = await login(username, password);
      setLoading(false);
      if (!res.success) {
        setError(res.error || 'Invalid credentials.');
      }
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-slate-900/90 border border-slate-800 backdrop-blur-xl rounded-2xl shadow-2xl p-8 text-slate-100 transition-all">
        {/* Top Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-500 to-cyan-400 p-0.5 shadow-lg shadow-indigo-500/20 mb-4">
            <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
              <Shield className="w-7 h-7 text-cyan-400" />
            </div>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Personal DocReader
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Secure in-memory storage & in-browser reader
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-slate-950/70 p-1 rounded-xl mb-6 border border-slate-800">
          <button
            type="button"
            onClick={() => {
              setIsRegisterMode(false);
              setError(null);
              setSuccessMsg(null);
            }}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
              !isRegisterMode
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setIsRegisterMode(true);
              setError(null);
              setSuccessMsg(null);
            }}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
              isRegisterMode
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Register
          </button>
        </div>

        {/* Alert Notifications */}
        {error && (
          <div className="mb-4 p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-sm flex items-start gap-2.5">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-sm flex items-start gap-2.5">
            <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Username
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <UserIcon className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                required
                className="w-full pl-10 pr-4 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={isRegisterMode ? 'At least 6 characters' : 'Enter password'}
                required
                className="w-full pl-10 pr-4 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all text-sm"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 px-4 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 active:scale-[0.99] text-white font-medium rounded-xl shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2 transition-all disabled:opacity-60 disabled:cursor-not-allowed text-sm"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <span>{isRegisterMode ? 'Create Account' : 'Sign In'}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Security / In-Memory Notice */}
        <div className="mt-6 pt-5 border-t border-slate-800/80 text-center space-y-3">
          <p className="text-xs text-slate-500 flex items-center justify-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
            Ephemeral Session: Auth state lives only in memory
          </p>
          {/* Admin access link */}
          <button
            type="button"
            onClick={onAdminClick}
            className="inline-flex items-center gap-1.5 text-xs text-slate-600 hover:text-violet-400 transition-colors group"
          >
            <Shield className="w-3 h-3 group-hover:text-violet-400 transition-colors" />
            Admin Login
          </button>
        </div>
      </div>
    </div>
  );
}
