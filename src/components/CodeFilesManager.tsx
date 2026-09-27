'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  Code2,
  FileCode,
  Plus,
  Search,
  Copy,
  Check,
  Save,
  Trash2,
  ArrowLeft,
  Clock,
  AlertTriangle,
  RefreshCw,
  CheckCircle2,
  Maximize2,
  Minimize2,
  AlertCircle,
  UploadCloud,
  Upload,
} from 'lucide-react';

export interface CodeFileItem {
  id: string;
  fileName: string;
  language: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

const COMMON_EXTENSIONS = [
  { ext: '.java', label: 'Java', color: 'text-amber-400 bg-amber-500/10 border-amber-500/30' },
  { ext: '.py', label: 'Python', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' },
  { ext: '.txt', label: 'Text', color: 'text-slate-300 bg-slate-500/10 border-slate-500/30' },
  { ext: '.js', label: 'JavaScript', color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30' },
  { ext: '.ts', label: 'TypeScript', color: 'text-sky-400 bg-sky-500/10 border-sky-500/30' },
  { ext: '.cpp', label: 'C++', color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30' },
  { ext: '.html', label: 'HTML', color: 'text-rose-400 bg-rose-500/10 border-rose-500/30' },
  { ext: '.css', label: 'CSS', color: 'text-blue-400 bg-blue-500/10 border-blue-500/30' },
  { ext: '.json', label: 'JSON', color: 'text-purple-400 bg-purple-500/10 border-purple-500/30' },
];

export default function CodeFilesManager() {
  const { user, fetchWithAuth } = useAuth();
  const [codeFiles, setCodeFiles] = useState<CodeFileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Active file in Code Editor
  const [activeFile, setActiveFile] = useState<CodeFileItem | null>(null);
  const [activeFileName, setActiveFileName] = useState('');
  const [activeContent, setActiveContent] = useState('');
  const [initialSavedContent, setInitialSavedContent] = useState('');
  const [initialSavedFileName, setInitialSavedFileName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Unsaved Changes Confirmation Modal
  const [showUnsavedModal, setShowUnsavedModal] = useState(false);

  // Delete modal
  const [fileToDelete, setFileToDelete] = useState<CodeFileItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Copy feedback
  const [copiedFileId, setCopiedFileId] = useState<string | null>(null);
  const [editorCopied, setEditorCopied] = useState(false);

  // Create file modal / inline
  const [isCreating, setIsCreating] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [isCreatingLoading, setIsCreatingLoading] = useState(false);

  // Drag and Drop & Local Import states
  const [isDraggingOverList, setIsDraggingOverList] = useState(false);
  const [isDraggingOverEditor, setIsDraggingOverEditor] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importNotification, setImportNotification] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

  // Check if there are unsaved changes
  const hasUnsavedChanges =
    activeFile !== null &&
    (activeContent !== initialSavedContent || activeFileName !== initialSavedFileName);

  // Fetch all user code files
  const fetchCodeFiles = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchWithAuth('/api/code-files');
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch code files.');
      }
      setCodeFiles(data.files || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error loading code files.');
    } finally {
      setLoading(false);
    }
  }, [fetchWithAuth]);

  // Initial load
  useEffect(() => {
    let isMounted = true;
    const loadFiles = async () => {
      try {
        const res = await fetchWithAuth('/api/code-files');
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Failed to fetch code files.');
        }
        if (isMounted) {
          setCodeFiles(data.files || []);
          setLoading(false);
        }
      } catch (err: unknown) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Error loading code files.');
          setLoading(false);
        }
      }
    };

