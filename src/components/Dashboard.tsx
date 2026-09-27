'use client';

import React, { useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import FilesManager from './FilesManager';
import VideosManager from './VideosManager';
import NotesManager from './NotesManager';
import CodeFilesManager from './CodeFilesManager';
import DocViewerModal, { DocFile } from './DocViewerModal';
import {
  FolderOpen, FileText, Code2, LogOut, Shield,
  User as UserIcon, AlertTriangle, X, Video,
} from 'lucide-react';

type Tab = 'files' | 'videos' | 'notes' | 'code';

interface PendingAction {
  type: 'tab';
  tab: Tab;
}

export default function Dashboard() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('files');
  const [selectedFile, setSelectedFile] = useState<DocFile | null>(null);

  const handleSelectFile = useCallback((file: DocFile) => {
    setSelectedFile(file);
  }, []);

  // Pending action waiting for user confirmation
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);

  // Called when user clicks a tab while a file is open
  const requestTabChange = useCallback(
    (tab: Tab) => {
      if (tab === activeTab) return; // already on this tab, nothing to do
      if (selectedFile) {
        // File is open — ask for confirmation first
        setPendingAction({ type: 'tab', tab });
      } else {
        setActiveTab(tab);
      }
    },
    [activeTab, selectedFile]
  );

  // User confirmed: close file and execute the pending action
  const handleConfirmLeave = () => {
    if (!pendingAction) return;
    setSelectedFile(null);
    if (pendingAction.type === 'tab') {
      setActiveTab(pendingAction.tab);
    }
    setPendingAction(null);
  };

  // User cancelled: stay where they are
  const handleCancelLeave = () => {
    setPendingAction(null);
  };

  const isModalOpen = pendingAction !== null;

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 selection:bg-indigo-500 selection:text-white">

      {/* ── "File Still Open" Confirmation Modal ─────────────────────────────── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-amber-500/40 p-6 sm:p-7 rounded-2xl max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-150">
            {/* Icon */}
            <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-4 mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            {/* Title */}
            <h4 className="text-base sm:text-lg font-bold text-center text-white mb-1.5">
              File is Currently Open
            </h4>

            {/* Body */}
            <p className="text-xs sm:text-sm text-center text-slate-300 mb-1.5">
              <span className="text-amber-300 font-semibold truncate max-w-[240px] inline-block align-bottom">
                &ldquo;{selectedFile?.originalName}&rdquo;
              </span>{' '}
              is still open in the viewer.
            </p>
            <p className="text-xs text-center text-slate-400 mb-6">
              Switching sections will close the file. Any unsaved annotations or highlights will be lost.
            </p>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2.5">
              {/* Stay */}
              <button
                type="button"
                onClick={handleCancelLeave}
                className="flex-1 sm:flex-initial px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 hover:text-white transition-all text-center flex items-center justify-center gap-1.5"
              >
                <X className="w-3.5 h-3.5" />
                Stay Here
              </button>

              {/* Leave / close file and switch */}
              <button
                type="button"
                onClick={handleConfirmLeave}
                className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold shadow-md shadow-amber-600/25 transition-all text-center"
              >
                Close File &amp; Switch
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Top Navigation Bar ────────────────────────────────────────────────── */}
      <header
        className={`sticky top-0 z-30 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md transition-all duration-300 ${
          selectedFile && !isModalOpen ? 'filter blur-sm pointer-events-none' : ''
        }`}
      >
        <div className="max-w-6xl mx-auto px-3 sm:px-6 h-16 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-cyan-400 p-0.5 shadow-md shadow-indigo-500/10 shrink-0">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <Shield className="w-4 h-4 text-cyan-400" />
              </div>
            </div>
            <div className="min-w-0">
              <h1 className="text-sm sm:text-base font-bold tracking-tight text-white leading-tight truncate">
                DocReader
              </h1>
              <p className="text-[10px] sm:text-[11px] text-slate-400 leading-tight">Personal Storage</p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4 shrink-0">
            <div className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full bg-slate-900 border border-slate-800 text-[11px] sm:text-xs text-slate-300">
              <UserIcon className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-indigo-400 shrink-0" />
              <span className="truncate max-w-[90px] sm:max-w-[140px]">{user?.username}</span>
              {user?.canUploadVideo && (
                <span className="px-1.5 py-0.5 rounded-md bg-violet-500/20 text-violet-300 border border-violet-500/30 text-[9px] sm:text-[10px] font-bold uppercase tracking-wider shrink-0">
                  Video Access
                </span>
              )}
            </div>

            <button
              onClick={logout}
              className="px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-xs font-medium text-slate-300 hover:text-white flex items-center gap-1.5 transition-all shadow-sm"
              title="Logout session"
            >
              <LogOut className="w-3.5 h-3.5 text-rose-400" />
              <span className="hidden xs:inline sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* ── Main Container ────────────────────────────────────────────────────── */}
      <main
        className={`flex-1 max-w-6xl w-full mx-auto px-3 sm:px-6 py-4 sm:py-8 transition-all duration-300 ${
          selectedFile && !isModalOpen ? 'filter blur-sm pointer-events-none' : ''
        }`}
      >
        {/* Navigation Tabs */}
        <div className="flex justify-center mb-6 sm:mb-8">
          <div className="inline-flex flex-wrap w-full sm:w-auto bg-slate-900/90 border border-slate-800 p-1 sm:p-1.5 rounded-xl sm:rounded-2xl shadow-lg gap-1">
            <button
              type="button"
              onClick={() => requestTabChange('files')}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium transition-all ${
                activeTab === 'files'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <FolderOpen className="w-4 h-4" />
              <span>Files</span>
            </button>

            <button
              type="button"
              onClick={() => requestTabChange('videos')}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium transition-all ${
                activeTab === 'videos'
                  ? 'bg-violet-600 text-white shadow-md shadow-violet-600/25'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Video className="w-4 h-4" />
              <span>Videos</span>
            </button>

            <button
              type="button"
              onClick={() => requestTabChange('notes')}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium transition-all ${
                activeTab === 'notes'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Notes</span>
            </button>

            <button
              type="button"
              onClick={() => requestTabChange('code')}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium transition-all ${
                activeTab === 'code'
                  ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/25'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Code2 className="w-4 h-4" />
              <span>Code Files</span>
            </button>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'files' ? (
          <FilesManager onSelectFile={handleSelectFile} />
        ) : activeTab === 'videos' ? (
          <VideosManager onSelectFile={handleSelectFile} />
        ) : activeTab === 'notes' ? (
          <NotesManager />
        ) : (
          <CodeFilesManager />
        )}
      </main>

      {/* ── Document Viewer Modal ─────────────────────────────────────────────── */}
      {selectedFile && (
        <DocViewerModal
          file={selectedFile}
          onClose={() => setSelectedFile(null)}
          onDeleted={() => setSelectedFile(null)}
        />
      )}
    </div>
  );
}
