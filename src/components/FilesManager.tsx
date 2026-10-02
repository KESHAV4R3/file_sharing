'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { DocFile, formatFileSize } from './DocViewerModal';
import {
  FileText,
  FileSpreadsheet,
  FileCode,
  FileImage,
  File as FileIcon,
  Video,
  Music,
  Play,
  ChevronLeft,
  ChevronRight,
  Eye,
  RefreshCw,
  FolderOpen,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  UploadCloud,
  X,
  AlertCircle,
  ArrowUpRight,
  HardDrive,
  Download,
} from 'lucide-react';
import { downloadFile } from '@/lib/downloadHelper';

interface FilesManagerProps {
  onSelectFile: (file: DocFile) => void;
}

interface PaginationInfo {
  total: number;
  page: number;
  totalPages: number;
  limit: number;
}

interface StorageInfo {
  usedBytes: number;
  maxBytes: number;
  maxMb: number;
  isUnlimited: boolean;
}

const DOC_EXTENSIONS = ['.txt', '.html', '.htm', '.pdf', '.csv', '.xlsx', '.xls', '.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg'];
const MEDIA_EXTENSIONS = ['.mp4', '.webm', '.mov', '.mkv', '.avi', '.m4v', '.mp3', '.wav', '.ogg', '.m4a', '.aac', '.flac'];

