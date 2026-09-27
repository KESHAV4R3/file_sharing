'use client';

import React, { useEffect, useState } from 'react';
import { Users, FileText, HardDrive, UserCheck } from 'lucide-react';
import { useAdmin } from '@/context/AdminContext';

function formatBytes(b: number) {
  if (!b) return '0 B';
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(2)} MB`;
}

interface Stats {
  totalUsers: number;
  totalFiles: number;
  totalStorage: number;
  pendingRequests?: number;
}

export default function StatsBar({ refresh }: { refresh: number }) {
  const { fetchAsAdmin } = useAdmin();
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    fetchAsAdmin('/api/admin/stats')
      .then((r) => r.json())
      .then(setStats)
      .catch(() => {});
  }, [refresh]);

  const cards = [
    {
      icon: Users,
      label: 'Active Users',
      value: stats ? stats.totalUsers.toString() : '—',
      color: 'from-violet-500 to-indigo-500',
    },
    {
      icon: UserCheck,
      label: 'Pending Requests',
      value: stats ? (stats.pendingRequests ?? 0).toString() : '—',
      color: (stats?.pendingRequests ?? 0) > 0 ? 'from-amber-500 to-orange-500' : 'from-slate-600 to-slate-700',
      highlight: (stats?.pendingRequests ?? 0) > 0,
    },
    {
      icon: FileText,
      label: 'Total Documents',
      value: stats ? stats.totalFiles.toString() : '—',
      color: 'from-cyan-500 to-blue-500',
    },
    {
      icon: HardDrive,
      label: 'Storage Used',
      value: stats ? formatBytes(stats.totalStorage) : '—',
      color: 'from-emerald-500 to-teal-500',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      {cards.map(({ icon: Icon, label, value, color, highlight }) => (
        <div
          key={label}
          className={`bg-slate-900/60 border rounded-2xl p-4 sm:p-5 flex items-center gap-3 sm:gap-4 transition-all ${
            highlight ? 'border-amber-500/40 bg-amber-500/5 shadow-md shadow-amber-500/5' : 'border-slate-800'
          }`}
        >
          <div className={`p-2.5 sm:p-3 rounded-xl bg-gradient-to-br ${color} bg-opacity-20 shrink-0`}>
            <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-xl sm:text-2xl font-bold text-white truncate">{value}</p>
            <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5 truncate">{label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
