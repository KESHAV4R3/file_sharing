'use client';

import React, { useState, useEffect } from 'react';
import {
  ArrowLeft, User, FileText, Trash2, Edit2, Save, X,
  Key, AlertTriangle, CheckCircle2, File as FileIcon,
  FileImage, FileSpreadsheet, FileCode, Eye,
} from 'lucide-react';
import { useAdmin } from '@/context/AdminContext';

function formatBytes(b: number) {
  if (!b || b <= 0) return '—';
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(2)} MB`;
}

function FileTypeIcon({ type }: { type: string }) {
  const cls = 'w-4 h-4';
  if (type === 'pdf')   return <FileIcon className={`${cls} text-red-400`} />;
  if (type === 'image') return <FileImage className={`${cls} text-blue-400`} />;
  if (type === 'csv')   return <FileSpreadsheet className={`${cls} text-emerald-400`} />;
  if (type === 'html')  return <FileCode className={`${cls} text-amber-400`} />;
  return <FileText className={`${cls} text-slate-400`} />;
}

interface FileEntry { id: string; originalName: string; fileType: string; fileSize: number; cloudinaryUrl: string; uploadedAt: string; }
interface UserInfo   { id: string; username: string; createdAt: string; }

export default function UserDetail({
  userId,
  onBack,
  onRefreshStats,
}: {
  userId: string;
  onBack: () => void;
  onRefreshStats: () => void;
}) {
  const { fetchAsAdmin } = useAdmin();
  const [user, setUser]   = useState<UserInfo | null>(null);
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit states
  const [editUsername, setEditUsername] = useState('');
  const [editingName, setEditingName]   = useState(false);
  const [editPassword, setEditPassword] = useState('');
  const [editingPw, setEditingPw]       = useState(false);
  const [saving, setSaving]             = useState(false);
  const [saveMsg, setSaveMsg]           = useState<string | null>(null);

  // Delete states
  const [deletingFile, setDeletingFile]   = useState<string | null>(null);
  const [deletingUser, setDeletingUser]   = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const load = async () => {
    setLoading(true);
    const res  = await fetchAsAdmin(`/api/admin/users/${userId}`);
    const data = await res.json();
    setUser(data.user);
    setFiles(data.files || []);
    setEditUsername(data.user?.username || '');
    setLoading(false);
  };

  useEffect(() => { load(); }, [userId]);

  const saveUsername = async () => {
    setSaving(true);
    const res = await fetchAsAdmin(`/api/admin/users/${userId}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ username: editUsername }),
    });
    const data = await res.json();
    setSaveMsg(res.ok ? '✅ Username updated.' : `❌ ${data.error}`);
    if (res.ok) { setUser((u) => u ? { ...u, username: editUsername } : u); setEditingName(false); }
    setSaving(false);
    setTimeout(() => setSaveMsg(null), 3000);
  };

  const savePassword = async () => {
    if (!editPassword.trim()) return;
    setSaving(true);
    const res = await fetchAsAdmin(`/api/admin/users/${userId}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ password: editPassword }),
    });
    const data = await res.json();
    setSaveMsg(res.ok ? '✅ Password reset.' : `❌ ${data.error}`);
    if (res.ok) { setEditPassword(''); setEditingPw(false); }
    setSaving(false);
    setTimeout(() => setSaveMsg(null), 3000);
  };

  const deleteFile = async (fileId: string) => {
    setDeletingFile(fileId);
    await fetchAsAdmin(`/api/admin/files/${fileId}`, { method: 'DELETE' });
    setFiles((f) => f.filter((x) => x.id !== fileId));
    onRefreshStats();
    setDeletingFile(null);
  };

  const deleteUser = async () => {
    setDeletingUser(true);
    await fetchAsAdmin(`/api/admin/users/${userId}`, { method: 'DELETE' });
    onRefreshStats();
    onBack();
  };

  if (loading) return (
    <div className="flex items-center justify-center py-24 text-slate-400">
      <svg className="animate-spin w-6 h-6 mr-3" viewBox="0 0 24 24" fill="none">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
      </svg>
      Loading user…
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Back */}
      <button onClick={onBack} className="flex items-center gap-2 text-slate-400 hover:text-white text-sm transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Users
      </button>

      {saveMsg && (
        <div className={`flex items-center gap-2 text-sm rounded-xl px-4 py-3 border ${saveMsg.startsWith('✅') ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300' : 'bg-red-500/10 border-red-500/20 text-red-300'}`}>
          {saveMsg.startsWith('✅') ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
          {saveMsg.replace(/^[✅❌] /, '')}
        </div>
      )}

      {/* User info card */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center">
              <User className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-bold text-white text-lg">{user?.username}</p>
              <p className="text-xs text-slate-500">ID: {user?.id}</p>
            </div>
          </div>
          <button
            onClick={() => setConfirmDelete(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 text-xs font-medium transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" /> Delete User
          </button>
        </div>

        {/* Edit username */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Username</label>
            <button onClick={() => setEditingName((v) => !v)} className="flex items-center gap-1 text-xs text-violet-400 hover:text-violet-300">
              <Edit2 className="w-3 h-3" /> {editingName ? 'Cancel' : 'Edit'}
            </button>
          </div>
          {editingName ? (
            <div className="flex gap-2">
              <input value={editUsername} onChange={(e) => setEditUsername(e.target.value)}
                className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 focus:border-violet-500 rounded-lg text-white text-sm outline-none transition-colors" />
              <button onClick={saveUsername} disabled={saving}
                className="flex items-center gap-1.5 px-3 py-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-60 text-white rounded-lg text-sm transition-colors">
                <Save className="w-3.5 h-3.5" /> Save
              </button>
              <button onClick={() => { setEditingName(false); setEditUsername(user?.username || ''); }}
                className="p-2 text-slate-400 hover:text-white"><X className="w-4 h-4" /></button>
            </div>
          ) : (
            <p className="text-slate-200 text-sm font-mono bg-slate-800/50 rounded-lg px-3 py-2">{user?.username}</p>
          )}
        </div>

        {/* Reset password */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Password</label>
            <button onClick={() => setEditingPw((v) => !v)} className="flex items-center gap-1 text-xs text-violet-400 hover:text-violet-300">
              <Key className="w-3 h-3" /> {editingPw ? 'Cancel' : 'Reset'}
            </button>
          </div>
          {editingPw ? (
            <div className="flex gap-2">
              <input type="password" value={editPassword} onChange={(e) => setEditPassword(e.target.value)}
                placeholder="New password"
                className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 focus:border-violet-500 rounded-lg text-white text-sm outline-none transition-colors" />
              <button onClick={savePassword} disabled={saving || !editPassword.trim()}
                className="flex items-center gap-1.5 px-3 py-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-60 text-white rounded-lg text-sm transition-colors">
                <Save className="w-3.5 h-3.5" /> Set
              </button>
            </div>
          ) : (
            <p className="text-slate-500 text-sm bg-slate-800/50 rounded-lg px-3 py-2">••••••••</p>
          )}
        </div>

        <p className="text-xs text-slate-600">Joined: {user?.createdAt ? new Date(user.createdAt).toLocaleString() : '—'}</p>
      </div>

      {/* Files */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <h3 className="font-semibold text-white">Documents ({files.length})</h3>
        </div>

        {files.length === 0 ? (
          <div className="px-6 py-10 text-center text-slate-500 text-sm">No documents uploaded.</div>
        ) : (
          <div className="divide-y divide-slate-800/60">
            {files.map((f) => (
              <div key={f.id} className="px-6 py-4 flex items-center gap-3 hover:bg-slate-800/30 transition-colors group">
                <FileTypeIcon type={f.fileType} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-200 font-medium truncate">{f.originalName}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {f.fileType.toUpperCase()} · {formatBytes(f.fileSize)} · {new Date(f.uploadedAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <a href={f.cloudinaryUrl} target="_blank" rel="noreferrer"
                    className="p-1.5 rounded-lg bg-slate-700/60 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors" title="View">
                    <Eye className="w-3.5 h-3.5" />
                  </a>
                  <button onClick={() => deleteFile(f.id)} disabled={deletingFile === f.id}
                    className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors" title="Delete">
                    {deletingFile === f.id
                      ? <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" /></svg>
                      : <Trash2 className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Confirm delete user modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={() => setConfirmDelete(false)} />
          <div className="relative bg-slate-900 border border-red-500/30 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="w-12 h-12 rounded-full bg-red-500/15 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-400" />
              </div>
              <h3 className="text-lg font-bold text-white">Delete User?</h3>
              <p className="text-sm text-slate-400">
                This will permanently delete <span className="text-white font-semibold">@{user?.username}</span> and all {files.length} of their documents from MongoDB and Cloudinary.
              </p>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setConfirmDelete(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium transition-colors">
                Cancel
              </button>
              <button onClick={deleteUser} disabled={deletingUser}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-60 text-white text-sm font-bold transition-colors flex items-center justify-center gap-2">
                {deletingUser ? <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" /></svg> : <Trash2 className="w-4 h-4" />}
                Delete Everything
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
