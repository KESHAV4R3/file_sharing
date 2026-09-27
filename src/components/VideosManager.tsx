'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { DocFile, formatFileSize } from './DocViewerModal';
import {
  Video,
  Play,
  UploadCloud,
  RefreshCw,
  Trash2,
  AlertCircle,
  CheckCircle2,
  ArrowUpRight,
  X,
  Lock,
  Music,
  HardDrive,
} from 'lucide-react';

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

interface VideosManagerProps {
  onSelectFile: (file: DocFile) => void;
}

const VIDEO_EXTENSIONS = ['.mp4', '.webm', '.mov', '.mkv', '.avi', '.m4v', '.mp3', '.wav', '.ogg', '.m4a', '.aac', '.flac'];

export default function VideosManager({ onSelectFile }: VideosManagerProps) {
  const { user, fetchWithAuth } = useAuth();
  const canUploadVideo = user?.canUploadVideo === true;
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Video list state
  const [videos, setVideos] = useState<DocFile[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo>({ total: 0, page: 1, totalPages: 1, limit: 12 });
  const [storage, setStorage] = useState<StorageInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  // Fetch videos
  const fetchVideos = useCallback(
    async (targetPage = 1, silent = false) => {
      if (!silent) setLoading(true);
      setError(null);
      try {
        const res = await fetchWithAuth(`/api/files?type=video&page=${targetPage}&limit=12`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to fetch videos.');
        setVideos(data.files || []);
        if (data.pagination) setPagination(data.pagination);
        if (data.storage) setStorage(data.storage);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Error loading videos.');
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [fetchWithAuth]
  );

  useEffect(() => {
    fetchVideos(1);
  }, [fetchVideos]);

  // Lock scroll when delete modal open
  useEffect(() => {
    if (fileToDelete) {
      const original = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = original;
      };
    }
  }, [fileToDelete]);

  // ─── Upload logic ───────────────────────────────────────────────────────────

  const validateAndSetFile = (file: File) => {
    setUploadError(null);
    setIsDuplicate(false);

    if (!canUploadVideo) {
      setUploadError(
        'Upload access restricted. You need permission from the administrator to upload videos.'
      );
      setSelectedFile(null);
      return;
    }

    const fileName = file.name.toLowerCase();
    const isVideoOrAudio =
      VIDEO_EXTENSIONS.some((ext) => fileName.endsWith(ext)) ||
      file.type.startsWith('video/') ||
      file.type.startsWith('audio/');

    if (!isVideoOrAudio) {
      setUploadError('Invalid file type. Supported: MP4, WebM, MOV, MKV, AVI, and audio formats.');
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
          `Uploading this video (${(file.size / (1024 * 1024)).toFixed(1)}MB) would exceed your account's ${maxMb}MB storage limit! Currently used: ${(usedBytes / (1024 * 1024)).toFixed(1)}MB. Remaining available: ${remainingMb}MB.`
        );
        setSelectedFile(null);
        return;
      }
    }

    setSelectedFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (canUploadVideo) setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (!canUploadVideo) return;
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndSetFile(e.target.files[0]);
    }
    e.target.value = '';
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    if (!canUploadVideo) {
      setUploadError('Permission denied. Contact admin to upload videos.');
      return;
    }

    setUploading(true);
    setUploadError(null);
    setIsDuplicate(false);

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const res = await fetchWithAuth('/api/files/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 409) {
          setIsDuplicate(true);
          setUploadError(data.error || 'This video has already been uploaded.');
        } else {
          setUploadError(data.error || 'Failed to upload video.');
        }
        return;
      }

      setSuccessBanner(`"${selectedFile.name}" uploaded successfully!`);
      setSelectedFile(null);
      fetchVideos(1, true);
    } catch {
      setUploadError('A network error occurred while uploading. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  // ─── Delete logic ───────────────────────────────────────────────────────────

  const confirmDelete = async () => {
    if (!fileToDelete) return;
    if (!canUploadVideo) {
      setDeleteModalError('You do not have permission to delete videos.');
      return;
    }

    setIsDeleting(true);
    setDeleteModalError(null);

    try {
      const res = await fetchWithAuth(`/api/files/${fileToDelete.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete video.');

      setDeleteSuccess(true);
      setTimeout(() => {
        setFileToDelete(null);
        setDeleteSuccess(false);
        setIsDeleting(false);
        fetchVideos(pagination.page);
      }, 700);
    } catch (err: unknown) {
      setDeleteModalError(err instanceof Error ? err.message : 'Error deleting video.');
      setIsDeleting(false);
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <>
      {/* Hidden file input */}
      {canUploadVideo && (
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="video/*,audio/*,.mp4,.webm,.mov,.mkv,.avi,.m4v"
          className="hidden"
        />
      )}

      <div className="max-w-5xl mx-auto">
        <div
          className={`bg-slate-900/80 border border-slate-800 backdrop-blur-md rounded-2xl p-4 sm:p-6 md:p-8 shadow-xl transition-all duration-300 ${
            fileToDelete ? 'filter blur-md pointer-events-none select-none scale-[0.99] opacity-75' : ''
          }`}
        >
          {/* ── Header ── */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400 shrink-0">
                <Video className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg sm:text-xl font-semibold text-white">Videos</h2>
                  {canUploadVideo ? (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold uppercase tracking-wider">
                      Upload &amp; Delete Allowed
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                      <Lock className="w-2.5 h-2.5" /> View Only
                    </span>
                  )}
                </div>
                <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                  {pagination.total} video{pagination.total === 1 ? '' : 's'} available to watch
                </p>
              </div>
            </div>

            {/* Refresh */}
            <button
              onClick={() => fetchVideos(pagination.page)}
              disabled={loading}
              title="Refresh video list"
              className="self-end sm:self-auto p-2 sm:p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-violet-400' : ''}`} />
            </button>
          </div>

          {/* ── View-Only Info Banner (if no upload access) ── */}
          {!canUploadVideo && (
            <div className="mb-6 p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center gap-3.5">
              <div className="w-9 h-9 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400 shrink-0">
                <Video className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm font-semibold text-slate-200">
                  Video Watching Mode
                </p>
                <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5">
                  You can watch and listen to any video in this section. Upload and deletion permissions can be granted by the owner/admin.
                </p>
              </div>
            </div>
          )}

          {/* ── Success Banner ── */}
          {successBanner && (
            <div className="mb-5 p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-xs flex items-center justify-between gap-3 animate-in fade-in">
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
                <AlertCircle
                  className={`w-4 h-4 shrink-0 mt-0.5 ${
                    isDuplicate ? 'text-amber-400' : 'text-rose-400'
                  }`}
                />
                <div>
                  <p className="font-semibold mb-0.5">
                    {isDuplicate ? 'Duplicate Video Detected' : 'Upload Failed'}
                  </p>
                  <p className="opacity-90">{uploadError}</p>
                </div>
              </div>
              {isDuplicate && (
                <button
                  type="button"
                  onClick={() => {
                    setUploadError(null);
                    setIsDuplicate(false);
                  }}
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
                <HardDrive className="w-4 h-4 text-violet-400 shrink-0" />
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
                          : 'bg-violet-500'
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

          {/* ── Drag & Drop Upload Zone (Visible ONLY if canUploadVideo === true) ── */}
          {canUploadVideo && (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`p-4 sm:p-5 rounded-2xl border-2 border-dashed cursor-pointer transition-all duration-200 text-center mb-6 flex flex-col items-center justify-center gap-1.5 ${
                dragOver
                  ? 'border-violet-500 bg-violet-500/15 scale-[1.01] shadow-lg shadow-violet-500/10'
                  : 'border-slate-800 hover:border-slate-700 bg-slate-950/40 hover:bg-slate-950/70'
              }`}
            >
              <div className="w-9 h-9 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400 mb-0.5">
                <UploadCloud className="w-5 h-5" />
              </div>
              <p className="text-xs sm:text-sm font-medium text-slate-200">
                Drag &amp; drop a video or <span className="text-violet-400 underline underline-offset-2">browse files</span>
              </p>
              <p className="text-[11px] text-slate-500">
                Supports MP4, WebM, MOV, MKV, AVI, and Audio formats · Total account storage: {storage?.isUnlimited ? 'Unlimited (No Cap)' : `${storage?.maxMb || 50}MB limit`}
              </p>
            </div>
          )}

          {/* ── Selected File Preview (before upload) ── */}
          {selectedFile && canUploadVideo && (
            <div className="mb-6 p-3.5 bg-slate-950/70 border border-violet-500/30 rounded-xl flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 animate-in fade-in duration-150">
              <div className="flex items-center gap-3 overflow-hidden min-w-0">
                <div className="w-9 h-9 rounded-lg bg-slate-800 flex items-center justify-center shrink-0">
                  <Video className="w-4 h-4 text-violet-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-white truncate">{selectedFile.name}</p>
                  <p className="text-xs text-slate-400">{formatFileSize(selectedFile.size)}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedFile(null);
                    setUploadError(null);
                  }}
                  disabled={uploading}
                  className="px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800 text-xs font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleUpload}
                  disabled={uploading}
                  className="px-4 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold shadow-md shadow-violet-600/30 flex items-center gap-1.5 transition-all disabled:opacity-60"
                >
                  {uploading ? (
                    <>
                      <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      <span>Uploading…</span>
                    </>
                  ) : (
                    <>
                      <UploadCloud className="w-3.5 h-3.5" />
                      <span>Upload Video</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* ── Videos List / Grid ── */}
          {loading ? (
            <div className="py-16 text-center text-slate-500 text-sm flex flex-col items-center justify-center gap-3">
              <svg className="animate-spin w-7 h-7 text-violet-400" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              <span>Loading videos…</span>
            </div>
          ) : videos.length === 0 ? (
            <div className="py-14 text-center">
              <div className="w-12 h-12 rounded-2xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-center mx-auto mb-3 text-slate-500">
                <Video className="w-6 h-6" />
              </div>
              <p className="text-sm font-medium text-slate-300">No videos available yet</p>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                {canUploadVideo
                  ? 'Upload your first video using the drag & drop area above.'
                  : 'Videos added by authorized users will appear here for you to watch.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {videos.map((file) => (
                <div
                  key={file.id}
                  className="bg-slate-950/50 hover:bg-slate-950/80 border border-slate-800/80 hover:border-violet-500/40 rounded-2xl p-4 transition-all duration-200 flex flex-col justify-between group shadow-sm"
                >
                  <div>
                    {/* Top Row: Icon + Type Badge + Delete (if permitted) */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400">
                          {file.fileType === 'audio' ? (
                            <Music className="w-4 h-4" />
                          ) : (
                            <Video className="w-4 h-4" />
                          )}
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/30">
                          {file.fileType.toUpperCase()}
                        </span>
                      </div>

                      {/* Delete button: ONLY rendered if canUploadVideo is true! */}
                      {canUploadVideo && (
                        <button
                          type="button"
                          onClick={() => {
                            setDeleteModalError(null);
                            setFileToDelete(file);
                          }}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                          title="Delete video"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Title */}
                    <h3
                      className="text-sm font-semibold text-slate-200 line-clamp-2 mb-1 group-hover:text-white transition-colors"
                      title={file.originalName}
                    >
                      {file.originalName}
                    </h3>

                    {/* Metadata */}
                    <p className="text-[11px] text-slate-500 mb-4">
                      {formatFileSize(file.fileSize)} · {formatDate(file.uploadedAt)}
                    </p>
                  </div>

                  {/* Watch Button */}
                  <button
                    type="button"
                    onClick={() => onSelectFile(file)}
                    className="w-full py-2 px-3 rounded-xl bg-violet-600/15 hover:bg-violet-600 text-violet-300 hover:text-white border border-violet-500/30 hover:border-violet-600 text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-sm"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Watch Video</span>
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* ── Pagination ── */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-800/80 text-xs text-slate-400">
              <span>
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => fetchVideos(pagination.page - 1)}
                  disabled={pagination.page <= 1 || loading}
                  className="px-3 py-1.5 rounded-lg bg-slate-950/60 border border-slate-800 hover:border-slate-700 disabled:opacity-40 transition-colors"
                >
                  Previous
                </button>
                <button
                  type="button"
                  onClick={() => fetchVideos(pagination.page + 1)}
                  disabled={pagination.page >= pagination.totalPages || loading}
                  className="px-3 py-1.5 rounded-lg bg-slate-950/60 border border-slate-800 hover:border-slate-700 disabled:opacity-40 transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Delete Confirmation Modal (only callable by users with permission) ── */}
      {fileToDelete && canUploadVideo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
            onClick={() => !isDeleting && setFileToDelete(null)}
          />
          <div className="relative bg-slate-900 border border-rose-500/30 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="w-12 h-12 rounded-full bg-rose-500/15 flex items-center justify-center">
                <Trash2 className="w-6 h-6 text-rose-400" />
              </div>
              <h3 className="text-lg font-bold text-white">Delete Video?</h3>
              <p className="text-xs text-slate-400">
                Are you sure you want to permanently delete{' '}
                <span className="text-white font-semibold">"{fileToDelete.originalName}"</span>?
                This action cannot be undone.
              </p>
            </div>

            {deleteModalError && (
              <div className="mt-3 p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
                {deleteModalError}
              </div>
            )}

            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={() => setFileToDelete(null)}
                disabled={isDeleting}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={isDeleting}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
              >
                {isDeleting ? (
                  <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
                <span>{deleteSuccess ? 'Deleted!' : 'Delete'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
