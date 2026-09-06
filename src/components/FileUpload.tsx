'use client';

import React, { useState, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  UploadCloud,
  FileText,
  CheckCircle2,
  AlertCircle,
  X,
  ArrowUpRight,
  Video,
  Music,
  FileImage,
} from 'lucide-react';

interface FileUploadProps {
  onUploadSuccess: () => void;
}

const DOC_EXTENSIONS = [
  '.txt',
  '.html',
  '.htm',
  '.pdf',
  '.csv',
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.gif',
  '.svg',
];

const MEDIA_EXTENSIONS = [
  '.mp4',
  '.webm',
  '.mov',
  '.mkv',
  '.avi',
  '.m4v',
  '.mp3',
  '.wav',
  '.ogg',
  '.m4a',
  '.aac',
  '.flac',
];

export default function FileUpload({ onUploadSuccess }: FileUploadProps) {
  const { user, fetchWithAuth } = useAuth();
  const isMediaAccount = user?.username?.toLowerCase() === 'video';

  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDuplicate, setIsDuplicate] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateAndSetFile = (file: File) => {
    setError(null);
    setIsDuplicate(false);
    setSuccess(null);

    const fileName = file.name.toLowerCase();
    const isMediaFile =
      MEDIA_EXTENSIONS.some((ext) => fileName.endsWith(ext)) ||
      file.type.startsWith('video/') ||
      file.type.startsWith('audio/');

    // Check if account is authorized for media
    if (isMediaFile && !isMediaAccount) {
      setError(
        'Audio and video uploads are restricted to the dedicated media account ("video"). Please log in with username "video" (password: video@123) to upload audio and video.'
      );
      setSelectedFile(null);
      return;
    }

    const isDocFile =
      DOC_EXTENSIONS.some((ext) => fileName.endsWith(ext)) ||
      file.type.startsWith('image/');

    if (!isDocFile && !isMediaFile) {
      setError(
        isMediaAccount
          ? 'Invalid file type. Supported formats: Documents (PDF, TXT, HTML, CSV), Images, Video, and Audio.'
          : 'Invalid file type. Supported formats: PDF, TXT, HTML, CSV, and Images.'
      );
      setSelectedFile(null);
      return;
    }

    // Size limit: 100MB for media on video account, 25MB for regular documents
    const maxSize = isMediaAccount ? 100 * 1024 * 1024 : 25 * 1024 * 1024;
    if (file.size > maxSize) {
      setError(`File size exceeds the ${isMediaAccount ? '100MB' : '25MB'} limit.`);
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    setError(null);
    setIsDuplicate(false);
    setSuccess(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const res = await fetchWithAuth('/api/files/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 409 || data.duplicateId) {
          setIsDuplicate(true);
        }
        throw new Error(data.error || 'Failed to upload document.');
      }

      setSuccess(`"${selectedFile.name}" was successfully uploaded!`);
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err: any) {
      setError(err?.message || 'An error occurred while uploading.');
    } finally {
      setUploading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-slate-900/80 border border-slate-800 backdrop-blur-md rounded-2xl p-4 sm:p-8 shadow-xl">
        <div className="mb-5 sm:mb-6">
          <div className="flex items-center gap-2">
            <h2 className="text-lg sm:text-xl font-semibold text-white">
              {isMediaAccount ? 'Upload File (Media Account)' : 'Upload New Document'}
            </h2>
            {isMediaAccount && (
              <span className="px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/30 text-[10px] font-bold uppercase tracking-wider">
                Video & Audio Active
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            {isMediaAccount
              ? 'Store documents, images, audio, and video securely on Cloudinary CDN.'
              : 'Store documents and images securely on Cloudinary CDN. (Audio & Video upload is exclusive to the @video account)'}
          </p>
        </div>

        {error && (
          <div
            className={`mb-5 p-3.5 sm:p-4 rounded-xl text-xs sm:text-sm flex items-start justify-between gap-3 ${
              isDuplicate
                ? 'bg-amber-500/15 border border-amber-500/30 text-amber-300'
                : 'bg-rose-500/10 border border-rose-500/30 text-rose-400'
            }`}
          >
            <div className="flex items-start gap-2.5 sm:gap-3">
              <AlertCircle
                className={`w-5 h-5 shrink-0 mt-0.5 ${
                  isDuplicate ? 'text-amber-400' : 'text-rose-400'
                }`}
              />
              <div>
                <p className="font-semibold mb-0.5">
                  {isDuplicate ? 'Duplicate File Detected' : 'Upload Failed'}
                </p>
                <p className="text-xs opacity-90">{error}</p>
              </div>
            </div>

            {isDuplicate && (
              <button
                type="button"
                onClick={onUploadSuccess}
                className="px-2.5 sm:px-3 py-1.5 bg-amber-500/25 hover:bg-amber-500/35 text-amber-200 border border-amber-500/30 rounded-lg text-xs font-medium flex items-center gap-1 shrink-0 transition-colors"
              >
                <span>View Library</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}

        {success && (
          <div className="mb-5 p-3.5 sm:p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-xs sm:text-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-5 h-5 shrink-0" />
              <span>{success}</span>
            </div>
            <button
              onClick={onUploadSuccess}
              className="px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors shrink-0"
            >
              Go to View/Play <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Dropzone */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-6 sm:p-12 text-center cursor-pointer transition-all duration-200 ${
            dragOver
              ? 'border-indigo-500 bg-indigo-500/10 scale-[1.01]'
              : 'border-slate-700/80 hover:border-slate-600 bg-slate-950/40 hover:bg-slate-950/60'
          }`}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept={
              isMediaAccount
                ? '.txt,.html,.htm,.pdf,.csv,image/*,video/*,audio/*'
                : '.txt,.html,.htm,.pdf,.csv,image/*'
            }
            className="hidden"
          />

          <div className="flex flex-col items-center">
            <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-3 sm:mb-4 shadow-inner">
              <UploadCloud className="w-6 h-6 sm:w-8 sm:h-8" />
            </div>
            <p className="text-sm sm:text-base font-medium text-slate-200 mb-1">
              Drag & drop your file here, or <span className="text-indigo-400 underline">browse</span>
            </p>
            <p className="text-[11px] sm:text-xs text-slate-500 max-w-sm">
              {isMediaAccount
                ? 'Supports Documents, Images, Audio, and Video (up to 100MB)'
                : 'Supports .pdf, .txt, .csv, .html, and images (up to 25MB). Video & Audio on @video account.'}
            </p>
          </div>
        </div>

        {/* Selected File Details */}
        {selectedFile && (
          <div className="mt-4 sm:mt-5 p-3.5 sm:p-4 bg-slate-950/70 border border-slate-800 rounded-xl flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4">
            <div className="flex items-center gap-3 overflow-hidden min-w-0">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-slate-800 flex items-center justify-center shrink-0">
                {selectedFile.type.startsWith('video/') || /\.(mp4|webm|mov|avi|mkv|m4v)$/i.test(selectedFile.name) ? (
                  <Video className="w-4 h-4 sm:w-5 sm:h-5 text-violet-400" />
                ) : selectedFile.type.startsWith('audio/') || /\.(mp3|wav|ogg|m4a|aac|flac)$/i.test(selectedFile.name) ? (
                  <Music className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-400" />
                ) : selectedFile.type.startsWith('image/') || /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(selectedFile.name) ? (
                  <FileImage className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400" />
                ) : (
                  <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-400" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-white truncate">{selectedFile.name}</p>
                <p className="text-xs text-slate-400">{formatFileSize(selectedFile.size)}</p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800/40">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedFile(null);
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }}
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
                  <span>Upload File</span>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
