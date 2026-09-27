'use client';

import React, { useState, useEffect } from 'react';
import { Shield, Users, LogOut, LayoutDashboard, UserCheck } from 'lucide-react';
import { useAdmin } from '@/context/AdminContext';
import StatsBar   from './StatsBar';
import UsersList  from './UsersList';
import UserDetail from './UserDetail';
import RegistrationRequests from './RegistrationRequests';

type View = 'overview' | 'users' | 'requests';

export default function AdminDashboard() {
  const { adminId, adminLogout, fetchAsAdmin } = useAdmin();
  const [view, setView]               = useState<View>('overview');
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [statsRefresh, setStatsRefresh] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);

  const refreshStats = () => setStatsRefresh((n) => n + 1);

  useEffect(() => {
    fetchAsAdmin('/api/admin/stats')
      .then((r) => r.json())
      .then((data) => {
        if (typeof data.pendingRequests === 'number') {
          setPendingCount(data.pendingRequests);
        }
      })
      .catch(() => {});
  }, [statsRefresh, fetchAsAdmin]);

  const navItems: { id: View; label: string; icon: React.ElementType; badge?: number }[] = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'requests', label: 'Requests', icon: UserCheck, badge: pendingCount },
    { id: 'users',    label: 'Users',    icon: Users },
  ];

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-950 text-slate-100">
      {/* Sidebar / Topbar on Mobile */}
      <aside className="w-full md:w-60 shrink-0 border-b md:border-b-0 md:border-r border-slate-800/80 bg-slate-900/50 backdrop-blur-sm flex flex-col">
        {/* Brand */}
        <div className="px-4 sm:px-5 py-4 sm:py-5 border-b border-slate-800/60 flex items-center justify-between md:block">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-500 p-0.5 shadow-lg shadow-violet-500/20 shrink-0">
              <div className="w-full h-full bg-slate-900 rounded-[10px] flex items-center justify-center">
                <Shield className="w-4 h-4 text-violet-400" />
              </div>
            </div>
            <div>
              <p className="text-sm font-bold text-white leading-tight">Owner Panel</p>
              <p className="text-xs text-violet-400 leading-tight">@{adminId}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 md:hidden">
            <a
              href="/"
              className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white bg-slate-800/60"
            >
              Back
            </a>
            <button
              onClick={adminLogout}
              className="p-1.5 rounded-lg text-xs font-medium text-rose-400 hover:bg-rose-500/10"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex flex-row md:flex-col px-3 py-2 md:py-4 gap-1 overflow-x-auto modal-scroller">
          {navItems.map(({ id, label, icon: Icon, badge }) => (
            <button
              key={id}
              onClick={() => { setView(id); setSelectedUser(null); }}
              className={`flex-1 md:flex-initial flex items-center justify-between gap-2.5 sm:gap-3 px-3 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all shrink-0 ${
                view === id
                  ? 'bg-violet-600/20 text-violet-300 border border-violet-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center gap-2.5 sm:gap-3">
                <Icon className="w-4 h-4" />
                <span>{label}</span>
              </div>
              {badge !== undefined && badge > 0 && (
                <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-slate-950">
                  {badge}
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* Navigation & Logout (Desktop) */}
        <div className="hidden md:block px-3 pb-4 border-t border-slate-800/60 pt-4 space-y-1 mt-auto">
          <a
            href="/"
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800/60 transition-all"
          >
            <span>←</span> Back to App
          </a>
          <button
            onClick={adminLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto modal-scroller">
        {/* Top bar */}
        <header className="sticky top-0 z-10 px-4 sm:px-8 py-3 sm:py-4 bg-slate-950/80 backdrop-blur-md border-b border-slate-800/60 flex items-center justify-between">
          <div>
            <h1 className="text-base sm:text-lg font-bold text-white">
              {selectedUser
                ? 'User Detail'
                : view === 'overview'
                ? 'Overview'
                : view === 'requests'
                ? 'Registration Requests'
                : 'All Users'}
            </h1>
            <p className="text-[10px] sm:text-xs text-slate-500">DocReader Control Center</p>
          </div>
        </header>

        {/* Page body */}
        <div className="px-4 sm:px-8 py-4 sm:py-6 space-y-6 max-w-5xl">
          {/* Always show stats on overview */}
          {view === 'overview' && (
            <>
              <StatsBar refresh={statsRefresh} />

              {/* Pending Approvals Callout */}
              {pendingCount > 0 && (
                <div className="p-4 sm:p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                      <UserCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-amber-300">
                        {pendingCount} Registration Request{pendingCount !== 1 ? 's' : ''} Awaiting Approval
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        New users have registered and are waiting for account verification and activation.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setView('requests')}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-xl shadow-md transition-colors shrink-0 text-center"
                  >
                    Review Requests →
                  </button>
                </div>
              )}

              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
                <p className="text-sm text-slate-400">
                  Welcome, <span className="text-white font-semibold">@{adminId}</span>. Use the sidebar to navigate.
                  Go to <span className="text-amber-400 font-medium cursor-pointer" onClick={() => setView('requests')}>Requests</span> to approve new accounts or <span className="text-violet-400 font-medium cursor-pointer" onClick={() => setView('users')}>Users</span> to manage existing accounts.
                </p>
              </div>
            </>
          )}

          {view === 'requests' && (
            <>
              <StatsBar refresh={statsRefresh} />
              <RegistrationRequests
                onRefreshStats={refreshStats}
                onUserApproved={refreshStats}
              />
            </>
          )}

          {view === 'users' && !selectedUser && (
            <>
              <StatsBar refresh={statsRefresh} />
              <UsersList
                refresh={statsRefresh}
                onSelectUser={(id) => setSelectedUser(id)}
              />
            </>
          )}

          {view === 'users' && selectedUser && (
            <UserDetail
              userId={selectedUser}
              onBack={() => setSelectedUser(null)}
              onRefreshStats={refreshStats}
            />
          )}
        </div>
      </main>
    </div>
  );
}