export default function FilesManager({ onSelectFile }: FilesManagerProps) {
  const { user, fetchWithAuth } = useAuth();
  const canUploadVideo = user?.canUploadVideo === true;
  const fileInputRef = useRef<HTMLInputElement>(null);

  // File list state
  const [files, setFiles] = useState<DocFile[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo>({ total: 0, page: 1, totalPages: 1, limit: 8 });
  const [storage, setStorage] = useState<StorageInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  // Upload state
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDuplicate, setIsDuplicate] = useState(false);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  // Delete state
  const [fileToDelete, setFileToDelete] = useState<DocFile | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteSuccess, setDeleteSuccess] = useState(false);
  const [deleteModalError, setDeleteModalError] = useState<string | null>(null);

  // Fetch files
  const fetchFiles = useCallback(
    async (targetPage = 1, silent = false) => {
      if (!silent) setLoading(true);
      setError(null);
      try {
        const res = await fetchWithAuth(`/api/files?type=document&page=${targetPage}&limit=8`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to fetch files.');
        setFiles(data.files || []);
        if (data.pagination) setPagination(data.pagination);
        if (data.storage) setStorage(data.storage);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Error loading files.');
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [fetchWithAuth]
  );

  useEffect(() => {
    fetchFiles(1);
  }, [fetchFiles]);

  // Lock scroll when delete modal open
  useEffect(() => {
    if (fileToDelete) {
      const original = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = original; };
    }
  }, [fileToDelete]);

  // ─── Upload logic ───────────────────────────────────────────────────────────

  const validateAndSetFile = (file: File) => {
    setUploadError(null);
    setIsDuplicate(false);
    const fileName = file.name.toLowerCase();
    const isMediaFile =
      MEDIA_EXTENSIONS.some((ext) => fileName.endsWith(ext)) ||
      file.type.startsWith('video/') ||
      file.type.startsWith('audio/');

    if (isMediaFile) {
      setUploadError(
        'Videos and audio belong in the dedicated "Videos" section! Please switch to the Videos tab above to upload or watch videos.'
      );
      setSelectedFile(null);
      return;
    }

    const isDocFile =
      DOC_EXTENSIONS.some((ext) => fileName.endsWith(ext)) || file.type.startsWith('image/');

    if (!isDocFile) {
      setUploadError('Invalid file type. Supported: PDF, TXT, HTML, CSV, Excel (.xlsx, .xls), and Images.');
      setSelectedFile(null);
      return;
    }

    const isUnlimited = storage?.isUnlimited ?? (user?.unlimitedFileSize === true);
    const maxBytes = storage?.maxBytes ?? (50 * 1024 * 1024);
    const usedBytes = storage?.usedBytes ?? 0;
    const maxMb = storage?.maxMb ?? 50;

    if (!isUnlimited) {
      if (usedBytes >= maxBytes) {
        setUploadError(
          `Total account storage cap of ${maxMb}MB reached! Please delete existing files or ask the administrator to enable unlimited storage.`
        );
        setSelectedFile(null);
        return;
      }

      if (usedBytes + file.size > maxBytes) {
        const remainingMb = Math.max(0, (maxBytes - usedBytes) / (1024 * 1024)).toFixed(1);
        setUploadError(
          `Uploading this file (${(file.size / (1024 * 1024)).toFixed(1)}MB) would exceed your account's ${maxMb}MB storage limit! Currently used: ${(usedBytes / (1024 * 1024)).toFixed(1)}MB. Remaining available: ${remainingMb}MB.`
        );
        setSelectedFile(null);
        return;
      }
    }

    setSelectedFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setDragOver(true); };
  const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); setDragOver(false); };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files?.length > 0) validateAndSetFile(e.dataTransfer.files[0]);
  };
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) validateAndSetFile(e.target.files[0]);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    setUploading(true);
    setUploadError(null);
    setIsDuplicate(false);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      const res = await fetchWithAuth('/api/files/upload', { method: 'POST', body: formData });
      const data = await res.json();

      if (!res.ok) {
        if (res.status === 409 || data.duplicateId) setIsDuplicate(true);
        throw new Error(data.error || 'Failed to upload document.');
      }

      const uploadedName = selectedFile.name;
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      setSuccessBanner(`"${uploadedName}" was uploaded successfully!`);
      setTimeout(() => setSuccessBanner(null), 4000);
      await fetchFiles(1, true);
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setUploading(false);
    }
  };

  // ─── Delete logic ────────────────────────────────────────────────────────────

  const handleConfirmDelete = async () => {
    if (!fileToDelete) return;
    setIsDeleting(true);
    setDeleteModalError(null);

    try {
      const res = await fetchWithAuth(`/api/files/${fileToDelete.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete file.');

      const deletedName = fileToDelete.originalName;
      const targetId = fileToDelete.id;
      setDeleteSuccess(true);

      setTimeout(() => {
        setFiles((prev) => prev.filter((f) => f.id !== targetId));
        setPagination((prev) => ({ ...prev, total: Math.max(0, prev.total - 1) }));
        setFileToDelete(null);
        setDeleteSuccess(false);
        setSuccessBanner(`"${deletedName}" was deleted successfully.`);
        if (files.length <= 1 && pagination.page > 1) fetchFiles(pagination.page - 1, true);
        else fetchFiles(pagination.page, true);
      }, 400);
    } catch (err: unknown) {
      setDeleteModalError(err instanceof Error ? err.message : 'Failed to delete file.');
      setIsDeleting(false);
    } finally {
      setIsDeleting(false);
    }
  };

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  const getFileTypeIcon = (type: string) => {
    switch (type) {
      case 'video': return <Video className="w-5 h-5 text-violet-400" />;
      case 'audio': return <Music className="w-5 h-5 text-cyan-400" />;
      case 'pdf':   return <FileIcon className="w-5 h-5 text-rose-400" />;
      case 'image': return <FileImage className="w-5 h-5 text-emerald-400" />;
      case 'txt':   return <FileText className="w-5 h-5 text-blue-400" />;
      case 'csv':   return <FileSpreadsheet className="w-5 h-5 text-amber-400" />;
      case 'excel': return <FileSpreadsheet className="w-5 h-5 text-emerald-400" />;
      case 'html':  return <FileCode className="w-5 h-5 text-purple-400" />;
      default:      return <FileIcon className="w-5 h-5 text-slate-400" />;
    }
  };

  const getFileTypeBadge = (type: string) => {
    const colorMap: Record<string, string> = {
      video: 'text-violet-400', audio: 'text-cyan-400', pdf: 'text-rose-400',
      image: 'text-emerald-400', txt: 'text-blue-400', csv: 'text-amber-400',
      excel: 'text-emerald-400 font-bold', html: 'text-purple-400',
    };
    const color = colorMap[type] ?? 'text-slate-400';
    return <span className={`text-[11px] font-semibold uppercase ${color}`}>{type}</span>;
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString(undefined, {
        month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit',
      });
    } catch { return dateStr; }
  };

  // ─── Render ───────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".txt,.html,.htm,.pdf,.csv,.xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,image/*"
        className="hidden"
      />

      <div className="max-w-4xl mx-auto">
        <div
          className={`bg-slate-900/80 border border-slate-800 backdrop-blur-md rounded-2xl p-4 sm:p-6 md:p-8 shadow-xl transition-all duration-300 ${
            fileToDelete ? 'filter blur-md pointer-events-none select-none scale-[0.99] opacity-75' : ''
          }`}
        >
          {/* ── Header ── */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
                <FolderOpen className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg sm:text-xl font-semibold text-white">Files</h2>
                  {canUploadVideo && (
                    <span className="px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/30 text-[10px] font-bold uppercase tracking-wider">
                      Video Enabled
                    </span>
                  )}
                </div>
                <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                  {pagination.total} file{pagination.total === 1 ? '' : 's'} stored
                </p>
              </div>
            </div>

            {/* Refresh */}
            <button
              onClick={() => fetchFiles(pagination.page)}
              disabled={loading}
              title="Refresh files"
              className="self-end sm:self-auto p-2 sm:p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-400' : ''}`} />
            </button>
          </div>

          {/* ── Success Banner ── */}
          {successBanner && (
            <div className="mb-5 p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-xs flex items-center justify-between gap-3 animate-in fade-in">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{successBanner}</span>
              </div>
              <button onClick={() => setSuccessBanner(null)} className="text-xs text-emerald-400/70 hover:text-emerald-300 font-semibold">
                Dismiss
              </button>
            </div>
          )}

          {/* ── Error Banner ── */}
          {error && (
            <div className="mb-5 p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-xs">
              {error}
            </div>
          )}

          {/* ── Upload Error Banner ── */}
          {uploadError && (
            <div
              className={`mb-5 p-3.5 rounded-xl text-xs flex items-start justify-between gap-3 ${
                isDuplicate
                  ? 'bg-amber-500/15 border border-amber-500/30 text-amber-300'
                  : 'bg-rose-500/10 border border-rose-500/30 text-rose-400'
              }`}
            >
              <div className="flex items-start gap-2.5">
                <AlertCircle className={`w-4 h-4 shrink-0 mt-0.5 ${isDuplicate ? 'text-amber-400' : 'text-rose-400'}`} />
                <div>
                  <p className="font-semibold mb-0.5">{isDuplicate ? 'Duplicate File Detected' : 'Upload Failed'}</p>
                  <p className="opacity-90">{uploadError}</p>
                </div>
              </div>
              {isDuplicate && (
                <button
                  type="button"
                  onClick={() => { setUploadError(null); setIsDuplicate(false); }}
                  className="px-2.5 py-1.5 bg-amber-500/25 hover:bg-amber-500/35 text-amber-200 border border-amber-500/30 rounded-lg text-xs font-medium flex items-center gap-1 shrink-0 transition-colors"
                >
                  <span>Dismiss</span>
                  <ArrowUpRight className="w-3 h-3" />
                </button>
              )}
            </div>
          )}

          {/* ── Storage Quota Bar ── */}
          {storage && (
            <div className="mb-4 p-3 sm:p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
              <div className="flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-indigo-400 shrink-0" />
                <span className="text-slate-300 font-medium">Account Storage:</span>
                <span className="font-mono text-white">
                  {(storage.usedBytes / (1024 * 1024)).toFixed(2)} MB
                </span>
                <span className="text-slate-500">/</span>
                <span className={storage.isUnlimited ? 'text-amber-300 font-bold' : 'text-slate-300'}>
                  {storage.isUnlimited ? 'Unlimited (No Cap)' : `${storage.maxMb} MB Total Quota`}
                </span>
              </div>
              {!storage.isUnlimited && (
                <div className="flex items-center gap-2 sm:w-52">
                  <div className="flex-1 h-2 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        storage.usedBytes / storage.maxBytes > 0.9
                          ? 'bg-rose-500'
                          : storage.usedBytes / storage.maxBytes > 0.7
                          ? 'bg-amber-500'
                          : 'bg-indigo-500'
                      }`}
                      style={{ width: `${Math.min(100, Math.round((storage.usedBytes / storage.maxBytes) * 100))}%` }}
                    />
                  </div>
                  <span className="text-[11px] font-mono text-slate-400 shrink-0">
                    {Math.round((storage.usedBytes / storage.maxBytes) * 100)}%
                  </span>
                </div>
              )}
            </div>
          )}

          {/* ── Drag & Drop Upload Zone ── */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`p-4 sm:p-5 rounded-2xl border-2 border-dashed cursor-pointer transition-all duration-200 text-center mb-6 flex flex-col items-center justify-center gap-1.5 ${
              dragOver
                ? 'border-indigo-500 bg-indigo-500/15 scale-[1.01] shadow-lg shadow-indigo-500/10'
                : 'border-slate-800 hover:border-slate-700 bg-slate-950/40 hover:bg-slate-950/70'
            }`}
          >
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-0.5">
              <UploadCloud className="w-5 h-5" />
            </div>
            <p className="text-xs sm:text-sm font-medium text-slate-200">
              Drag &amp; drop a file or <span className="text-indigo-400 underline underline-offset-2">browse from your computer</span>
            </p>
            <p className="text-[11px] text-slate-500">
              Supports .pdf, .txt, .csv, .html, and Images · Total account storage: {storage?.isUnlimited ? 'Unlimited (No Cap)' : `${storage?.maxMb || 50}MB limit`} · For videos, use the Videos tab
            </p>
          </div>

          {/* ── Selected File Preview (before upload) ── */}
          {selectedFile && (
            <div className="mb-6 p-3.5 bg-slate-950/70 border border-indigo-500/30 rounded-xl flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 animate-in fade-in duration-150">
              <div className="flex items-center gap-3 overflow-hidden min-w-0">
                <div className="w-9 h-9 rounded-lg bg-slate-800 flex items-center justify-center shrink-0">
                  {selectedFile.type.startsWith('video/') || /\.(mp4|webm|mov|avi|mkv|m4v)$/i.test(selectedFile.name) ? (
                    <Video className="w-4 h-4 text-violet-400" />
                  ) : selectedFile.type.startsWith('audio/') || /\.(mp3|wav|ogg|m4a|aac|flac)$/i.test(selectedFile.name) ? (
                    <Music className="w-4 h-4 text-cyan-400" />
                  ) : selectedFile.type.startsWith('image/') || /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(selectedFile.name) ? (
                    <FileImage className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <FileText className="w-4 h-4 text-indigo-400" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-white truncate">{selectedFile.name}</p>
                  <p className="text-xs text-slate-400">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800/40">
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setSelectedFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                  title="Cancel selection"
                >
                  <X className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  disabled={uploading}
                  onClick={handleUpload}
                  className="flex-1 sm:flex-initial px-4 py-2 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white text-xs font-semibold rounded-lg shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {uploading ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Uploading...</span>
                    </>
                  ) : (
                    <>
                      <UploadCloud className="w-3.5 h-3.5" />
                      <span>Upload File</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* ── File List ── */}
          {loading && files.length === 0 ? (
            <div className="py-16 text-center">
              <div className="w-8 h-8 border-3 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm text-slate-400">Loading your files...</p>
            </div>
          ) : files.length === 0 ? (
            <div className="py-12 sm:py-16 px-4 text-center border-2 border-dashed border-slate-800 rounded-2xl">
              <div className="w-12 h-12 rounded-2xl bg-slate-800/80 flex items-center justify-center text-slate-500 mx-auto mb-3">
                <FolderOpen className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-medium text-white mb-1">No files uploaded yet</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Drag &amp; drop a file above or click the zone to browse and upload your first document.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {files.map((file) => (
                <div
                  key={file.id}
                  onClick={() => onSelectFile(file)}
                  className="group p-3.5 sm:p-4 bg-slate-950/50 hover:bg-slate-900/90 border border-slate-800/80 hover:border-slate-700 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 cursor-pointer transition-all duration-200 hover:shadow-lg hover:shadow-indigo-500/5"
                >
                  <div className="flex items-center gap-3 sm:gap-3.5 min-w-0">
                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      {getFileTypeIcon(file.fileType)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                        <p className="text-sm font-medium text-white truncate max-w-full sm:max-w-xs md:max-w-md" title={file.originalName}>
                          {file.originalName}
                        </p>
                        <div className="shrink-0">{getFileTypeBadge(file.fileType)}</div>
                      </div>
                      <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5 flex items-center gap-1.5 flex-wrap">
                        <span>Uploaded {formatDate(file.uploadedAt)}</span>
                        {file.fileSize ? (
                          <>
                            <span className="text-slate-700">•</span>
                            <span className="font-mono text-slate-400 font-medium">{formatFileSize(file.fileSize)}</span>
                          </>
                        ) : null}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800/40">
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); onSelectFile(file); }}
                      className="flex-1 sm:flex-initial px-3.5 py-1.5 rounded-lg bg-indigo-600/10 group-hover:bg-indigo-600 text-indigo-400 group-hover:text-white border border-indigo-500/20 group-hover:border-transparent text-xs font-medium flex items-center justify-center gap-1.5 transition-all"
                    >
                      {file.fileType === 'video' || file.fileType === 'audio' ? (
                        <Play className="w-3.5 h-3.5 fill-current" />
                      ) : (
                        <Eye className="w-3.5 h-3.5" />
                      )}
                      <span>{file.fileType === 'video' || file.fileType === 'audio' ? 'Play' : 'View / Read'}</span>
                    </button>

                    <button
                      type="button"
                      title="Download file"
                      disabled={downloadingId === file.id}
                      onClick={async (e) => {
                        e.stopPropagation();
                        try {
                          setDownloadingId(file.id);
                          await downloadFile(file, fetchWithAuth);
                        } catch (err) {
                          console.error('Download error:', err);
                        } finally {
                          setDownloadingId(null);
                        }
                      }}
                      className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-emerald-500/20 text-slate-400 hover:text-emerald-400 border border-slate-700/60 hover:border-emerald-500/30 transition-all flex items-center justify-center disabled:opacity-50"
                    >
                      {downloadingId === file.id ? (
                        <div className="w-3.5 h-3.5 border-2 border-emerald-400/30 border-t-emerald-400 rounded-full animate-spin" />
                      ) : (
                        <Download className="w-3.5 h-3.5" />
                      )}
                    </button>

                    <button
                      type="button"
                      title="Delete file"
                      onClick={(e) => { e.stopPropagation(); setFileToDelete(file); setDeleteModalError(null); }}
                      className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border border-slate-700/60 hover:border-rose-500/30 transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── Pagination ── */}
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
      </div>

      {/* ── Delete Confirmation Modal ── */}
      {fileToDelete && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-slate-950/65 backdrop-blur-2xl animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700/70 p-6 sm:p-7 rounded-2xl max-w-md w-full shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            {deleteSuccess ? (
              <div className="py-6 text-center animate-in fade-in zoom-in-95">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-3 mx-auto">
                  <CheckCircle2 className="w-6 h-6 animate-bounce" />
                </div>
                <h4 className="text-lg font-bold text-white mb-1">File Deleted</h4>
                <p className="text-xs text-slate-400">Updating your library...</p>
              </div>
            ) : (
              <>
                <div className="w-12 h-12 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 mb-4 mx-auto shrink-0">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <h4 className="text-lg font-bold text-center text-white mb-1.5">Delete File?</h4>
                <p className="text-xs text-center text-slate-400 mb-4 leading-relaxed">
                  This will permanently remove the file from cloud storage and database. This action cannot be undone.
                </p>

                <div className={`relative overflow-hidden p-3.5 rounded-xl mb-5 flex items-center gap-3 min-w-0 ${
                  isDeleting ? 'bg-rose-950/20 border border-rose-500/40' : 'bg-slate-800/60 border border-slate-700/60'
                }`}>
                  <div className="w-9 h-9 rounded-lg bg-slate-800/80 border border-slate-700/50 flex items-center justify-center shrink-0">
                    {getFileTypeIcon(fileToDelete.fileType)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-slate-200 truncate" title={fileToDelete.originalName}>
                      {fileToDelete.originalName}
                    </p>
                    {isDeleting ? (
                      <p className="text-[11px] text-rose-400 animate-pulse mt-0.5 font-medium">
                        Deleting from cloud &amp; database...
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

                <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-3 pt-2">
                  <button
                    type="button"
                    disabled={isDeleting}
                    onClick={() => { setFileToDelete(null); setDeleteModalError(null); }}
                    className="w-full sm:w-auto px-4 py-2.5 sm:py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 hover:text-white transition-all disabled:opacity-50 min-w-[80px] text-center"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={isDeleting}
                    onClick={handleConfirmDelete}
                    className="w-full sm:w-auto px-5 py-2.5 sm:py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-semibold text-white shadow-md shadow-rose-600/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50 min-w-[140px] whitespace-nowrap shrink-0"
                  >
                    {isDeleting ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin shrink-0" />
                        <span>Deleting...</span>
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-3.5 h-3.5 shrink-0" />
                        <span>Delete File</span>
                      </>
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
