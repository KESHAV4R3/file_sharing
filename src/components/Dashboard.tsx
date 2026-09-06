'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import FileUpload from './FileUpload';
import FileList from './FileList';
import DocViewerModal, { DocFile } from './DocViewerModal';
import { UploadCloud, BookOpen, LogOut, Shield, User as UserIcon } from 'lucide-react';

export default function Dashboard() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<'upload' | 'view'>('view');
  const [selectedFile, setSelectedFile] = useState<DocFile | null>(null);
  const [refreshFileListKey, setRefreshFileListKey] = useState(0);

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 selection:bg-indigo-500 selection:text-white">
      {/* Top Navigation Bar */}
      <header
        className={`sticky top-0 z-30 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md transition-all duration-300 ${
          selectedFile ? 'filter blur-sm pointer-events-none' : ''
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
            <div className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full bg-slate-900 border border-slate-800 text-[11px] sm:text-xs text-slate-300 max-w-[120px] sm:max-w-[180px] truncate">
              <UserIcon className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-indigo-400 shrink-0" />
              <span className="truncate">{user?.username}</span>
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

      {/* Main Container */}
      <main
        className={`flex-1 max-w-6xl w-full mx-auto px-3 sm:px-6 py-4 sm:py-8 transition-all duration-300 ${
          selectedFile ? 'filter blur-sm pointer-events-none' : ''
        }`}
      >
        {/* EXACTLY TWO OPTIONS: Upload and View/Read */}
        <div className="flex justify-center mb-6 sm:mb-8">
          <div className="inline-flex w-full sm:w-auto bg-slate-900/90 border border-slate-800 p-1 sm:p-1.5 rounded-xl sm:rounded-2xl shadow-lg">
            <button
              type="button"
              onClick={() => setActiveTab('upload')}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 sm:px-6 py-2 sm:py-2.5 rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium transition-all ${
                activeTab === 'upload'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <UploadCloud className="w-4 h-4" />
              <span>Upload</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('view')}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 sm:px-6 py-2 sm:py-2.5 rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium transition-all ${
                activeTab === 'view'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>View / Read</span>
            </button>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'upload' ? (
          <FileUpload
            onUploadSuccess={() => {
              setActiveTab('view');
              setRefreshFileListKey((prev) => prev + 1);
            }}
          />
        ) : (
          <FileList
            onSelectFile={(file) => setSelectedFile(file)}
            onGoToUpload={() => setActiveTab('upload')}
            refreshTrigger={refreshFileListKey}
          />
        )}
      </main>

      {/* Document Viewer Modal */}
      {selectedFile && (
        <DocViewerModal
          file={selectedFile}
          onClose={() => setSelectedFile(null)}
          onDeleted={() => {
            setSelectedFile(null);
            setRefreshFileListKey((prev) => prev + 1);
          }}
        />
      )}
    </div>
  );
}
