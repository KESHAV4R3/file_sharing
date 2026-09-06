'use client';

import React, { useState, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { UploadCloud, FileText, CheckCircle2, AlertCircle, X, ArrowUpRight } from 'lucide-react';

interface FileUploadProps {
  onUploadSuccess: () => void;
}

const ACCEPTED_EXTENSIONS = ['.txt', '.html', '.htm', '.pdf', '.csv', '.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg'];

export default function FileUpload({ onUploadSuccess }: FileUploadProps) {
  const { fetchWithAuth } = useAuth();
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
    const isAccepted = ACCEPTED_EXTENSIONS.some((ext) => fileName.endsWith(ext)) || file.type.startsWith('image/');

    if (!isAccepted) {
      setError('Invalid file type. Supported formats: .txt, .html, .pdf, .csv, and images.');
      setSelectedFile(null);
      return;
    }

    // 25MB max size limit for comfort
    if (file.size > 25 * 1024 * 1024) {
      setError('File size exceeds the 25MB limit.');
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
      <div className="bg-slate-900/80 border border-slate-800 backdrop-blur-md rounded-2xl p-6 sm:p-8 shadow-xl">
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-white">Upload New Document</h2>
          <p className="text-sm text-slate-400 mt-1">
            Store documents securely on Cloudinary CDN. Supports PDF, TXT, CSV, HTML, and Images.
          </p>
        </div>

        {error && (
          <div
            className={`mb-5 p-4 rounded-xl text-sm flex items-start justify-between gap-3 ${
              isDuplicate
                ? 'bg-amber-500/15 border border-amber-500/30 text-amber-300'
                : 'bg-rose-500/10 border border-rose-500/30 text-rose-400'
            }`}
          >
            <div className="flex items-start gap-3">
              <AlertCircle
                className={`w-5 h-5 shrink-0 mt-0.5 ${
                  isDuplicate ? 'text-amber-400' : 'text-rose-400'
                }`}
              />
              <div>
                <p className="font-semibold mb-0.5">
                  {isDuplicate ? 'Duplicate Document Detected' : 'Upload Failed'}
                </p>
                <p className="text-xs opacity-90">{error}</p>
              </div>
            </div>

            {isDuplicate && (
              <button
                type="button"
                onClick={onUploadSuccess}
                className="px-3 py-1.5 bg-amber-500/25 hover:bg-amber-500/35 text-amber-200 border border-amber-500/30 rounded-lg text-xs font-medium flex items-center gap-1 shrink-0 transition-colors"
              >
                <span>View Library</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}

        {success && (
          <div className="mb-5 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-sm flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-5 h-5 shrink-0" />
              <span>{success}</span>
            </div>
            <button
              onClick={onUploadSuccess}
              className="px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors"
            >
              Go to View/Read <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Dropzone */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center cursor-pointer transition-all duration-200 ${
            dragOver
              ? 'border-indigo-500 bg-indigo-500/10 scale-[1.01]'
              : 'border-slate-700/80 hover:border-slate-600 bg-slate-950/40 hover:bg-slate-950/60'
          }`}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".txt,.html,.htm,.pdf,.csv,image/*"
            className="hidden"
          />

          <div className="flex flex-col items-center">
            <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-4 shadow-inner">
              <UploadCloud className="w-8 h-8" />
            </div>
            <p className="text-base font-medium text-slate-200 mb-1">
              Drag & drop your document here, or <span className="text-indigo-400 underline">browse</span>
            </p>
            <p className="text-xs text-slate-500 max-w-sm">
              Supports .pdf, .txt, .csv, .html, .jpg, .png, .webp (up to 25MB)
            </p>
          </div>
        </div>

        {/* Selected File Details */}
        {selectedFile && (
          <div className="mt-5 p-4 bg-slate-950/70 border border-slate-800 rounded-xl flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center text-indigo-400 shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-white truncate">{selectedFile.name}</p>
                <p className="text-xs text-slate-400">{formatFileSize(selectedFile.size)}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
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
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white text-xs font-semibold rounded-lg shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
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
