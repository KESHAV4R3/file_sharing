'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  Folder,
  FolderOpen,
  FileText,
  Plus,
  Search,
  Copy,
  Check,
  ClipboardPaste,
  Save,
  Trash2,
  ArrowLeft,
  Clock,
  AlertTriangle,
  RefreshCw,
  CheckCircle2,
  FileEdit,
  Maximize2,
  Minimize2,
} from 'lucide-react';

export interface NoteItem {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export default function NotesManager() {
  const { user, fetchWithAuth } = useAuth();
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Active note in editor
  const [activeNote, setActiveNote] = useState<NoteItem | null>(null);
  const [activeTitle, setActiveTitle] = useState('');
  const [activeContent, setActiveContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Copy / Paste feedback
  const [copiedNoteId, setCopiedNoteId] = useState<string | null>(null);
  const [editorCopied, setEditorCopied] = useState(false);
  const [editorPasted, setEditorPasted] = useState(false);

  // Delete modal
  const [noteToDelete, setNoteToDelete] = useState<NoteItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // New Note Modal / Inline
  const [isCreating, setIsCreating] = useState(false);
  const [newNoteTitle, setNewNoteTitle] = useState('');
  const [isCreatingLoading, setIsCreatingLoading] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Always keep fresh references to prevent stale closures during autosave and pasting
  const activeTitleRef = useRef(activeTitle);
  const activeContentRef = useRef(activeContent);

  useEffect(() => {
    activeTitleRef.current = activeTitle;
  }, [activeTitle]);

  useEffect(() => {
    activeContentRef.current = activeContent;
  }, [activeContent]);

  // Initial load
  useEffect(() => {
    let isMounted = true;
    const loadNotes = async () => {
      try {
        const res = await fetchWithAuth('/api/notes');
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Failed to fetch notes.');
        }
        if (isMounted) {
          setNotes(data.notes || []);
          setLoading(false);
        }
      } catch (err: unknown) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'Error loading notes.');
          setLoading(false);
        }
      }
    };

