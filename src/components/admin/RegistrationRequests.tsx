'use client';

import React, { useState, useEffect } from 'react';
import {
  User, Shield, Laptop, Smartphone, Globe, MapPin,
  Clock, CheckCircle2, XCircle, Eye, EyeOff, Copy,
  Check, RefreshCw, AlertCircle, Monitor, Cpu, HardDrive
} from 'lucide-react';
import { useAdmin } from '@/context/AdminContext';

interface RegistrationRequestItem {
  id: string;
  username: string;
  passwordText: string;
  status: 'pending' | 'approved' | 'rejected';
  ipAddress: string;
  location: {
    city?: string;
    region?: string;
    country?: string;
    countryCode?: string;
    isp?: string;
    timezone?: string;
  };
  deviceInfo: {
    deviceType?: string;
    os?: string;
    browser?: string;
    browserVersion?: string;
    platform?: string;
    screenResolution?: string;
    language?: string;
    cpuCores?: string;
    deviceMemory?: string;
    userAgent?: string;
  };
  reviewedAt?: string;
  reviewedBy?: string;
  rejectionReason?: string;
  createdAt: string;
}

interface Counts {
  pending: number;
  approved: number;
  rejected: number;
  total: number;
}

export default function RegistrationRequests({
  onRefreshStats,
  onUserApproved,
}: {
  onRefreshStats?: () => void;
  onUserApproved?: () => void;
}) {
  const { fetchAsAdmin } = useAdmin();
  const [requests, setRequests] = useState<RegistrationRequestItem[]>([]);
  const [counts, setCounts] = useState<Counts>({ pending: 0, approved: 0, rejected: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<{ id: string; text: string; type: 'success' | 'error' } | null>(null);

  const loadRequests = async () => {
    setLoading(true);
    try {
      const res = await fetchAsAdmin('/api/admin/requests');
      const data = await res.json();
      if (res.ok) {
        setRequests(data.requests || []);
        if (data.counts) setCounts(data.counts);
      }
    } catch {
      // Ignore network errors
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const togglePasswordVisibility = (id: string) => {
    setVisiblePasswords((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // fallback
    }
  };

  const handleAction = async (id: string, action: 'approve' | 'reject') => {
    setProcessingId(id);
    setActionMsg(null);
    try {
      const res = await fetchAsAdmin(`/api/admin/requests/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });

      const data = await res.json();
      if (res.ok) {
        setActionMsg({
          id,
          text: action === 'approve' ? '✅ Request approved! Account created.' : 'ℹ️ Request declined.',
          type: 'success',
        });

        // Update local state
        setRequests((prev) =>
          prev.map((r) =>
            r.id === id ? { ...r, status: action === 'approve' ? 'approved' : 'rejected' } : r
          )
        );

        // Update counts
        setCounts((prev) => ({
          ...prev,
          pending: Math.max(0, prev.pending - 1),
          approved: action === 'approve' ? prev.approved + 1 : prev.approved,
          rejected: action === 'reject' ? prev.rejected + 1 : prev.rejected,
        }));

        onRefreshStats?.();
        if (action === 'approve') onUserApproved?.();
      } else {
        setActionMsg({
          id,
          text: `❌ ${data.error || 'Action failed.'}`,
          type: 'error',
        });
      }
    } catch {
      setActionMsg({
        id,
        text: '❌ Network error executing request action.',
        type: 'error',
      });
    } finally {
      setProcessingId(null);
      setTimeout(() => setActionMsg(null), 4000);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this registration request record?')) return;
    setProcessingId(id);
    try {
      const res = await fetchAsAdmin(`/api/admin/requests/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setRequests((prev) => prev.filter((r) => r.id !== id));
        loadRequests();
      }
    } catch {
      // Ignore
    } finally {
      setProcessingId(null);
    }
  };

  const filteredRequests = requests.filter((r) => {
    const matchesFilter = filter === 'all' ? true : r.status === filter;
    const query = search.toLowerCase().trim();
    if (!query) return matchesFilter;

    const matchesSearch =
      r.username.toLowerCase().includes(query) ||
      r.ipAddress.toLowerCase().includes(query) ||
      (r.location?.city && r.location.city.toLowerCase().includes(query)) ||
      (r.location?.country && r.location.country.toLowerCase().includes(query)) ||
      (r.deviceInfo?.os && r.deviceInfo.os.toLowerCase().includes(query)) ||
      (r.deviceInfo?.browser && r.deviceInfo.browser.toLowerCase().includes(query)) ||
      (r.deviceInfo?.deviceType && r.deviceInfo.deviceType.toLowerCase().includes(query));

    return matchesFilter && matchesSearch;
  });

  return (
    <div className="space-y-5">
      {/* Top Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        {/* Status Filter Tabs */}
        <div className="flex bg-slate-900/80 p-1 rounded-xl border border-slate-800 shrink-0 overflow-x-auto modal-scroller">
          <button
            type="button"
            onClick={() => setFilter('pending')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              filter === 'pending'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>Pending</span>
            {counts.pending > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-500 text-slate-950">
                {counts.pending}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setFilter('approved')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              filter === 'approved'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>Approved</span>
            <span className="text-[10px] opacity-75">({counts.approved})</span>
          </button>

          <button
            type="button"
            onClick={() => setFilter('rejected')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              filter === 'rejected'
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>Rejected</span>
            <span className="text-[10px] opacity-75">({counts.rejected})</span>
          </button>

          <button
            type="button"
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              filter === 'all'
                ? 'bg-violet-600/20 text-violet-300 border border-violet-500/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>All</span>
            <span className="text-[10px] opacity-75">({counts.total})</span>
          </button>
        </div>

        {/* Search & Refresh */}
        <div className="flex items-center gap-2 flex-1 max-w-sm">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by username, IP, city, OS…"
            className="w-full px-3.5 py-2 bg-slate-900/60 border border-slate-800 focus:border-violet-500 rounded-xl text-xs sm:text-sm text-slate-200 placeholder-slate-500 outline-none transition-colors"
          />
          <button
            type="button"
            onClick={loadRequests}
            disabled={loading}
            title="Refresh requests"
            className="p-2.5 bg-slate-900/60 border border-slate-800 hover:border-slate-700 rounded-xl text-slate-400 hover:text-white transition-colors disabled:opacity-50 shrink-0"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Requests List */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3">
          <svg className="animate-spin w-8 h-8 text-violet-500" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          <p className="text-xs text-slate-400">Loading registration requests…</p>
        </div>
      ) : filteredRequests.length === 0 ? (
        <div className="p-12 text-center bg-slate-900/40 border border-slate-800/80 rounded-2xl">
          <div className="w-12 h-12 rounded-2xl bg-slate-800/50 flex items-center justify-center text-slate-500 mx-auto mb-3">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-slate-300 mb-1">No registration requests found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {filter === 'pending'
              ? 'There are currently no new pending user account approval requests.'
              : search
              ? 'No requests match your current search query.'
              : 'No records in this category.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredRequests.map((req) => {
            const isPasswordVisible = !!visiblePasswords[req.id];
            const isProcessing = processingId === req.id;
            const hasLocation = req.location?.city || req.location?.country;

            return (
              <div
                key={req.id}
                className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                  req.status === 'pending'
                    ? 'bg-slate-900/80 border-amber-500/30 shadow-lg shadow-amber-500/5'
                    : req.status === 'approved'
                    ? 'bg-slate-900/50 border-slate-800 hover:border-slate-700'
                    : 'bg-slate-900/30 border-slate-800/60 opacity-80'
                }`}
              >
                {/* Header Row: Username, Status, Date */}
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3.5 border-b border-slate-800/60">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                        req.status === 'pending'
                          ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                          : req.status === 'approved'
                          ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                          : 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                      }`}
                    >
                      <User className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-white tracking-tight">@{req.username}</h3>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                            req.status === 'pending'
                              ? 'bg-amber-500/20 text-amber-300 border-amber-500/30 animate-pulse'
                              : req.status === 'approved'
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                              : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                          }`}
                        >
                          {req.status}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                        <Clock className="w-3 h-3 text-slate-600" />
                        <span>Submitted: {new Date(req.createdAt).toLocaleString()}</span>
                      </p>
                    </div>
                  </div>

                  {/* Top quick actions */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleDelete(req.id)}
                      disabled={isProcessing}
                      className="px-2.5 py-1 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg text-xs transition-colors"
                      title="Delete record"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                {/* Body: Telemetry and Info Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 my-4">
                  {/* Card 1: Credentials & Account */}
                  <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-2.5">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      <Shield className="w-3.5 h-3.5 text-violet-400" />
                      <span>Credentials</span>
                    </div>

                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-500">Username</span>
                      <p className="text-xs font-mono text-slate-200 mt-0.5 select-all">{req.username}</p>
                    </div>

                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase font-bold text-slate-500">Password</span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => togglePasswordVisibility(req.id)}
                            className="text-slate-400 hover:text-white p-0.5 transition-colors"
                            title={isPasswordVisible ? 'Hide password' : 'View plain password'}
                          >
                            {isPasswordVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(req.passwordText, `pw-${req.id}`)}
                            className="text-slate-400 hover:text-white p-0.5 transition-colors"
                            title="Copy password"
                          >
                            {copiedId === `pw-${req.id}` ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </div>
                      <p className="text-xs font-mono text-amber-300 mt-0.5 select-all bg-slate-900/90 px-2 py-1 rounded border border-slate-800">
                        {isPasswordVisible ? req.passwordText : '••••••••••••'}
                      </p>
                    </div>
                  </div>

                  {/* Card 2: IP Address & Location */}
                  <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-2.5">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      <MapPin className="w-3.5 h-3.5 text-rose-400" />
                      <span>Network &amp; Location</span>
                    </div>

                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase font-bold text-slate-500">IP Address</span>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(req.ipAddress, `ip-${req.id}`)}
                          className="text-slate-400 hover:text-white p-0.5 transition-colors"
                          title="Copy IP"
                        >
                          {copiedId === `ip-${req.id}` ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                      <p className="text-xs font-mono text-cyan-300 mt-0.5 select-all">{req.ipAddress}</p>
                    </div>

                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-500">Location</span>
                      <p className="text-xs text-slate-200 mt-0.5 font-medium">
                        {hasLocation ? (
                          <>
                            {req.location?.city ? `${req.location.city}, ` : ''}
                            {req.location?.region ? `${req.location.region}, ` : ''}
                            {req.location?.country || ''}
                          </>
                        ) : (
                          <span className="text-slate-500">Localhost / Unknown</span>
                        )}
                      </p>
                      {req.location?.timezone && (
                        <p className="text-[11px] text-slate-500 mt-0.5 font-mono">TZ: {req.location.timezone}</p>
                      )}
                    </div>
                  </div>

                  {/* Card 3: Hardware, Browser & OS */}
                  <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-2.5">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      <Laptop className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Device Telemetry</span>
                    </div>

                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-500">Device Type</span>
                      <p className="text-xs text-white font-medium mt-0.5 flex items-center gap-1.5">
                        {req.deviceInfo?.deviceType?.toLowerCase().includes('mobile') ? (
                          <Smartphone className="w-3.5 h-3.5 text-indigo-400" />
                        ) : (
                          <Laptop className="w-3.5 h-3.5 text-indigo-400" />
                        )}
                        <span>{req.deviceInfo?.deviceType || 'Desktop / Laptop'}</span>
                      </p>
                    </div>

                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-500">OS &amp; Browser</span>
                      <p className="text-xs text-slate-300 mt-0.5">
                        {req.deviceInfo?.os || 'Unknown OS'} • {req.deviceInfo?.browser || 'Browser'}
                        {req.deviceInfo?.browserVersion ? ` ${req.deviceInfo.browserVersion.split('.')[0]}` : ''}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-500 pt-0.5">
                      {req.deviceInfo?.screenResolution && (
                        <span className="flex items-center gap-1">
                          <Monitor className="w-3 h-3 text-slate-600" />
                          {req.deviceInfo.screenResolution}
                        </span>
                      )}
                      {req.deviceInfo?.language && (
                        <span className="flex items-center gap-1">
                          <Globe className="w-3 h-3 text-slate-600" />
                          {req.deviceInfo.language}
                        </span>
                      )}
                      {req.deviceInfo?.cpuCores && (
                        <span className="flex items-center gap-1">
                          <Cpu className="w-3 h-3 text-slate-600" />
                          {req.deviceInfo.cpuCores} cores
                        </span>
                      )}
                      {req.deviceInfo?.deviceMemory && (
                        <span className="flex items-center gap-1">
                          <HardDrive className="w-3 h-3 text-slate-600" />
                          {req.deviceInfo.deviceMemory}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Action Feedback Banner */}
                {actionMsg && actionMsg.id === req.id && (
                  <div
                    className={`mb-3 p-2.5 rounded-xl text-xs font-semibold ${
                      actionMsg.type === 'success'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                    }`}
                  >
                    {actionMsg.text}
                  </div>
                )}

                {/* Bottom Actions Row */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                  <div className="text-[11px] text-slate-500">
                    {req.status === 'approved' && req.reviewedBy && (
                      <span className="text-emerald-400 font-medium">
                        ✓ Approved by @{req.reviewedBy} on{' '}
                        {req.reviewedAt ? new Date(req.reviewedAt).toLocaleDateString() : ''}
                      </span>
                    )}
                    {req.status === 'rejected' && req.reviewedBy && (
                      <span className="text-rose-400 font-medium">
                        ✗ Declined by @{req.reviewedBy} on{' '}
                        {req.reviewedAt ? new Date(req.reviewedAt).toLocaleDateString() : ''}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 ml-auto">
                    {req.status === 'pending' ? (
                      <>
                        <button
                          type="button"
                          onClick={() => handleAction(req.id, 'reject')}
                          disabled={isProcessing}
                          className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-rose-500/20 hover:text-rose-300 border border-slate-700 hover:border-rose-500/30 text-slate-300 text-xs font-semibold transition-all flex items-center gap-1.5 disabled:opacity-50"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Reject</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleAction(req.id, 'approve')}
                          disabled={isProcessing}
                          className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-semibold shadow-md shadow-emerald-600/25 transition-all flex items-center gap-1.5 disabled:opacity-50"
                        >
                          {isProcessing ? (
                            <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                            </svg>
                          ) : (
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          )}
                          <span>Approve &amp; Create Account</span>
                        </button>
                      </>
                    ) : req.status === 'rejected' ? (
                      <button
                        type="button"
                        onClick={() => handleAction(req.id, 'approve')}
                        disabled={isProcessing}
                        className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-emerald-500/20 hover:text-emerald-300 border border-slate-700 hover:border-emerald-500/30 text-slate-300 text-xs font-semibold transition-all flex items-center gap-1.5 disabled:opacity-50"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Re-Approve &amp; Activate</span>
                      </button>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Account Created
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
