'use client';

import React, { useState, useEffect, useRef } from 'react';
import Papa from 'papaparse';
import {
  X,
  Maximize2,
  Minimize2,
  Sun,
  Moon,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  FileText,
  FileCode,
  FileSpreadsheet,
  FileImage,
  File as FileIcon,
  HardDrive,
  Trash2,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export interface DocFile {
  id: string;
  originalName: string;
  fileType: 'txt' | 'html' | 'pdf' | 'image' | 'csv';
  fileSize?: number;
  cloudinaryUrl: string;
  uploadedAt: string;
}

export function formatFileSize(bytes?: number | null): string {
  if (bytes === undefined || bytes === null || isNaN(bytes) || bytes <= 0) {
    return '';
  }
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

interface DocViewerModalProps {
  file: DocFile | null;
  onClose: () => void;
  onDeleted?: (fileId: string) => void;
}

export default function DocViewerModal({ file, onClose, onDeleted }: DocViewerModalProps) {
  const { fetchWithAuth } = useAuth();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [readerTheme, setReaderTheme] = useState<'dark' | 'light'>('dark');
  const [fontSize, setFontSize] = useState<number>(16);

  // Deletion states
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteSuccess, setDeleteSuccess] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Loaded content states for text/csv/html
  const [textContent, setTextContent] = useState<string>('');
  const [csvData, setCsvData] = useState<string[][]>([]);
  const [loadingContent, setLoadingContent] = useState(false);
  const [contentError, setContentError] = useState<string | null>(null);
  const [resolvedFileSize, setResolvedFileSize] = useState<number | undefined>(file?.fileSize);

  // PDF blob URL – fetched via authenticated request so the iframe never
  // needs to send Authorization headers (which browsers block for iframes).
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  const handleDeleteDocument = async () => {
    if (!file) return;
    setIsDeleting(true);
    setDeleteError(null);

    try {
      const res = await fetchWithAuth(`/api/files/${file.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete document.');
      }

      setDeleteSuccess(true);
      setTimeout(() => {
        onDeleted?.(file.id);
        onClose();
      }, 500);
    } catch (err: any) {
      setDeleteError(err?.message || 'Failed to delete document.');
      setIsDeleting(false);
    }
  };

  // Sync / probe file size if not available
  useEffect(() => {
    setResolvedFileSize(file?.fileSize);
    if (!file) return;

    if (!file.fileSize || file.fileSize <= 0) {
      fetch(file.cloudinaryUrl, { method: 'HEAD' })
        .then((res) => {
          const len = res.headers.get('content-length');
          if (len) {
            const parsed = parseInt(len, 10);
            if (!isNaN(parsed) && parsed > 0) {
              setResolvedFileSize(parsed);
            }
          }
        })
        .catch(() => {
          // ignore HEAD errors gracefully
        });
    }
  }, [file]);

  // Fullscreen change listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Lock background scroll when modal is open
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  // Fetch PDF as authenticated blob so the iframe can display it
  useEffect(() => {
    if (!file || file.fileType !== 'pdf') return;

    let objectUrl: string | null = null;
    setPdfLoading(true);
    setPdfError(null);
    setPdfBlobUrl(null);

    fetchWithAuth(`/api/files/${file.id}/raw`)
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body?.error || `Failed to load PDF (${res.status})`);
        }
        return res.blob();
      })
      .then((blob) => {
        objectUrl = URL.createObjectURL(blob);
        setPdfBlobUrl(objectUrl);
      })
      .catch((err) => {
        setPdfError(err?.message || 'Could not load PDF.');
      })
      .finally(() => {
        setPdfLoading(false);
      });

    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file?.id]);

  // Fetch text/csv content if needed
  useEffect(() => {
    if (!file) return;

    if (file.fileType === 'txt' || file.fileType === 'csv' || file.fileType === 'html') {
      setLoadingContent(true);
      setContentError(null);

      fetch(file.cloudinaryUrl)
        .then(async (res) => {
          if (!res.ok) {
            throw new Error(`Failed to load file content (${res.status})`);
          }
          const len = res.headers.get('content-length');
          if (len) {
            const parsed = parseInt(len, 10);
            if (!isNaN(parsed) && parsed > 0) {
              setResolvedFileSize((prev) => prev || parsed);
            }
          }
          return res.text();
        })
        .then((text) => {
          if (file.fileType === 'txt') {
            setTextContent(text);
          } else if (file.fileType === 'csv') {
            const parsed = Papa.parse<string[]>(text, {
              skipEmptyLines: true,
            });
            setCsvData(parsed.data || []);
          } else if (file.fileType === 'html') {
            setTextContent(text);
          }
          setResolvedFileSize((prev) => prev || new Blob([text]).size);
        })
        .catch((err) => {
          console.error('Error fetching file content:', err);
          setContentError(err?.message || 'Could not display inline content.');
        })
        .finally(() => {
          setLoadingContent(false);
        });
    }
  }, [file]);

  if (!file) return null;

  const toggleFullscreen = async () => {
    if (!containerRef.current) return;

    try {
      if (!document.fullscreenElement) {
        await containerRef.current.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (err) {
      console.error('Fullscreen toggle failed:', err);
    }
  };

  const increaseFontSize = () => {
    setFontSize((prev) => Math.min(prev + 2, 36));
  };

  const decreaseFontSize = () => {
    setFontSize((prev) => Math.max(prev - 2, 11));
  };

  const resetFontSize = () => {
    setFontSize(16);
  };

  const isTextFormat = ['txt', 'csv', 'html'].includes(file.fileType);

  const getFileBadge = (type: string) => {
    switch (type) {
      case 'pdf':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <FileIcon className="w-3.5 h-3.5" /> PDF
          </span>
        );
      case 'image':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <FileImage className="w-3.5 h-3.5" /> Image
          </span>
        );
      case 'txt':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <FileText className="w-3.5 h-3.5" /> Text
          </span>
        );
      case 'csv':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <FileSpreadsheet className="w-3.5 h-3.5" /> CSV
          </span>
        );
      case 'html':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <FileCode className="w-3.5 h-3.5" /> HTML
          </span>
        );
      default:
        return null;
    }
  };

  // Safe sandboxed HTML document preparation with theme & typography styling
  const buildSandboxedHtmlDoc = () => {
    const bgColor = readerTheme === 'dark' ? '#090d16' : '#ffffff';
    const fgColor = readerTheme === 'dark' ? '#e2e8f0' : '#0f172a';
    const linkColor = readerTheme === 'dark' ? '#60a5fa' : '#2563eb';

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <style>
            body {
              background-color: ${bgColor};
              color: ${fgColor};
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
              font-size: ${fontSize}px;
              line-height: 1.6;
              padding: 24px;
              margin: 0;
              transition: background-color 0.2s, color 0.2s;
            }
            a { color: ${linkColor}; }
            pre, code {
              background: ${readerTheme === 'dark' ? '#1e293b' : '#f1f5f9'};
              padding: 4px 8px;
              border-radius: 4px;
              font-family: monospace;
            }
            table {
              border-collapse: collapse;
              width: 100%;
            }
            th, td {
              border: 1px solid ${readerTheme === 'dark' ? '#334155' : '#cbd5e1'};
              padding: 8px 12px;
            }
          </style>
        </head>
        <body>
          ${textContent}
        </body>
      </html>
    `;
  };

  const displaySize = formatFileSize(resolvedFileSize ?? file.fileSize);

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-2 sm:p-4 bg-slate-950/70 backdrop-blur-xl animate-in fade-in duration-200">
      <div
        ref={containerRef}
        className={`w-full flex flex-col rounded-2xl overflow-hidden shadow-2xl transition-all duration-300 ${
          showDeleteConfirm ? 'filter blur-md pointer-events-none select-none scale-[0.99] opacity-75' : ''
        } ${
          isFullscreen
            ? 'h-screen w-screen rounded-none'
            : 'max-w-6xl h-[92vh]'
        } ${
          readerTheme === 'dark'
            ? 'bg-slate-950 text-slate-100 border border-slate-800'
            : 'bg-white text-slate-900 border border-slate-200'
        }`}
      >
        {/* Reader Navigation & Controls Toolbar */}
        <div
          className={`flex items-center justify-between px-4 sm:px-6 py-3 border-b shrink-0 transition-colors gap-3 overflow-hidden ${
            readerTheme === 'dark'
              ? 'bg-slate-900/90 border-slate-800 text-slate-200'
              : 'bg-slate-100/90 border-slate-200 text-slate-800'
          }`}
        >
          {/* File Info Title */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1 overflow-hidden">
            <div className="shrink-0">{getFileBadge(file.fileType)}</div>
            <h3
              className="font-semibold text-sm sm:text-base truncate min-w-0"
              title={file.originalName}
            >
              {file.originalName}
            </h3>
          </div>

          {/* Controls Bar - Locked from shrinking or overlapping */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 ml-auto">
            {/* Font Size Controls (For text, csv, html) */}
            {isTextFormat && (
              <div
                className={`flex items-center gap-1 px-1.5 sm:px-2 py-1 rounded-xl border shrink-0 ${
                  readerTheme === 'dark'
                    ? 'bg-slate-950/80 border-slate-800'
                    : 'bg-white border-slate-200 shadow-sm'
                }`}
              >
                <button
                  onClick={decreaseFontSize}
                  title="Decrease Font Size"
                  className="p-1 rounded-lg hover:bg-slate-800/20 text-slate-400 hover:text-white transition-colors shrink-0"
                >
                  <ZoomOut className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>
                <span className="text-xs font-mono px-1 font-medium text-slate-400 shrink-0">
                  {fontSize}px
                </span>
                <button
                  onClick={increaseFontSize}
                  title="Increase Font Size"
                  className="p-1 rounded-lg hover:bg-slate-800/20 text-slate-400 hover:text-white transition-colors shrink-0"
                >
                  <ZoomIn className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>
              </div>
            )}

            {/* Theme Toggle Button */}
            <button
              onClick={() => setReaderTheme(readerTheme === 'dark' ? 'light' : 'dark')}
              title={`Switch to ${readerTheme === 'dark' ? 'Light' : 'Dark'} theme`}
              className={`p-2 rounded-xl border transition-all shrink-0 ${
                readerTheme === 'dark'
                  ? 'bg-slate-950/80 border-slate-800 hover:border-slate-700 text-amber-400'
                  : 'bg-white border-slate-200 hover:border-slate-300 text-indigo-600 shadow-sm'
              }`}
            >
              {readerTheme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Fullscreen Toggle */}
            <button
              onClick={toggleFullscreen}
              title={isFullscreen ? 'Exit Full Screen' : 'Full Screen'}
              className={`p-2 rounded-xl border transition-all shrink-0 ${
                readerTheme === 'dark'
                  ? 'bg-slate-950/80 border-slate-800 hover:border-slate-700 text-slate-300'
                  : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700 shadow-sm'
              }`}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            <div className="h-4 w-px bg-slate-700/60 shrink-0 mx-0.5" />

            {/* Delete Document Button */}
            <button
              onClick={() => setShowDeleteConfirm(true)}
              title="Delete this document"
              className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 border border-rose-500/25 transition-all shrink-0"
            >
              <Trash2 className="w-4 h-4" />
            </button>

            {/* Close Modal */}
            <button
              onClick={onClose}
              title="Close Reader"
              className="p-2 rounded-xl bg-slate-800/60 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 transition-all shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Viewer Body */}
        <div
          className={`flex-1 overflow-auto transition-colors ${
            readerTheme === 'dark' ? 'bg-slate-900/90' : 'bg-slate-50'
          } ${showDeleteConfirm ? 'pointer-events-none select-none' : ''}`}
        >
          {loadingContent && (
            <div className="flex flex-col items-center justify-center h-full min-h-[400px] gap-3">
              <div className="w-8 h-8 border-3 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
              <p className="text-sm text-slate-400">Loading document content...</p>
            </div>
          )}

          {contentError && (
            <div className="flex flex-col items-center justify-center h-full min-h-[400px] p-6 text-center">
              <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl max-w-md">
                <p className="text-sm text-rose-400 font-medium mb-1">Viewer Error</p>
                <p className="text-xs text-slate-400">{contentError}</p>
              </div>
            </div>
          )}

          {!loadingContent && !contentError && (
            <>
              {/* PDF VIEWER – blob URL fetched with auth token */}
              {file.fileType === 'pdf' && (
                <div className="w-full h-full min-h-[500px] flex items-center justify-center">
                  {pdfLoading && (
                    <div className="flex flex-col items-center gap-3 text-slate-400">
                      <svg className="animate-spin w-8 h-8" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      <span className="text-sm">Loading PDF…</span>
                    </div>
                  )}
                  {pdfError && (
                    <div className="flex flex-col items-center gap-2 text-red-400 px-6 text-center">
                      <AlertTriangle className="w-8 h-8" />
                      <p className="text-sm font-medium">{pdfError}</p>
                    </div>
                  )}
                  {pdfBlobUrl && !pdfError && (
                    <iframe
                      src={`${pdfBlobUrl}#toolbar=0&navpanes=0`}
                      className="w-full h-full border-0"
                      title={file.originalName}
                    />
                  )}
                </div>
              )}

              {/* IMAGE VIEWER */}
              {file.fileType === 'image' && (
                <div className="w-full h-full flex items-center justify-center p-4 sm:p-8 select-none">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={file.cloudinaryUrl}
                    alt={file.originalName}
                    className="max-h-[82vh] max-w-full object-contain rounded-xl shadow-lg"
                    onContextMenu={(e) => e.preventDefault()}
                  />
                </div>
              )}

              {/* TXT VIEWER */}
              {file.fileType === 'txt' && (
                <div className="p-6 sm:p-10 max-w-5xl mx-auto">
                  <pre
                    style={{ fontSize: `${fontSize}px`, lineHeight: 1.7 }}
                    className={`font-mono whitespace-pre-wrap break-words rounded-xl p-6 sm:p-8 transition-all ${
                      readerTheme === 'dark'
                        ? 'bg-slate-900/60 border border-slate-800 text-slate-200'
                        : 'bg-white border border-slate-200 text-slate-800 shadow-sm'
                    }`}
                  >
                    {textContent}
                  </pre>
                </div>
              )}

              {/* CSV TABLE VIEWER */}
              {file.fileType === 'csv' && (
                <div className="p-4 sm:p-8 max-w-full overflow-x-auto">
                  {csvData.length === 0 ? (
                    <p className="text-sm text-slate-400 text-center py-12">The CSV file is empty.</p>
                  ) : (
                    <div
                      className={`inline-block min-w-full rounded-xl overflow-hidden border shadow-sm ${
                        readerTheme === 'dark'
                          ? 'border-slate-800 bg-slate-900/70'
                          : 'border-slate-200 bg-white'
                      }`}
                    >
                      <table
                        style={{ fontSize: `${fontSize}px` }}
                        className="min-w-full divide-y divide-slate-800/60 text-left"
                      >
                        <thead
                          className={
                            readerTheme === 'dark'
                              ? 'bg-slate-950/90 text-indigo-400'
                              : 'bg-slate-100 text-indigo-700'
                          }
                        >
                          <tr>
                            {csvData[0]?.map((header, idx) => (
                              <th
                                key={idx}
                                className="px-4 py-3 font-semibold tracking-wider whitespace-nowrap border-b border-slate-700/40"
                              >
                                {header || `Col ${idx + 1}`}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody
                          className={`divide-y ${
                            readerTheme === 'dark' ? 'divide-slate-800/40' : 'divide-slate-100'
                          }`}
                        >
                          {csvData.slice(1).map((row, rowIdx) => (
                            <tr
                              key={rowIdx}
                              className={
                                readerTheme === 'dark'
                                  ? 'hover:bg-slate-800/30 text-slate-300'
                                  : 'hover:bg-slate-50 text-slate-700'
                              }
                            >
                              {row.map((cell, cellIdx) => (
                                <td key={cellIdx} className="px-4 py-2.5 whitespace-nowrap">
                                  {cell}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* HTML VIEWER */}
              {file.fileType === 'html' && (
                <div className="w-full h-full min-h-[500px]">
                  <iframe
                    sandbox="allow-same-origin"
                    srcDoc={buildSandboxedHtmlDoc()}
                    className="w-full h-full border-0"
                    title={file.originalName}
                  />
                </div>
              )}
            </>
          )}
        </div>

        {/* Document Stats & Highlighted Size Bottom Bar */}
        <div
          className={`flex flex-wrap items-center justify-between gap-3 px-4 sm:px-6 py-2.5 border-t text-xs shrink-0 select-none transition-colors ${
            readerTheme === 'dark'
              ? 'bg-slate-900/90 border-slate-800 text-slate-400'
              : 'bg-slate-100/90 border-slate-200 text-slate-600'
          }`}
        >
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-slate-500">File:</span>
              <span className="font-medium text-slate-200 truncate max-w-[160px] sm:max-w-xs">
                {file.originalName}
              </span>
            </div>
            <span className="text-slate-700 hidden sm:inline">•</span>
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500">Type:</span>
              <span className="uppercase font-semibold text-slate-300">{file.fileType}</span>
            </div>
          </div>

          {/* Highlighted Document Size in Footer */}
          {displaySize && (
            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-medium">Document Size:</span>
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-mono font-bold text-xs transition-all ${
                  readerTheme === 'dark'
                    ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30 shadow-[0_0_10px_rgba(245,158,11,0.15)]'
                    : 'bg-amber-500/15 text-amber-900 border border-amber-300'
                }`}
              >
                <HardDrive className="w-3.5 h-3.5 text-amber-400" />
                {displaySize}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Overlay Dialog - Sibling outside containerRef for deep frosted background blur */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-950/65 backdrop-blur-2xl transition-all duration-300 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700/70 p-6 sm:p-7 rounded-2xl max-w-md w-full shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            {deleteSuccess ? (
              <div className="py-6 text-center animate-in fade-in zoom-in-95">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-3 mx-auto">
                  <CheckCircle2 className="w-6 h-6 animate-bounce" />
                </div>
                <h4 className="text-lg font-bold text-white mb-1">Document Deleted</h4>
                <p className="text-xs text-slate-400">Removing from your library...</p>
              </div>
            ) : (
              <>
                <div className="w-12 h-12 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 mb-4 mx-auto shrink-0">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <h4 className="text-lg font-bold text-center text-white mb-1.5">Delete Document?</h4>
                <p className="text-xs text-center text-slate-400 mb-4 leading-relaxed">
                  Are you sure you want to permanently delete this document? This will remove it from both cloud storage and database.
                </p>

                {/* Dedicated File Info Pill - Soft glassmorphism with progress animation */}
                <div
                  className={`relative overflow-hidden p-3.5 rounded-xl mb-5 flex items-center gap-3 min-w-0 transition-all duration-300 ${
                    isDeleting
                      ? 'bg-rose-950/20 border border-rose-500/40'
                      : 'bg-slate-800/60 border border-slate-700/60'
                  }`}
                >
                  <div className="shrink-0">{getFileBadge(file.fileType)}</div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-slate-200 truncate" title={file.originalName}>
                      {file.originalName}
                    </p>
                    {isDeleting ? (
                      <p className="text-[11px] text-rose-400 animate-pulse mt-0.5 font-medium">
                        Deleting from cloud & database...
                      </p>
                    ) : displaySize ? (
                      <p className="text-[11px] text-amber-400 font-mono mt-0.5">
                        Size: {displaySize}
                      </p>
                    ) : null}
                  </div>

                  {isDeleting && (
                    <div className="absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r from-rose-500/20 via-rose-500 to-rose-500/20 animate-pulse" />
                  )}
                </div>

                {deleteError && (
                  <div className="mb-4 p-3 bg-rose-500/15 border border-rose-500/30 rounded-xl text-xs text-rose-300 text-center">
                    {deleteError}
                  </div>
                )}

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    disabled={isDeleting}
                    onClick={() => {
                      setShowDeleteConfirm(false);
                      setDeleteError(null);
                    }}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 hover:text-white transition-all disabled:opacity-50 min-w-[80px]"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={isDeleting}
                    onClick={handleDeleteDocument}
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