    loadNotes();
    return () => {
      isMounted = false;
    };
  }, [fetchWithAuth]);

  // Fullscreen change listener from browser
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

  // Escape key listener for CSS fallback fullscreen
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

  // Manual refresh notes
  const fetchNotes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchWithAuth('/api/notes');
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch notes.');
      }
      setNotes(data.notes || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error loading notes.');
    } finally {
      setLoading(false);
    }
  }, [fetchWithAuth]);

  // Open note in Notepad
  const handleOpenNote = (note: NoteItem) => {
    setActiveNote(note);
    setActiveTitle(note.title);
    setActiveContent(note.content || '');
    activeTitleRef.current = note.title;
    activeContentRef.current = note.content || '';
    setHasUnsavedChanges(false);
    setSaveSuccessMessage(null);
  };

  // Toggle fullscreen mode
  const toggleFullscreen = async () => {
    if (!isFullscreen) {
      setIsFullscreen(true);
      try {
        if (editorContainerRef.current?.requestFullscreen) {
          await editorContainerRef.current.requestFullscreen();
        }
      } catch (e) {
        console.warn('Native requestFullscreen unavailable, used CSS full mode:', e);
      }
    } else {
      setIsFullscreen(false);
      try {
        if (document.fullscreenElement) {
          await document.exitFullscreen();
        }
      } catch (e) {
        console.warn('Exit native fullscreen warning:', e);
      }
    }
  };

  // Save active note
  const handleSaveNote = useCallback(async (showSuccessAlert = true) => {
    if (!activeNote) return;
    setIsSaving(true);

    const titleToSave = activeTitleRef.current.trim() || activeNote.title;
    const contentToSave = activeContentRef.current;

    try {
      const res = await fetchWithAuth(`/api/notes/${activeNote.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: titleToSave,
          content: contentToSave,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to save note.');
      }

      const updated = data.note;
      setActiveNote(updated);
      setHasUnsavedChanges(false);

      // Update in local notes array
      setNotes((prev) =>
        prev.map((n) => (n.id === updated.id ? updated : n))
      );

      if (showSuccessAlert) {
        setSaveSuccessMessage('Note saved successfully!');
        setTimeout(() => setSaveSuccessMessage(null), 2500);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save note.';
      alert(msg);
    } finally {
      setIsSaving(false);
    }
  }, [activeNote, fetchWithAuth]);

  // Back to notes folder
  const handleBackToList = async () => {
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
    if (hasUnsavedChanges && activeNote) {
      await handleSaveNote(false);
    }
    setActiveNote(null);
    fetchNotes();
  };

  // Create new note with default name like notes_1, notes_2
  const handleCreateNote = async (customTitle?: string) => {
    setIsCreatingLoading(true);
    try {
      let titleToUse = customTitle?.trim();
      if (!titleToUse) {
        titleToUse = `notes_${notes.length + 1}`;
      }

      const res = await fetchWithAuth('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: titleToUse, content: '' }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create note.');
      }

      setIsCreating(false);
      setNewNoteTitle('');
      await fetchNotes();
      // Automatically open the new note in editor
      if (data.note) {
        handleOpenNote(data.note);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create note.';
      alert(msg);
    } finally {
      setIsCreatingLoading(false);
    }
  };

  // Content change with auto-save
  const handleContentChange = (newContent: string) => {
    setActiveContent(newContent);
    activeContentRef.current = newContent;
    setHasUnsavedChanges(true);

    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      if (activeNote) {
        handleSaveNote(false);
      }
    }, 2000);
  };

  // Keyboard shortcut Ctrl+S or Cmd+S
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        if (activeNote) {
          e.preventDefault();
          handleSaveNote(true);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeNote, handleSaveNote]);

  // Copy to clipboard from Notepad
  const handleCopyFromEditor = async () => {
    try {
      let textToCopy = '';
      const textarea = textareaRef.current;
      const currentContent = activeContentRef.current;

      if (
        textarea &&
        typeof textarea.selectionStart === 'number' &&
        textarea.selectionStart !== textarea.selectionEnd
      ) {
        textToCopy = currentContent.substring(
          textarea.selectionStart,
          textarea.selectionEnd
        );
      } else {
        textToCopy = currentContent;
      }

      let copied = false;
      if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        try {
          await navigator.clipboard.writeText(textToCopy);
          copied = true;
        } catch {
          copied = false;
        }
      }

      if (!copied && textarea) {
        textarea.select();
        document.execCommand('copy');
      }

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

  // Robust Paste into Notepad
  const handlePasteToEditor = async () => {
    try {
      let clipboardText = '';

      if (navigator.clipboard && typeof navigator.clipboard.readText === 'function') {
        try {
          clipboardText = await navigator.clipboard.readText();
        } catch (clipErr) {
          console.warn('Clipboard readText restricted by browser:', clipErr);
        }
      }

      // If browser security blocks clipboard readText, prompt user
      if (!clipboardText) {
        const userInput = window.prompt(
          'Please paste your text here (Ctrl+V or Cmd+V) and click OK:'
        );
        if (userInput !== null && userInput !== undefined) {
          clipboardText = userInput;
        } else {
          return;
        }
      }

      if (!clipboardText) return;

      const textarea = textareaRef.current;
      const currentContent = activeContentRef.current;

      let start = currentContent.length;
      let end = currentContent.length;

      if (textarea && typeof textarea.selectionStart === 'number') {
        start = textarea.selectionStart;
        end = textarea.selectionEnd;
      }

      const newText =
        currentContent.slice(0, start) +
        clipboardText +
        currentContent.slice(end);

      setActiveContent(newText);
      activeContentRef.current = newText;
      setHasUnsavedChanges(true);

      const newPos = start + clipboardText.length;
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          textareaRef.current.setSelectionRange(newPos, newPos);
        }
      }, 20);

      setEditorPasted(true);
      setTimeout(() => setEditorPasted(false), 2000);
    } catch (err: unknown) {
      console.error('Paste error:', err);
    }
  };

  // Copy whole note from Card list
  const handleCopyNoteContent = async (note: NoteItem, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(note.content || '');
      setCopiedNoteId(note.id);
      setTimeout(() => setCopiedNoteId(null), 2000);
    } catch {
      alert('Failed to copy text.');
    }
  };

  // Confirm delete note
  const handleConfirmDelete = async () => {
    if (!noteToDelete) return;
    setIsDeleting(true);

    try {
      const res = await fetchWithAuth(`/api/notes/${noteToDelete.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete note.');
      }

      const deletedId = noteToDelete.id;
      setNotes((prev) => prev.filter((n) => n.id !== deletedId));

      // If the currently open note was deleted, exit fullscreen and close editor
      if (activeNote?.id === deletedId) {
        if (isFullscreen) {
          setIsFullscreen(false);
          try {
            if (document.fullscreenElement) {
              await document.exitFullscreen();
            }
          } catch {
            // ignore
          }
        }
        setActiveNote(null);
      }

      setNoteToDelete(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error deleting note.';
      alert(msg);
    } finally {
      setIsDeleting(false);
    }
  };

  // Filter notes by search
  const filteredNotes = notes.filter((n) => {
    const q = searchQuery.toLowerCase();
    return (
      n.title.toLowerCase().includes(q) ||
      (n.content && n.content.toLowerCase().includes(q))
    );
  });

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

  const charCount = activeContent.length;
  const wordCount = activeContent.trim() ? activeContent.trim().split(/\s+/).length : 0;
  const lineCount = activeContent ? activeContent.split('\n').length : 1;

  return (
    <>
      {/* VIEW 1: NOTEPAD EDITOR (When a note is open) */}
      {activeNote ? (
        <div
          ref={editorContainerRef}
          className={
            isFullscreen
              ? 'fixed inset-0 z-50 bg-slate-950 flex flex-col h-screen w-screen overflow-hidden'
              : 'max-w-4xl mx-auto animate-in fade-in duration-200'
          }
        >
          <div
            className={
              isFullscreen
                ? 'flex-1 bg-slate-950 flex flex-col h-full w-full'
                : 'bg-slate-900/90 border border-slate-800 backdrop-blur-md rounded-2xl shadow-xl overflow-hidden flex flex-col min-h-[620px]'
            }
          >
            {/* Notepad Top Header */}
            <div className="p-3.5 sm:p-5 border-b border-slate-800 bg-slate-950/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2.5 sm:gap-3">
                <button
                  type="button"
                  onClick={handleBackToList}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all flex items-center gap-1.5 text-xs font-semibold"
                  title="Back to all notes"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span className="hidden xs:inline">All Notes</span>
                </button>

                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
                    <FileText className="w-3.5 h-3.5" />
                  </div>
                  <input
                    type="text"
                    value={activeTitle}
                    onChange={(e) => {
                      setActiveTitle(e.target.value);
                      activeTitleRef.current = e.target.value;
                      setHasUnsavedChanges(true);
                    }}
                    placeholder="Note Title (e.g. notes_1)"
                    className="bg-transparent border-b border-transparent hover:border-slate-700 focus:border-indigo-500 text-white font-semibold text-sm sm:text-base px-1.5 py-0.5 outline-none rounded transition-all max-w-[180px] sm:max-w-xs"
                  />
                </div>
              </div>

              {/* Editor Action Buttons (Copy, Paste, Full Mode, Save, Delete) */}
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                {/* Copy Button */}
                <button
                  type="button"
                  onClick={handleCopyFromEditor}
                  className={`px-2.5 sm:px-3 py-1.5 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition-all ${
                    editorCopied
                      ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                      : 'bg-slate-800/80 hover:bg-slate-800 border-slate-700/80 text-slate-300 hover:text-white'
                  }`}
                  title="Copy note content to clipboard"
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

                {/* Paste Button */}
                <button
                  type="button"
                  onClick={handlePasteToEditor}
                  className={`px-2.5 sm:px-3 py-1.5 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition-all ${
                    editorPasted
                      ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300'
                      : 'bg-slate-800/80 hover:bg-slate-800 border-slate-700/80 text-slate-300 hover:text-white'
                  }`}
                  title="Paste text into note"
                >
                  {editorPasted ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Pasted!</span>
                    </>
                  ) : (
                    <>
                      <ClipboardPaste className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Paste</span>
                    </>
                  )}
                </button>

                {/* Fullscreen / Full Mode Toggle */}
                <button
                  type="button"
                  onClick={toggleFullscreen}
                  className={`px-2.5 sm:px-3 py-1.5 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition-all ${
                    isFullscreen
                      ? 'bg-indigo-600/30 border-indigo-500 text-indigo-300'
                      : 'bg-slate-800/80 hover:bg-slate-800 border-slate-700/80 text-slate-300 hover:text-white'
                  }`}
                  title={isFullscreen ? 'Exit Full Screen (Esc)' : 'Full Screen Mode'}
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

                {/* Save Button */}
                <button
                  type="button"
                  onClick={() => handleSaveNote(true)}
                  disabled={isSaving}
                  className="px-3 sm:px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-indigo-600/20 transition-all"
                  title="Save changes (Ctrl+S / Cmd+S)"
                >
                  {isSaving ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Save className="w-3.5 h-3.5" />
                  )}
                  <span>{isSaving ? 'Saving...' : 'Save'}</span>
                </button>

                {/* Delete Note */}
                <button
                  type="button"
                  onClick={() => setNoteToDelete(activeNote)}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border border-slate-700 transition-all"
                  title="Delete note"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Status Bar */}
            <div className="px-4 sm:px-6 py-2 bg-slate-950/50 border-b border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400 font-mono shrink-0">
              <div className="flex items-center gap-2 sm:gap-3">
                <span>{lineCount} lines</span>
                <span>•</span>
                <span>{wordCount} words</span>
                <span>•</span>
                <span>{charCount} characters</span>
                {isFullscreen && (
                  <>
                    <span className="hidden sm:inline">•</span>
                    <span className="hidden sm:inline text-indigo-400 font-semibold uppercase text-[10px]">
                      Full Screen Mode
                    </span>
                  </>
                )}
              </div>
              <div>
                {saveSuccessMessage ? (
                  <span className="text-emerald-400 font-medium flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> {saveSuccessMessage}
                  </span>
                ) : hasUnsavedChanges ? (
                  <span className="text-amber-400 font-medium animate-pulse">
                    ● Unsaved changes
                  </span>
                ) : (
                  <span className="text-slate-500">● All changes saved</span>
                )}
              </div>
            </div>

            {/* Notepad Writing Area */}
            <div className={`flex-1 flex flex-col bg-slate-950/70 overflow-hidden ${isFullscreen ? 'p-4 sm:p-8 md:p-12' : 'p-4 sm:p-6'}`}>
              <textarea
                ref={textareaRef}
                value={activeContent}
                onChange={(e) => handleContentChange(e.target.value)}
                placeholder="Write your note here... You can type, paste text, or copy anytime simple like a notepad."
                className={`flex-1 w-full bg-transparent text-slate-100 placeholder-slate-600 font-sans leading-relaxed resize-none outline-none focus:ring-0 ${
                  isFullscreen
                    ? 'text-base sm:text-lg max-w-5xl mx-auto'
                    : 'text-sm sm:text-base min-h-[420px]'
                }`}
                autoFocus
              />
            </div>

            {/* Quick Footer Tips */}
            <div className="p-2.5 sm:p-3 bg-slate-950/90 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500 shrink-0">
              <div className="flex items-center gap-2 sm:gap-3">
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono text-[10px]">Ctrl+S</kbd>
                  <span className="hidden xs:inline">save</span>
                </span>
                {isFullscreen && (
                  <span className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono text-[10px]">Esc</kbd>
                    <span className="hidden xs:inline">exit full mode</span>
                  </span>
                )}
              </div>
              <span>Auto-saving enabled</span>
            </div>
          </div>
        </div>
      ) : (
        /* VIEW 2: NOTES FOLDER & LIST */
        <div className="max-w-4xl mx-auto">
          <div className="bg-slate-900/80 border border-slate-800 backdrop-blur-md rounded-2xl p-4 sm:p-6 md:p-8 shadow-xl">
            {/* Account Folder Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
                  <FolderOpen className="w-6 h-6 text-indigo-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg sm:text-xl font-semibold text-white">Notes Folder</h2>
                    <span className="px-2 py-0.5 rounded-full bg-slate-800 text-[11px] font-mono text-slate-300 border border-slate-700">
                      {user?.username}
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                    {notes.length} note{notes.length === 1 ? '' : 's'} in your personal notepad folder
                  </p>
                </div>
              </div>

              {/* New Note & Refresh Buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => fetchNotes()}
                  disabled={loading}
                  title="Refresh notes"
                  className="p-2 sm:p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white transition-all disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-400' : ''}`} />
                </button>

                <button
                  onClick={() => setIsCreating(true)}
                  className="px-4 py-2 sm:py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-md shadow-indigo-600/20 flex items-center gap-1.5 transition-all"
                >
                  <Plus className="w-4 h-4" />
                  <span>New Note</span>
                </button>
              </div>
            </div>

            {/* Inline Create Note Bar */}
            {isCreating && (
              <div className="mb-6 p-4 bg-slate-950/70 border border-indigo-500/30 rounded-xl animate-in fade-in duration-150">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-indigo-300 flex items-center gap-1.5">
                    <FileEdit className="w-3.5 h-3.5" /> Create New Note
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Default: notes_{notes.length + 1}
                  </span>
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <input
                    type="text"
                    value={newNoteTitle}
                    onChange={(e) => setNewNoteTitle(e.target.value)}
                    placeholder={`e.g. notes_${notes.length + 1} or My Project Ideas`}
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-white placeholder-slate-500 outline-none focus:border-indigo-500 transition-all"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleCreateNote(newNoteTitle);
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
                      onClick={() => handleCreateNote(newNoteTitle)}
                      className="flex-1 sm:flex-initial px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white shadow-md transition-all flex items-center justify-center gap-1.5"
                    >
                      {isCreatingLoading ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Plus className="w-3.5 h-3.5" />
                      )}
                      <span>Create & Open</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Search input if notes exist */}
            {notes.length > 0 && (
              <div className="mb-5 relative">
                <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search notes by title or content..."
                  className="w-full bg-slate-950/50 border border-slate-800/80 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-slate-700 transition-all"
                />
              </div>
            )}

            {/* Error State */}
            {error && (
              <div className="mb-5 p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-xs">
                {error}
              </div>
            )}

            {/* Loading State */}
            {loading && notes.length === 0 ? (
              <div className="py-16 text-center">
                <div className="w-8 h-8 border-3 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mx-auto mb-3" />
                <p className="text-sm text-slate-400">Loading your notes...</p>
              </div>
            ) : notes.length === 0 ? (
              /* Empty State */
              <div className="py-12 sm:py-16 px-4 text-center border-2 border-dashed border-slate-800 rounded-2xl">
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-slate-800/80 flex items-center justify-center text-slate-500 mx-auto mb-3">
                  <Folder className="w-6 h-6 sm:w-7 sm:h-7 text-indigo-400" />
                </div>
                <h3 className="text-sm sm:text-base font-medium text-white mb-1">Your notes folder is empty</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto mb-5">
                  Create your first note (like notes_1) to write, copy, paste, and organize your text simple like a notepad.
                </p>
                <button
                  onClick={() => handleCreateNote()}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-md transition-all inline-flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create notes_1</span>
                </button>
              </div>
            ) : filteredNotes.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400">
                No notes matching &ldquo;{searchQuery}&rdquo;
              </div>
            ) : (
              /* Notes Grid / List */
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {filteredNotes.map((note) => {
                  const charCount = (note.content || '').length;
                  const preview = note.content
                    ? note.content.slice(0, 120) + (note.content.length > 120 ? '...' : '')
                    : 'Empty note. Click to start typing...';

                  return (
                    <div
                      key={note.id}
                      onClick={() => handleOpenNote(note)}
                      className="group relative p-4 bg-slate-950/60 hover:bg-slate-900 border border-slate-800/80 hover:border-indigo-500/40 rounded-xl cursor-pointer transition-all duration-200 flex flex-col justify-between hover:shadow-lg hover:shadow-indigo-500/5 min-h-[140px]"
                    >
                      <div>
                        {/* Note Card Header */}
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-7 h-7 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0 group-hover:scale-105 transition-transform">
                              <FileText className="w-3.5 h-3.5" />
                            </div>
                            <h4 className="text-sm font-semibold text-white truncate max-w-[180px] sm:max-w-[150px]">
                              {note.title}
                            </h4>
                          </div>

                          {/* Card Action Icons */}
                          <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                            {/* Copy Content Button */}
                            <button
                              type="button"
                              onClick={(e) => handleCopyNoteContent(note, e)}
                              title="Copy note text"
                              className="p-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-800 text-slate-400 hover:text-white transition-all"
                            >
                              {copiedNoteId === note.id ? (
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>

                            {/* Delete Note Button */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setNoteToDelete(note);
                              }}
                              title="Delete note"
                              className="p-1.5 rounded-lg bg-slate-800/60 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-all"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Preview snippet */}
                        <p className={`text-xs leading-relaxed line-clamp-3 mb-3 ${note.content ? 'text-slate-300' : 'text-slate-500 italic'}`}>
                          {preview}
                        </p>
                      </div>

                      {/* Card Footer */}
                      <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-500">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDate(note.updatedAt)}
                        </span>
                        <span className="font-mono text-[10px] text-slate-400">
                          {charCount} chars
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

      {/* GLOBAL Delete Note Confirmation Modal: Rendered for both Editor & Card List */}
      {noteToDelete && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700/80 p-6 rounded-2xl max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="w-11 h-11 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 mb-3 mx-auto">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h4 className="text-base font-bold text-center text-white mb-1">Delete Note?</h4>
            <p className="text-xs text-center text-slate-400 mb-4">
              Are you sure you want to delete <span className="text-white font-semibold">&ldquo;{noteToDelete.title}&rdquo;</span>? This action cannot be undone.
            </p>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setNoteToDelete(null)}
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
