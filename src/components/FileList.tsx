'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { DocFile, formatFileSize } from './DocViewerModal';
import {
  FileText,
  FileSpreadsheet,
  FileCode,
  FileImage,
  File as FileIcon,
  ChevronLeft,
  ChevronRight,
  Eye,
  RefreshCw,
  FolderOpen,
  Trash2,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';

interface FileListProps {
  onSelectFile: (file: DocFile) => void;
  onGoToUpload: () => void;
  refreshTrigger?: number;
}

interface PaginationInfo {
  total: number;
  page: number;
  totalPages: number;
  limit: number;
}

export default function FileList({ onSelectFile, onGoToUpload, refreshTrigger }: FileListProps) {
  const { fetchWithAuth } = useAuth();
  const [files, setFiles] = useState<DocFile[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo>({
    total: 0,
    page: 1,
    totalPages: 1,
    limit: 8,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Deletion states
  const [fileToDelete, setFileToDelete] = useState<DocFile | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteSuccess, setDeleteSuccess] = useState(false);
  const [deleteModalError, setDeleteModalError] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  const fetchFiles = useCallback(
    async (targetPage = 1, silent = false) => {
      if (!silent) setLoading(true);
      setError(null);

      try {
        const res = await fetchWithAuth(`/api/files?page=${targetPage}&limit=8`);
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || 'Failed to fetch files.');
        }

        setFiles(data.files || []);
        if (data.pagination) {
          setPagination(data.pagination);
        }
      } catch (err: any) {
        setError(err?.message || 'Error loading files.');
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [fetchWithAuth]
  );

  useEffect(() => {
    fetchFiles(1);
  }, [fetchFiles, refreshTrigger]);

  // Lock background scroll when delete modal is open
  useEffect(() => {
    if (fileToDelete) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [fileToDelete]);

  const handleConfirmDelete = async () => {
    if (!fileToDelete) return;
    setIsDeleting(true);
    setDeleteModalError(null);

    try {
      const res = await fetchWithAuth(`/api/files/${fileToDelete.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete file.');
      }

      // Smooth success animation before closing modal & updating list
      const deletedName = fileToDelete.originalName;
      const targetId = fileToDelete.id;
      setDeleteSuccess(true);

      setTimeout(() => {
        setFiles((prev) => prev.filter((f) => f.id !== targetId));
        setPagination((prev) => ({
          ...prev,
          total: Math.max(0, prev.total - 1),
        }));

        setFileToDelete(null);
        setDeleteSuccess(false);
        setSuccessBanner(`"${deletedName}" was deleted successfully.`);

        // Silently refresh list without jarring flicker
        if (files.length <= 1 && pagination.page > 1) {
          fetchFiles(pagination.page - 1, true);
        } else {
          fetchFiles(pagination.page, true);
        }
      }, 400);
    } catch (err: any) {
      setDeleteModalError(err?.message || 'Failed to delete document.');
      setIsDeleting(false);
    } finally {
      setIsDeleting(false);
    }
  };

  const getFileTypeIcon = (type: string) => {
    switch (type) {
      case 'pdf':
        return <FileIcon className="w-5 h-5 text-rose-400" />;
      case 'image':
        return <FileImage className="w-5 h-5 text-emerald-400" />;
      case 'txt':
        return <FileText className="w-5 h-5 text-blue-400" />;
      case 'csv':
        return <FileSpreadsheet className="w-5 h-5 text-amber-400" />;
      case 'html':
        return <FileCode className="w-5 h-5 text-purple-400" />;
      default:
        return <FileIcon className="w-5 h-5 text-slate-400" />;
    }
  };

  const getFileTypeBadge = (type: string) => {
    switch (type) {
      case 'pdf':
        return <span className="text-[11px] font-semibold text-rose-400 uppercase">PDF</span>;
      case 'image':
        return <span className="text-[11px] font-semibold text-emerald-400 uppercase">Image</span>;
      case 'txt':
        return <span className="text-[11px] font-semibold text-blue-400 uppercase">TXT</span>;
      case 'csv':
        return <span className="text-[11px] font-semibold text-amber-400 uppercase">CSV</span>;
      case 'html':
        return <span className="text-[11px] font-semibold text-purple-400 uppercase">HTML</span>;
      default:
        return <span className="text-[11px] font-semibold text-slate-400 uppercase">{type}</span>;
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div
        className={`bg-slate-900/80 border border-slate-800 backdrop-blur-md rounded-2xl p-6 sm:p-8 shadow-xl transition-all duration-300 ${
          fileToDelete ? 'filter blur-md pointer-events-none select-none scale-[0.99] opacity-75' : ''
        }`}
      >
        {/* Header and Refresh */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-white">Your Documents</h2>
            <p className="text-sm text-slate-400 mt-0.5">
              {pagination.total} document{pagination.total === 1 ? '' : 's'} stored
            </p>
          </div>
          <button
            onClick={() => fetchFiles(pagination.page)}
            disabled={loading}
            title="Refresh files"
            className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-400' : ''}`} />
          </button>
        </div>

        {/* Success Banner */}
        {successBanner && (
          <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-sm flex items-center justify-between gap-3 animate-in fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successBanner}</span>
            </div>
            <button
              onClick={() => setSuccessBanner(null)}
              className="text-xs text-emerald-400/70 hover:text-emerald-300 font-semibold"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-sm">
            {error}
          </div>
        )}

        {/* Loading State */}
        {loading && files.length === 0 ? (
          <div className="py-16 text-center">
            <div className="w-8 h-8 border-3 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm text-slate-400">Loading your documents...</p>
          </div>
        ) : files.length === 0 ? (
          /* Empty State */
          <div className="py-16 px-4 text-center border-2 border-dashed border-slate-800 rounded-2xl">
            <div className="w-14 h-14 rounded-2xl bg-slate-800/80 flex items-center justify-center text-slate-500 mx-auto mb-3">
              <FolderOpen className="w-7 h-7" />
            </div>
            <h3 className="text-base font-medium text-white mb-1">No documents uploaded yet</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto mb-5">
              Upload your first PDF, TXT, CSV, HTML, or image document to view it inline anytime.
            </p>
            <button
              onClick={onGoToUpload}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-md transition-all"
            >
              Upload Document
            </button>
          </div>
        ) : (
          /* Files List */
          <div className="space-y-3">
            {files.map((file) => (
              <div
                key={file.id}
                onClick={() => onSelectFile(file)}
                className="group p-4 bg-slate-900/50 hover:bg-slate-900/90 border border-slate-800/80 hover:border-slate-700 rounded-xl flex items-center justify-between gap-4 cursor-pointer transition-all duration-200 hover:shadow-lg hover:shadow-indigo-500/5"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    {getFileTypeIcon(file.fileType)}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-white truncate max-w-xs sm:max-w-md">
                        {file.originalName}
                      </p>
                      {getFileTypeBadge(file.fileType)}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1.5 flex-wrap">
                      <span>Uploaded {formatDate(file.uploadedAt)}</span>
                      {file.fileSize ? (
                        <>
                          <span className="text-slate-700">•</span>
                          <span className="font-mono text-slate-400 font-medium">
                            {formatFileSize(file.fileSize)}
                          </span>
                        </>
                      ) : null}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {/* View / Read Button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectFile(file);
                    }}
                    className="px-3.5 py-1.5 rounded-lg bg-indigo-600/10 group-hover:bg-indigo-600 text-indigo-400 group-hover:text-white border border-indigo-500/20 group-hover:border-transparent text-xs font-medium flex items-center gap-1.5 transition-all"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>View / Read</span>
                  </button>

                  {/* Delete Button */}
                  <button
                    type="button"
                    title="Delete document"
                    onClick={(e) => {
                      e.stopPropagation();
                      setFileToDelete(file);
                      setDeleteModalError(null);
                    }}
                    className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border border-slate-700/60 hover:border-rose-500/30 transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination Controls */}
        {pagination.totalPages > 1 && (
          <div className="mt-8 pt-5 border-t border-slate-800 flex items-center justify-between">
            <p className="text-xs text-slate-400">
              Page <span className="font-semibold text-white">{pagination.page}</span> of{' '}
              <span className="font-semibold text-white">{pagination.totalPages}</span>
            </p>

            <div className="flex items-center gap-2">
              <button
                onClick={() => fetchFiles(pagination.page - 1)}
                disabled={pagination.page <= 1 || loading}
                className="px-3 py-1.5 rounded-lg bg-slate-950/70 border border-slate-800 text-xs text-slate-300 hover:text-white hover:border-slate-700 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 transition-all"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Previous</span>
              </button>
              <button
                onClick={() => fetchFiles(pagination.page + 1)}
                disabled={pagination.page >= pagination.totalPages || loading}
                className="px-3 py-1.5 rounded-lg bg-slate-950/70 border border-slate-800 text-xs text-slate-300 hover:text-white hover:border-slate-700 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 transition-all"
              >
                <span>Next</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal - Sibling outside of the blurred container for deep blur */}
      {fileToDelete && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-slate-950/65 backdrop-blur-2xl transition-all duration-300 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700/70 p-6 sm:p-7 rounded-2xl max-w-md w-full shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            {deleteSuccess ? (
              <div className="py-6 text-center animate-in fade-in zoom-in-95">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-3 mx-auto">
                  <CheckCircle2 className="w-6 h-6 animate-bounce" />
                </div>
                <h4 className="text-lg font-bold text-white mb-1">Document Deleted</h4>
                <p className="text-xs text-slate-400">Updating your library...</p>
              </div>
            ) : (
              <>
                <div className="w-12 h-12 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 mb-4 mx-auto shrink-0">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <h4 className="text-lg font-bold text-center text-white mb-1.5">Delete Document?</h4>
                <p className="text-xs text-center text-slate-400 mb-4 leading-relaxed">
                  Are you sure you want to permanently delete this document? This will remove it from both cloud CDN and database storage.
                </p>

                {/* Dedicated File Info Pill - Soft glassmorphism with progress animation */}
                <div
                  className={`relative overflow-hidden p-3.5 rounded-xl mb-5 flex items-center gap-3 min-w-0 transition-all duration-300 ${
                    isDeleting
                      ? 'bg-rose-950/20 border border-rose-500/40'
                      : 'bg-slate-800/60 border border-slate-700/60'
                  }`}
                >
                  <div className="w-9 h-9 rounded-lg bg-slate-800/80 border border-slate-700/50 flex items-center justify-center shrink-0">
                    {getFileTypeIcon(fileToDelete.fileType)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-slate-200 truncate" title={fileToDelete.originalName}>
                      {fileToDelete.originalName}
                    </p>
                    {isDeleting ? (
                      <p className="text-[11px] text-rose-400 animate-pulse mt-0.5 font-medium">
                        Deleting from cloud & database...
                      </p>
                    ) : (
                      <p className="text-[11px] text-amber-400 font-mono mt-0.5">
                        Size: {formatFileSize(fileToDelete.fileSize)}
                      </p>
                    )}
                  </div>

                  {isDeleting && (
                    <div className="absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r from-rose-500/20 via-rose-500 to-rose-500/20 animate-pulse" />
                  )}
                </div>

                {deleteModalError && (
                  <div className="mb-4 p-3 bg-rose-500/15 border border-rose-500/30 rounded-xl text-xs text-rose-300 text-center">
                    {deleteModalError}
                  </div>
                )}

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    disabled={isDeleting}
                    onClick={() => {
                      setFileToDelete(null);
                      setDeleteModalError(null);
                    }}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 hover:text-white transition-all disabled:opacity-50 min-w-[80px]"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={isDeleting}
                    onClick={handleConfirmDelete}
                    className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-semibold text-white shadow-md shadow-rose-600/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50 min-w-[140px] whitespace-nowrap shrink-0"
                  >
                    {isDeleting ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin shrink-0" />
                        <span>Deleting...</span>
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-3.5 h-3.5 shrink-0" />
                        <span>Delete Document</span>
                      </>
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
