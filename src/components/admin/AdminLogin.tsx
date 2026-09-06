'use client';

import React, { useState } from 'react';
import { Shield, Eye, EyeOff, LogIn, AlertCircle } from 'lucide-react';
import { useAdmin } from '@/context/AdminContext';

export default function AdminLogin() {
  const { adminLogin } = useAdmin();
  const [id, setId]           = useState('');
  const [pw, setPw]           = useState('');
  const [showPw, setShowPw]   = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const result = await adminLogin(id.trim(), pw);
    if (!result.success) setError(result.error || 'Login failed.');
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4">
      {/* Ambient glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-violet-600/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Card */}
        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 shadow-2xl shadow-black/40">
          {/* Icon + heading */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-500 p-0.5 shadow-lg shadow-violet-500/25 mb-4">
              <div className="w-full h-full bg-slate-900 rounded-[14px] flex items-center justify-center">
                <Shield className="w-7 h-7 text-violet-400" />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Admin Portal</h1>
            <p className="text-sm text-slate-400 mt-1">DocReader — Control Center</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Admin ID */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Admin ID</label>
              <input
                type="text"
                value={id}
                onChange={(e) => setId(e.target.value)}
                placeholder="Enter admin ID"
                required
                autoComplete="off"
                className="w-full px-4 py-3 bg-slate-800/60 border border-slate-700 hover:border-slate-600 focus:border-violet-500 rounded-xl text-white placeholder-slate-500 text-sm outline-none transition-colors"
              />
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">Password</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={pw}
                  onChange={(e) => setPw(e.target.value)}
                  placeholder="Enter password"
                  required
                  className="w-full px-4 py-3 pr-12 bg-slate-800/60 border border-slate-700 hover:border-slate-600 focus:border-violet-500 rounded-xl text-white placeholder-slate-500 text-sm outline-none transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:opacity-60 text-white font-semibold rounded-xl transition-all shadow-lg shadow-violet-500/20 mt-2"
            >
              {loading ? (
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
              ) : (
                <LogIn className="w-4 h-4" />
              )}
              {loading ? 'Authenticating…' : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