    loadFiles();
    return () => {
      isMounted = false;
    };
  }, [fetchWithAuth]);

  // Fullscreen change listener
  useEffect(() => {
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [isFullscreen]);

  // Escape key listener for fullscreen
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        if (document.fullscreenElement) {
          document.exitFullscreen().catch(() => {});
        }
        setIsFullscreen(false);
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isFullscreen]);

  // Open file in Editor
  const handleOpenFile = (file: CodeFileItem) => {
    setActiveFile(file);
    setActiveFileName(file.fileName);
    setActiveContent(file.content || '');
    setInitialSavedContent(file.content || '');
    setInitialSavedFileName(file.fileName);
    setSaveSuccessMessage(null);
  };

  // Toggle fullscreen
  const toggleFullscreen = async () => {
    if (!isFullscreen) {
      setIsFullscreen(true);
      try {
        if (editorContainerRef.current?.requestFullscreen) {
          await editorContainerRef.current.requestFullscreen();
        }
      } catch (e) {
        console.warn('Native requestFullscreen unavailable:', e);
      }
    } else {
      setIsFullscreen(false);
      try {
        if (document.fullscreenElement) {
          await document.exitFullscreen();
        }
      } catch (e) {
        console.warn('Exit fullscreen warning:', e);
      }
    }
  };

  // Manual Save Function (ONLY SAVES WHEN CLICKED)
  const handleSaveFile = useCallback(async (showNotification = true): Promise<boolean> => {
    if (!activeFile) return false;
    setIsSaving(true);

    const nameToSave = activeFileName.trim() || activeFile.fileName;
    const contentToSave = activeContent;

    try {
      const res = await fetchWithAuth(`/api/code-files/${activeFile.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: nameToSave,
          content: contentToSave,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to save code file.');
      }

      const updated = data.file;
      setActiveFile(updated);
      setActiveFileName(updated.fileName);
      setActiveContent(updated.content);
      setInitialSavedContent(updated.content);
      setInitialSavedFileName(updated.fileName);

      // Update in local file list
      setCodeFiles((prev) =>
        prev.map((f) => (f.id === updated.id ? updated : f))
      );

      if (showNotification) {
        setSaveSuccessMessage('File saved successfully!');
        setTimeout(() => setSaveSuccessMessage(null), 2500);
      }
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save code file.';
      alert(msg);
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [activeFile, activeFileName, activeContent, fetchWithAuth]);

  // Back button handler: Check if unsaved
  const handleBackRequest = () => {
    if (hasUnsavedChanges) {
      setShowUnsavedModal(true);
    } else {
      handleExitEditor();
    }
  };

  // Safe Exit editor
  const handleExitEditor = () => {
    if (isFullscreen) {
      setIsFullscreen(false);
      try {
        if (document.fullscreenElement) {
          document.exitFullscreen().catch(() => {});
        }
      } catch {
        // ignore
      }
    }
    setActiveFile(null);
    setShowUnsavedModal(false);
    fetchCodeFiles();
  };

  // Unsaved Modal Actions
  const handleDiscardAndExit = () => {
    handleExitEditor();
  };

  const handleSaveAndExit = async () => {
    const saved = await handleSaveFile(false);
    if (saved) {
      handleExitEditor();
    }
  };

  // Keyboard shortcut Ctrl+S / Cmd+S
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        if (activeFile) {
          e.preventDefault();
          handleSaveFile(true);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeFile, handleSaveFile]);

  // Process and upload local files from drag-and-drop or file picker
  const processLocalFiles = async (files: FileList | File[]) => {
    if (!files || files.length === 0) return;
    setIsImporting(true);
    setError(null);
    let importedCount = 0;
    let lastImportedFile: CodeFileItem | null = null;

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.size > 10 * 1024 * 1024) {
          alert(`File "${file.name}" exceeds the 10MB limit.`);
          continue;
        }

        const textContent = await file.text();

        const res = await fetchWithAuth('/api/code-files', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileName: file.name,
            content: textContent,
          }),
        });

        const data = await res.json();
        if (res.ok && data.file) {
          importedCount++;
          lastImportedFile = data.file;
        }
      }

      await fetchCodeFiles();

      if (importedCount === 1 && lastImportedFile) {
        setImportNotification(`Imported "${lastImportedFile.fileName}" from local storage!`);
        handleOpenFile(lastImportedFile);
      } else if (importedCount > 1) {
        setImportNotification(`Successfully imported ${importedCount} files from local storage!`);
      }
      setTimeout(() => setImportNotification(null), 4000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to import local file.';
      setError(msg);
    } finally {
      setIsImporting(false);
    }
  };

  // Handle file drop directly on the Code Editor
  const handleDropOnEditor = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOverEditor(false);
    if (!e.dataTransfer?.files || e.dataTransfer.files.length === 0) return;

    const file = e.dataTransfer.files[0];
    try {
      const text = await file.text();
      setActiveContent(text);
      if (file.name && !activeFileName.includes('.')) {
        setActiveFileName(file.name);
      }
      setSaveSuccessMessage(`Loaded "${file.name}" into editor. Click Save to store.`);
      setTimeout(() => setSaveSuccessMessage(null), 4000);
    } catch (err) {
      console.error('Failed to read dropped file:', err);
    }
  };

  // Create new code file manually
  const handleCreateFile = async (customName?: string) => {
    setIsCreatingLoading(true);
    try {
      let finalName = customName?.trim();
      if (!finalName) {
        finalName = `Main_${codeFiles.length + 1}.java`;
      }

      const res = await fetchWithAuth('/api/code-files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: finalName, content: '' }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create code file.');
      }

      setIsCreating(false);
      setNewFileName('');
      await fetchCodeFiles();
      if (data.file) {
        handleOpenFile(data.file);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create file.';
      alert(msg);
    } finally {
      setIsCreatingLoading(false);
    }
  };

  // Copy code content
  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(activeContent);
      setEditorCopied(true);
      setTimeout(() => setEditorCopied(false), 2000);
    } catch {
      if (textareaRef.current) {
        textareaRef.current.select();
        document.execCommand('copy');
        setEditorCopied(true);
        setTimeout(() => setEditorCopied(false), 2000);
      }
    }
  };

  // Confirm delete code file
  const handleConfirmDelete = async () => {
    if (!fileToDelete) return;
    setIsDeleting(true);

    try {
      const res = await fetchWithAuth(`/api/code-files/${fileToDelete.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete code file.');
      }

      const deletedId = fileToDelete.id;
      setCodeFiles((prev) => prev.filter((f) => f.id !== deletedId));

      if (activeFile?.id === deletedId) {
        handleExitEditor();
      }

      setFileToDelete(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error deleting code file.';
      alert(msg);
    } finally {
      setIsDeleting(false);
    }
  };

  // Support Tab key inside the code textarea (inserts 2 spaces)
  const handleKeyDownInTextarea = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const textarea = textareaRef.current;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const value = textarea.value;

      const newContent = value.substring(0, start) + '  ' + value.substring(end);
      setActiveContent(newContent);

      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + 2;
        }
      }, 0);
    }
  };

  // Filter code files by search query
  const filteredFiles = codeFiles.filter((f) => {
    const q = searchQuery.toLowerCase();
    return (
      f.fileName.toLowerCase().includes(q) ||
      (f.content && f.content.toLowerCase().includes(q)) ||
      (f.language && f.language.toLowerCase().includes(q))
    );
  });

  const getLanguageBadge = (fileName: string) => {
    const ext = '.' + (fileName.split('.').pop()?.toLowerCase() || '');
    const found = COMMON_EXTENSIONS.find((e) => e.ext === ext);
    if (found) {
      return (
        <span
          className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${found.color}`}
        >
          {found.label}
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border text-indigo-400 bg-indigo-500/10 border-indigo-500/30">
        {ext ? ext.slice(1) : 'CODE'}
      </span>
    );
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

  const lineCount = activeContent ? activeContent.split('\n').length : 1;
  const charCount = activeContent.length;

  return (
    <>
      {/* Hidden Native File Input for local machine browsing */}
      <input
        type="file"
        ref={importInputRef}
        onChange={(e) => {
          if (e.target.files) processLocalFiles(e.target.files);
          e.target.value = '';
        }}
        multiple
        accept=".java,.py,.python,.txt,.js,.jsx,.ts,.tsx,.cpp,.c,.h,.hpp,.cs,.html,.htm,.css,.json,.sql,.sh,.bash,.md"
        className="hidden"
      />

      {/* VIEW 1: CODE EDITOR (NO AUTO-SAVE, EXPLICIT SAVE BUTTON) */}
      {activeFile ? (
        <div
          ref={editorContainerRef}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDraggingOverEditor(true);
          }}
          onDragLeave={() => setIsDraggingOverEditor(false)}
          onDrop={handleDropOnEditor}
          className={
            isFullscreen
              ? 'fixed inset-0 z-50 bg-slate-950 flex flex-col h-screen w-screen overflow-hidden'
              : 'max-w-5xl mx-auto animate-in fade-in duration-200 relative'
          }
        >
          {/* Drop Overlay when dragging file directly over editor */}
          {isDraggingOverEditor && (
            <div className="absolute inset-0 z-50 bg-cyan-950/80 backdrop-blur-sm border-2 border-dashed border-cyan-400 rounded-2xl flex flex-col items-center justify-center pointer-events-none animate-in fade-in">
              <UploadCloud className="w-12 h-12 text-cyan-400 animate-bounce mb-2" />
              <p className="text-base font-bold text-white">Drop file to load code into editor</p>
              <p className="text-xs text-cyan-300">File will be loaded into the workspace</p>
            </div>
          )}

          <div
            className={
              isFullscreen
                ? 'flex-1 bg-slate-950 flex flex-col h-full w-full'
                : 'bg-slate-900/90 border border-slate-800 backdrop-blur-md rounded-2xl shadow-xl overflow-hidden flex flex-col min-h-[640px]'
            }
          >
            {/* Editor Top Navigation Header */}
            <div className="p-3 sm:p-4 border-b border-slate-800 bg-slate-950/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                {/* Back Button -> Triggers Unsaved Changes Modal if modified */}
                <button
                  type="button"
                  onClick={handleBackRequest}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all flex items-center gap-1.5 text-xs font-semibold shrink-0"
                  title="Back to code files"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span className="hidden xs:inline">All Code</span>
                </button>

                {/* File Name & Language */}
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
                    <FileCode className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={activeFileName}
                    onChange={(e) => setActiveFileName(e.target.value)}
                    placeholder="FileName (e.g. Main.java, app.py, notes.txt)"
                    className="bg-transparent font-mono text-sm sm:text-base font-semibold text-white border-b border-transparent hover:border-slate-700 focus:border-indigo-500 px-1 py-0.5 outline-none rounded transition-all max-w-[200px] sm:max-w-xs truncate"
                  />
                  <div className="shrink-0">{getLanguageBadge(activeFileName)}</div>
                </div>
              </div>

              {/* Action Buttons: Save (Manual Only!), Copy, Full Mode, Delete */}
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                {/* Copy Code */}
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className={`px-2.5 sm:px-3 py-1.5 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition-all ${
                    editorCopied
                      ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                      : 'bg-slate-800/80 hover:bg-slate-800 border-slate-700/80 text-slate-300 hover:text-white'
                  }`}
                  title="Copy code"
                >
                  {editorCopied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Copy</span>
                    </>
                  )}
                </button>

                {/* Fullscreen Toggle */}
                <button
                  type="button"
                  onClick={toggleFullscreen}
                  className={`px-2.5 sm:px-3 py-1.5 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition-all ${
                    isFullscreen
                      ? 'bg-indigo-600/30 border-indigo-500 text-indigo-300'
                      : 'bg-slate-800/80 hover:bg-slate-800 border-slate-700/80 text-slate-300 hover:text-white'
                  }`}
                  title={isFullscreen ? 'Exit Full Screen' : 'Full Screen'}
                >
                  {isFullscreen ? (
                    <>
                      <Minimize2 className="w-3.5 h-3.5 text-indigo-400" />
                      <span className="hidden xs:inline">Exit Full</span>
                    </>
                  ) : (
                    <>
                      <Maximize2 className="w-3.5 h-3.5 text-indigo-400" />
                      <span className="hidden xs:inline">Full Mode</span>
                    </>
                  )}
                </button>

                {/* MANUAL SAVE BUTTON (NO AUTO SAVE!) */}
                <button
                  type="button"
                  onClick={() => handleSaveFile(true)}
                  disabled={isSaving}
                  className={`px-3.5 sm:px-4 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-md transition-all ${
                    hasUnsavedChanges
                      ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/25 ring-2 ring-indigo-500/50'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                  }`}
                  title="Save file changes (Ctrl+S / Cmd+S)"
                >
                  {isSaving ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Save className="w-3.5 h-3.5" />
                  )}
                  <span>{isSaving ? 'Saving...' : 'Save File'}</span>
                </button>

                {/* Delete File */}
                <button
                  type="button"
                  onClick={() => setFileToDelete(activeFile)}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border border-slate-700 transition-all"
                  title="Delete code file"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Status Bar */}
            <div className="px-4 py-2 bg-slate-950/60 border-b border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400 font-mono shrink-0">
              <div className="flex items-center gap-3">
                <span>{lineCount} lines</span>
                <span>•</span>
                <span>{charCount} chars</span>
                <span className="hidden sm:inline">•</span>
                <span className="hidden sm:inline text-indigo-400">Manual Save Mode</span>
              </div>
              <div>
                {saveSuccessMessage ? (
                  <span className="text-emerald-400 font-medium flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> {saveSuccessMessage}
                  </span>
                ) : hasUnsavedChanges ? (
                  <span className="text-amber-400 font-semibold flex items-center gap-1 animate-pulse">
                    <AlertCircle className="w-3.5 h-3.5" /> Unsaved changes
                  </span>
                ) : (
                  <span className="text-emerald-400/80 font-medium flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" /> Saved
                  </span>
                )}
              </div>
            </div>

            {/* Code Textarea Area */}
            <div className={`flex-1 flex flex-col bg-slate-950/80 overflow-hidden ${isFullscreen ? 'p-4 sm:p-8' : 'p-3 sm:p-5'}`}>
              <textarea
                ref={textareaRef}
                value={activeContent}
                onChange={(e) => setActiveContent(e.target.value)}
                onKeyDown={handleKeyDownInTextarea}
                placeholder="// Write or paste your code here (e.g. Java, Python, C++, Text)...&#10;// Drag & drop any code file here to load it from your computer.&#10;// Remember to click 'Save File' or press Ctrl+S to save your changes."
                spellCheck={false}
                className="flex-1 w-full bg-transparent text-slate-100 placeholder-slate-600 font-mono text-xs sm:text-sm leading-relaxed resize-none outline-none focus:ring-0 min-h-[460px]"
                autoFocus
              />
            </div>

            {/* Quick Footer Tips */}
            <div className="p-2.5 bg-slate-950/95 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500 shrink-0 font-mono">
              <div className="flex items-center gap-2">
                <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 text-[10px]">Ctrl+S</span>
                <span>to save</span>
                <span className="text-slate-700">|</span>
                <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 text-[10px]">Tab</span>
                <span>indents 2 spaces</span>
              </div>
              <span className="text-amber-400/80">⚠️ Auto-save disabled</span>
            </div>
          </div>
        </div>
      ) : (
        /* VIEW 2: CODE FILES EXPLORER */
        <div className="max-w-4xl mx-auto">
          <div className="bg-slate-900/80 border border-slate-800 backdrop-blur-md rounded-2xl p-4 sm:p-6 md:p-8 shadow-xl">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shrink-0">
                  <Code2 className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg sm:text-xl font-semibold text-white">Code Files</h2>
                    <span className="px-2 py-0.5 rounded-full bg-slate-800 text-[11px] font-mono text-slate-300 border border-slate-700">
                      {user?.username}
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                    {codeFiles.length} code file{codeFiles.length === 1 ? '' : 's'} stored (.java, .py, .txt, etc.)
                  </p>
                </div>
              </div>

              {/* Action Buttons: Refresh, New Code File */}
              <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                <button
                  onClick={() => fetchCodeFiles()}
                  disabled={loading}
                  title="Refresh code files"
                  className="p-2 sm:p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white transition-all disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
                </button>

                {/* New Code File Button */}
                <button
                  onClick={() => setIsCreating(true)}
                  className="px-4 py-2 sm:py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold rounded-xl shadow-md shadow-cyan-600/20 flex items-center gap-1.5 transition-all"
                >
                  <Plus className="w-4 h-4" />
                  <span>New Code File</span>
                </button>
              </div>
            </div>

            {/* Notification Banner */}
            {importNotification && (
              <div className="mb-5 p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-xs flex items-center gap-2 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{importNotification}</span>
              </div>
            )}

            {/* Error Banner */}
            {error && (
              <div className="mb-5 p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-xs">
                {error}
              </div>
            )}

            {/* Drag and Drop Zone from Local Storage */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDraggingOverList(true);
              }}
              onDragLeave={() => setIsDraggingOverList(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDraggingOverList(false);
                if (e.dataTransfer?.files) {
                  processLocalFiles(e.dataTransfer.files);
                }
              }}
              onClick={() => importInputRef.current?.click()}
              className={`p-4 sm:p-5 rounded-2xl border-2 border-dashed cursor-pointer transition-all duration-200 text-center mb-6 flex flex-col items-center justify-center gap-1.5 ${
                isDraggingOverList
                  ? 'border-cyan-400 bg-cyan-500/15 scale-[1.01] shadow-lg shadow-cyan-500/10'
                  : 'border-slate-800 hover:border-slate-700 bg-slate-950/40 hover:bg-slate-950/70'
              }`}
            >
              <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 mb-0.5">
                <UploadCloud className="w-5 h-5" />
              </div>
              <p className="text-xs sm:text-sm font-medium text-slate-200">
                Drag & drop files from your computer or <span className="text-cyan-400 underline underline-offset-2">browse local storage</span>
              </p>
              <p className="text-[11px] text-slate-500">
                Supports .java, .python (.py), .txt, .js, .ts, .cpp, .c, .html, and others
              </p>
            </div>

            {/* Create Code File Bar */}
            {isCreating && (
              <div className="mb-6 p-4 bg-slate-950/70 border border-cyan-500/30 rounded-xl animate-in fade-in duration-150">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-cyan-300 flex items-center gap-1.5">
                    <FileCode className="w-3.5 h-3.5" /> Create New Code File
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Supports .java, .py, .txt, .js, .cpp, .html, etc.
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mb-3">
                  <input
                    type="text"
                    value={newFileName}
                    onChange={(e) => setNewFileName(e.target.value)}
                    placeholder="e.g. Solution.java, script.py, notes.txt"
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 font-mono text-xs sm:text-sm text-white placeholder-slate-500 outline-none focus:border-cyan-500 transition-all"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleCreateFile(newFileName);
                      if (e.key === 'Escape') setIsCreating(false);
                    }}
                  />
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsCreating(false)}
                      className="flex-1 sm:flex-initial px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300 transition-all"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={isCreatingLoading}
                      onClick={() => handleCreateFile(newFileName)}
                      className="flex-1 sm:flex-initial px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-xs font-semibold text-white shadow-md transition-all flex items-center justify-center gap-1.5"
                    >
                      {isCreatingLoading ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Plus className="w-3.5 h-3.5" />
                      )}
                      <span>Create & Edit</span>
                    </button>
                  </div>
                </div>

                {/* Quick Extension Presets */}
                <div className="flex items-center gap-1.5 flex-wrap pt-1 text-xs">
                  <span className="text-[11px] text-slate-500 mr-1">Quick pick:</span>
                  {COMMON_EXTENSIONS.map((item) => (
                    <button
                      key={item.ext}
                      type="button"
                      onClick={() => {
                        const base = newFileName.includes('.')
                          ? newFileName.split('.')[0]
                          : newFileName || 'code';
                        setNewFileName(base + item.ext);
                      }}
                      className="px-2 py-0.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-[11px] font-mono text-slate-300 hover:text-white transition-all"
                    >
                      {item.ext}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Search */}
            {codeFiles.length > 0 && (
              <div className="mb-5 relative">
                <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search code files by name, language, or content..."
                  className="w-full bg-slate-950/50 border border-slate-800/80 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-slate-700 transition-all font-mono"
                />
              </div>
            )}

            {/* Loading */}
            {loading && codeFiles.length === 0 ? (
              <div className="py-16 text-center">
                <div className="w-8 h-8 border-3 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin mx-auto mb-3" />
                <p className="text-sm text-slate-400">Loading code files...</p>
              </div>
            ) : codeFiles.length === 0 ? (
              /* Empty State */
              <div className="py-12 sm:py-16 px-4 text-center border-2 border-dashed border-slate-800 rounded-2xl">
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-slate-800/80 flex items-center justify-center text-slate-500 mx-auto mb-3">
                  <FileCode className="w-6 h-6 sm:w-7 sm:h-7 text-cyan-400" />
                </div>
                <h3 className="text-sm sm:text-base font-medium text-white mb-1">No code files yet</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto mb-5">
                  Create a coding file or drag & drop files from your computer (.java, .python, .txt, etc.).
                </p>
                <div className="flex items-center justify-center gap-2">
                  <button
                    onClick={() => importInputRef.current?.click()}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold rounded-xl shadow-md transition-all inline-flex items-center gap-1.5"
                  >
                    <Upload className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Import File</span>
                  </button>
                  <button
                    onClick={() => handleCreateFile('Main.java')}
                    className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold rounded-xl shadow-md transition-all inline-flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Create Main.java</span>
                  </button>
                </div>
              </div>
            ) : filteredFiles.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400">
                No files matching &ldquo;{searchQuery}&rdquo;
              </div>
            ) : (
              /* Code Files Grid */
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {filteredFiles.map((file) => {
                  const lineCountPreview = file.content ? file.content.split('\n').length : 0;
                  const charCountPreview = (file.content || '').length;
                  const previewSnippet = file.content
                    ? file.content.slice(0, 100) + (file.content.length > 100 ? '...' : '')
                    : '// Empty code file';

                  return (
                    <div
                      key={file.id}
                      onClick={() => handleOpenFile(file)}
                      className="group relative p-4 bg-slate-950/60 hover:bg-slate-900 border border-slate-800/80 hover:border-cyan-500/40 rounded-xl cursor-pointer transition-all duration-200 flex flex-col justify-between hover:shadow-lg hover:shadow-cyan-500/5 min-h-[140px]"
                    >
                      <div>
                        {/* Header */}
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-7 h-7 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shrink-0 group-hover:scale-105 transition-transform">
                              <FileCode className="w-3.5 h-3.5" />
                            </div>
                            <h4 className="text-sm font-semibold font-mono text-white truncate max-w-[170px] sm:max-w-[140px]">
                              {file.fileName}
                            </h4>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                            {getLanguageBadge(file.fileName)}
                            {/* Copy content */}
                            <button
                              type="button"
                              onClick={async (e) => {
                                e.stopPropagation();
                                await navigator.clipboard.writeText(file.content || '');
                                setCopiedFileId(file.id);
                                setTimeout(() => setCopiedFileId(null), 2000);
                              }}
                              title="Copy code"
                              className="p-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-800 text-slate-400 hover:text-white transition-all"
                            >
                              {copiedFileId === file.id ? (
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                            {/* Delete file */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setFileToDelete(file);
                              }}
                              title="Delete file"
                              className="p-1.5 rounded-lg bg-slate-800/60 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-all"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Code preview snippet */}
                        <pre className="text-[11px] font-mono text-slate-400 line-clamp-3 mb-3 bg-slate-950/70 p-2 rounded-lg border border-slate-800/60 overflow-hidden leading-relaxed">
                          {previewSnippet}
                        </pre>
                      </div>

                      {/* Footer */}
                      <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-500 font-mono">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDate(file.updatedAt)}
                        </span>
                        <span>
                          {lineCountPreview} lines • {charCountPreview} chars
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* UNSAVED CHANGES MODAL: Shown if user clicks back without saving */}
      {showUnsavedModal && activeFile && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
          <div className="bg-slate-900 border border-amber-500/40 p-6 rounded-2xl max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-4 mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h4 className="text-base sm:text-lg font-bold text-center text-white mb-1.5">
              Unsaved Changes!
            </h4>
            <p className="text-xs sm:text-sm text-center text-slate-300 mb-2">
              You have unsaved changes in <span className="text-cyan-400 font-mono font-semibold">{activeFileName}</span>.
            </p>
            <p className="text-xs text-center text-slate-400 mb-6">
              Auto-save is disabled in Code Files. If you leave now without saving, your recent edits will be lost.
            </p>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2.5">
              {/* Cancel / Keep Editing */}
              <button
                type="button"
                onClick={() => setShowUnsavedModal(false)}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition-all text-center"
              >
                Keep Editing
              </button>

              {/* Discard & Leave */}
              <button
                type="button"
                onClick={handleDiscardAndExit}
                className="px-3.5 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-xs font-semibold transition-all text-center"
              >
                Discard & Exit
              </button>

              {/* Save & Leave */}
              <button
                type="button"
                onClick={handleSaveAndExit}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/25 transition-all text-center flex items-center justify-center gap-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save & Exit</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL: Works from both Editor & File List */}
      {fileToDelete && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700/80 p-6 rounded-2xl max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="w-11 h-11 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 mb-3 mx-auto">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h4 className="text-base font-bold text-center text-white mb-1">Delete Code File?</h4>
            <p className="text-xs text-center text-slate-400 mb-4">
              Are you sure you want to delete <span className="text-cyan-400 font-mono font-semibold">{fileToDelete.fileName}</span>? This action cannot be undone.
            </p>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setFileToDelete(null)}
                className="flex-1 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="flex-1 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-semibold text-white shadow-md transition-all flex items-center justify-center gap-1.5"
              >
                {isDeleting ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
                <span>Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
