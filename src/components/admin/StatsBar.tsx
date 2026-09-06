'use client';

import React, { useEffect, useState } from 'react';
import { Users, FileText, HardDrive } from 'lucide-react';
import { useAdmin } from '@/context/AdminContext';

function formatBytes(b: number) {
  if (!b) return '0 B';
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(2)} MB`;
}

interface Stats { totalUsers: number; totalFiles: number; totalStorage: number; }

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
    { icon: Users,    label: 'Total Users',     value: stats ? stats.totalUsers.toString()     : '—', color: 'from-violet-500 to-indigo-500' },
    { icon: FileText, label: 'Total Documents',  value: stats ? stats.totalFiles.toString()     : '—', color: 'from-cyan-500 to-blue-500'   },
    { icon: HardDrive,label: 'Storage Used',     value: stats ? formatBytes(stats.totalStorage) : '—', color: 'from-emerald-500 to-teal-500' },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {cards.map(({ icon: Icon, label, value, color }) => (
        <div key={label} className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 flex items-center gap-4">
          <div className={`p-3 rounded-xl bg-gradient-to-br ${color} bg-opacity-20 shrink-0`}>
            <Icon className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-2xl font-bold text-white">{value}</p>
            <p className="text-xs text-slate-400 mt-0.5">{label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
