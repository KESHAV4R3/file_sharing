'use client';

import React, { useEffect, useState } from 'react';
import { User, FileText, HardDrive, ChevronRight, RefreshCw } from 'lucide-react';
import { useAdmin } from '@/context/AdminContext';

function formatBytes(b: number) {
  if (!b) return '0 B';
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(2)} MB`;
}

interface UserRow { id: string; username: string; createdAt: string; fileCount: number; totalStorage: number; }

export default function UsersList({ onSelectUser, refresh }: { onSelectUser: (id: string) => void; refresh: number }) {
  const { fetchAsAdmin } = useAdmin();
  const [users, setUsers]   = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState('');

  const load = async () => {
    setLoading(true);
    const res  = await fetchAsAdmin('/api/admin/users');
    const data = await res.json();
    setUsers(data.users || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [refresh]);

  const filtered = users.filter((u) =>
    u?.username?.toLowerCase().includes(search.toLowerCase()) ?? false
  );

  return (
    <div className="space-y-4">
      {/* Search + refresh */}
      <div className="flex items-center gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search users…"
          className="flex-1 px-4 py-2.5 bg-slate-900/60 border border-slate-800 focus:border-violet-500 rounded-xl text-slate-200 placeholder-slate-500 text-sm outline-none transition-colors"
        />
        <button onClick={load} disabled={loading}
          className="p-2.5 bg-slate-900/60 border border-slate-800 hover:border-slate-700 rounded-xl text-slate-400 hover:text-white transition-colors disabled:opacity-50">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Table */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto modal-scroller">
          <div className="min-w-[560px]">
            <div className="grid grid-cols-[1fr_80px_100px_100px_40px] gap-2 px-4 sm:px-6 py-3 bg-slate-800/50 border-b border-slate-800 text-xs font-semibold text-slate-400 uppercase tracking-wider">
              <span>User</span>
              <span className="text-center">Docs</span>
              <span className="text-center">Storage</span>
              <span>Joined</span>
              <span />
            </div>

            {loading ? (
              <div className="py-14 flex justify-center">
                <svg className="animate-spin w-6 h-6 text-slate-500" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
              </div>
            ) : filtered.length === 0 ? (
              <div className="py-14 text-center text-slate-500 text-sm">
                {search ? 'No users match your search.' : 'No users found.'}
              </div>
            ) : (
              <div className="divide-y divide-slate-800/60">
                {filtered.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => onSelectUser(u.id)}
                    className="w-full grid grid-cols-[1fr_80px_100px_100px_40px] gap-2 px-4 sm:px-6 py-3.5 sm:py-4 hover:bg-slate-800/40 transition-colors text-left group"
                  >
                    <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500/30 to-indigo-500/30 border border-violet-500/20 flex items-center justify-center shrink-0">
                        <User className="w-4 h-4 text-violet-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-200 truncate">{u.username}</p>
                        <p className="text-[11px] text-slate-600 font-mono truncate">{u.id}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-center gap-1 text-slate-300 text-sm">
                      <FileText className="w-3.5 h-3.5 text-slate-500" />
                      {u.fileCount}
                    </div>
                    <div className="flex items-center justify-center gap-1 text-slate-300 text-sm">
                      <HardDrive className="w-3.5 h-3.5 text-slate-500" />
                      <span className="text-xs font-mono">{formatBytes(u.totalStorage)}</span>
                    </div>
                    <div className="text-xs text-slate-500 flex items-center">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </div>
                    <div className="flex items-center justify-end text-slate-600 group-hover:text-slate-300 transition-colors">
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <p className="text-xs text-slate-600 text-right">{filtered.length} user{filtered.length !== 1 ? 's' : ''}</p>
    </div>
  );
}
