'use client';

import React, { useState, useEffect, useRef } from 'react';
import Papa from 'papaparse';
import PdfCanvasViewer from './PdfCanvasViewer';
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
  Video,
  Music,
  Play,
  Pause,
  Volume2,
  VolumeX,
  FastForward,
  Rewind,
  Repeat,
  HardDrive,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export interface DocFile {
  id: string;
  originalName: string;
  fileType: 'txt' | 'html' | 'pdf' | 'image' | 'csv' | 'video' | 'audio';
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

function VideoPlayerView({
  url,
  title,
  theme,
}: {
  url: string;
  title: string;
  theme: 'dark' | 'light';
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isLooping, setIsLooping] = useState(false);

  const handleSpeedChange = (speed: number) => {
    setPlaybackRate(speed);
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
  };

  const toggleLoop = () => {
    if (videoRef.current) {
      videoRef.current.loop = !isLooping;
      setIsLooping(!isLooping);
    }
  };

  const togglePiP = async () => {
    if (!videoRef.current) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else if (document.pictureInPictureEnabled) {
        await videoRef.current.requestPictureInPicture();
      }
    } catch (err) {
      console.warn('PiP not supported or failed:', err);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-full p-3 sm:p-6 md:p-8 max-w-5xl mx-auto w-full my-auto">
      <div
        className={`w-full rounded-2xl overflow-hidden shadow-2xl border transition-all ${
          theme === 'dark'
            ? 'bg-slate-950/90 border-slate-800 shadow-indigo-950/10'
            : 'bg-white border-slate-200 shadow-slate-300/40'
        }`}
      >
        <div className="relative bg-black flex items-center justify-center max-h-[70vh] min-h-[260px] overflow-hidden">
          <video
            ref={videoRef}
            src={url}
            controls
            playsInline
            preload="metadata"
            className="w-full max-h-[70vh] object-contain rounded-t-xl"
          >
            Your browser does not support video playback.
          </video>
        </div>

        {/* Video Player Helper Toolbar */}
        <div
          className={`flex flex-wrap items-center justify-between gap-2 sm:gap-3 p-3 sm:p-4 border-t ${
            theme === 'dark'
              ? 'bg-slate-900/90 border-slate-800 text-slate-300'
              : 'bg-slate-50 border-slate-200 text-slate-700'
          }`}
        >
          {/* Speed Controls */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <span className="text-xs font-semibold text-slate-400">Speed:</span>
            {[0.5, 1, 1.25, 1.5, 2].map((spd) => (
              <button
                key={spd}
                type="button"
                onClick={() => handleSpeedChange(spd)}
                className={`px-2 py-1 rounded-lg text-xs font-medium transition-all ${
                  playbackRate === spd
                    ? 'bg-indigo-600 text-white shadow-sm font-bold'
                    : theme === 'dark'
                    ? 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                    : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                }`}
              >
                {spd}x
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            {/* PiP Button */}
            <button
              type="button"
              onClick={togglePiP}
              title="Picture in Picture"
              className={`px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                theme === 'dark'
                  ? 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
                  : 'bg-slate-200 border-slate-300 text-slate-700 hover:text-black'
              }`}
            >
              PiP Mode
            </button>

            {/* Loop Toggle */}
            <button
              type="button"
              onClick={toggleLoop}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 border transition-all ${
                isLooping
                  ? 'bg-indigo-600/20 text-indigo-400 border-indigo-500/40'
                  : theme === 'dark'
                  ? 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
                  : 'bg-slate-200 border-slate-300 text-slate-600 hover:text-slate-900'
              }`}
            >
              <Repeat className="w-3.5 h-3.5" />
              <span>{isLooping ? 'Loop: On' : 'Loop'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function AudioPlayerView({
  url,
  title,
  theme,
  fileSize,
}: {
  url: string;
  title: string;
  theme: 'dark' | 'light';
  fileSize?: number;
}) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isLooping, setIsLooping] = useState(false);

  const formatTime = (seconds: number) => {
    if (isNaN(seconds) || seconds <= 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(console.error);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setCurrentTime(val);
    if (audioRef.current) {
      audioRef.current.currentTime = val;
    }
  };

  const skipSeconds = (sec: number) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = Math.max(
      0,
      Math.min(audioRef.current.currentTime + sec, duration || 0)
    );
  };

  const toggleMute = () => {
    if (!audioRef.current) return;
    const nextMuted = !isMuted;
    audioRef.current.muted = nextMuted;
    setIsMuted(nextMuted);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    setIsMuted(val === 0);
    if (audioRef.current) {
      audioRef.current.volume = val;
      audioRef.current.muted = val === 0;
    }
  };

  const handleSpeedChange = (speed: number) => {
    setPlaybackRate(speed);
    if (audioRef.current) {
      audioRef.current.playbackRate = speed;
    }
  };

  const toggleLoop = () => {
    if (audioRef.current) {
      audioRef.current.loop = !isLooping;
      setIsLooping(!isLooping);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-full p-4 sm:p-8 max-w-xl mx-auto w-full my-auto">
      <audio
        ref={audioRef}
        src={url}
        preload="metadata"
        onTimeUpdate={() => audioRef.current && setCurrentTime(audioRef.current.currentTime)}
        onLoadedMetadata={() => audioRef.current && setDuration(audioRef.current.duration)}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => setIsPlaying(false)}
      />

      <div
        className={`w-full rounded-3xl p-6 sm:p-8 border shadow-2xl transition-all relative overflow-hidden backdrop-blur-xl ${
          theme === 'dark'
            ? 'bg-slate-950/85 border-slate-800/90 shadow-indigo-950/30'
            : 'bg-white/95 border-slate-200/90 shadow-slate-300/40'
        }`}
      >
        {/* Glow ambient backgrounds */}
        <div
          className={`absolute -top-24 -right-24 w-60 h-60 rounded-full blur-3xl pointer-events-none transition-opacity duration-700 ${
            isPlaying ? 'opacity-40 bg-indigo-500' : 'opacity-10 bg-indigo-600'
          }`}
        />
        <div
          className={`absolute -bottom-24 -left-24 w-60 h-60 rounded-full blur-3xl pointer-events-none transition-opacity duration-700 ${
            isPlaying ? 'opacity-30 bg-cyan-500' : 'opacity-5 bg-cyan-600'
          }`}
        />

        {/* Vinyl Disc / Artwork Display */}
        <div className="flex flex-col items-center mb-6 sm:mb-8 relative z-10">
          <div
            className={`relative w-28 h-28 sm:w-36 sm:h-36 rounded-full flex items-center justify-center transition-all duration-500 shadow-2xl border-4 ${
              isPlaying
                ? 'border-cyan-500/50 shadow-cyan-500/25 scale-105'
                : 'border-slate-700/40 shadow-none'
            } ${
              theme === 'dark'
                ? 'bg-gradient-to-tr from-slate-900 via-indigo-950 to-slate-900'
                : 'bg-gradient-to-tr from-slate-100 via-indigo-50 to-white'
            }`}
          >
            {/* Spinning inner disc when playing */}
            <div
              className={`w-20 h-20 sm:w-24 sm:h-24 rounded-full border border-dashed border-cyan-400/30 flex items-center justify-center ${
                isPlaying ? 'animate-[spin_6s_linear_infinite]' : ''
              }`}
            >
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-indigo-500 to-cyan-400 flex items-center justify-center text-white shadow-lg">
                <Music className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
            </div>
          </div>

          <h4
            className="mt-5 text-sm sm:text-base font-bold text-center truncate max-w-full px-2"
            title={title}
          >
            {title}
          </h4>
          <p className="text-xs text-slate-400 mt-0.5">
            {fileSize ? formatFileSize(fileSize) : 'Audio Track'}
          </p>

          {/* Dancing Audio Equalizer Bars */}
          <div className="flex items-end justify-center gap-1.5 h-6 mt-4">
            {[40, 75, 55, 90, 60, 85, 45, 95, 65, 80, 50].map((h, i) => (
              <span
                key={i}
                style={{
                  height: isPlaying
                    ? `${Math.max(15, (h * (i % 2 === 0 ? 0.9 : 1.1)) % 100)}%`
                    : '20%',
                  transition: 'height 0.25s ease',
                }}
                className={`w-1 rounded-full ${
                  isPlaying
                    ? 'bg-gradient-to-t from-indigo-500 to-cyan-400'
                    : 'bg-slate-700/50'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Progress Bar & Timestamps */}
        <div className="space-y-1.5 mb-6 relative z-10">
          <div className="relative flex items-center">
            <input
              type="range"
              min={0}
              max={duration || 100}
              step="any"
              value={currentTime}
              onChange={handleSeek}
              className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-slate-800/80 accent-indigo-500"
            />
          </div>
          <div className="flex justify-between text-[11px] font-mono text-slate-400 select-none">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Transport Playback Controls */}
        <div className="flex items-center justify-center gap-3 sm:gap-5 mb-6 relative z-10">
          {/* Rewind 10s */}
          <button
            type="button"
            onClick={() => skipSeconds(-10)}
            title="Rewind 10 seconds"
            className="p-2 sm:p-2.5 rounded-full hover:bg-slate-800/60 text-slate-400 hover:text-white transition-colors"
          >
            <Rewind className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>

          {/* Big Play / Pause Button */}
          <button
            type="button"
            onClick={togglePlay}
            title={isPlaying ? 'Pause' : 'Play'}
            className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white flex items-center justify-center shadow-lg shadow-indigo-600/30 hover:scale-105 active:scale-95 transition-all"
          >
            {isPlaying ? (
              <Pause className="w-5 h-5 sm:w-6 sm:h-6 fill-current" />
            ) : (
              <Play className="w-5 h-5 sm:w-6 sm:h-6 fill-current ml-0.5" />
            )}
          </button>

          {/* Fast Forward 10s */}
          <button
            type="button"
            onClick={() => skipSeconds(10)}
            title="Fast forward 10 seconds"
            className="p-2 sm:p-2.5 rounded-full hover:bg-slate-800/60 text-slate-400 hover:text-white transition-colors"
          >
            <FastForward className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>

          {/* Loop toggle */}
          <button
            type="button"
            onClick={toggleLoop}
            title={isLooping ? 'Disable Loop' : 'Enable Loop'}
            className={`p-2 rounded-full transition-colors ${
              isLooping
                ? 'text-indigo-400 bg-indigo-500/10'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <Repeat className="w-4 h-4" />
          </button>
        </div>

        {/* Volume & Speed Controls Bar */}
        <div
          className={`flex flex-wrap items-center justify-between gap-3 pt-4 border-t relative z-10 ${
            theme === 'dark' ? 'border-slate-800/70' : 'border-slate-200'
          }`}
        >
          {/* Volume Slider */}
          <div className="flex items-center gap-2 flex-1 min-w-[130px] max-w-[180px]">
            <button
              type="button"
              onClick={toggleMute}
              className="text-slate-400 hover:text-white transition-colors shrink-0"
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="w-4 h-4 text-rose-400" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={isMuted ? 0 : volume}
              onChange={handleVolumeChange}
              className="w-full h-1.5 rounded-lg appearance-none cursor-pointer bg-slate-800 accent-indigo-500"
            />
          </div>

          {/* Speed selector chips */}
          <div className="flex items-center gap-1 shrink-0 ml-auto">
            {[0.75, 1, 1.25, 1.5, 2].map((spd) => (
              <button
                key={spd}
                type="button"
                onClick={() => handleSpeedChange(spd)}
                className={`px-1.5 py-0.5 rounded text-[10px] sm:text-xs font-mono font-medium transition-all ${
                  playbackRate === spd
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-slate-200'
                }`}
              >
                {spd}x
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
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
  const [zoomLevel, setZoomLevel] = useState<number>(100);

  // Reset zoom when a new file is opened
  useEffect(() => {
    setZoomLevel(100);
    setFontSize(16);
  }, [file?.id]);

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
  const isMediaFormat = file.fileType === 'video' || file.fileType === 'audio';

  const getFileBadge = (type: string) => {
    switch (type) {
      case 'video':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-violet-500/10 text-violet-400 border border-violet-500/20">
            <Video className="w-3.5 h-3.5" /> Video
          </span>
        );
      case 'audio':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <Music className="w-3.5 h-3.5" /> Audio
          </span>
        );
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
              /* Responsive visible scroller */
              ::-webkit-scrollbar { width: 10px; height: 10px; }
              ::-webkit-scrollbar-track { background: ${readerTheme === 'dark' ? 'rgba(15, 23, 42, 0.85)' : 'rgba(241, 245, 249, 0.9)'}; }
              ::-webkit-scrollbar-thumb { background: rgba(99, 102, 241, 0.6); border-radius: 6px; }
              ::-webkit-scrollbar-thumb:hover { background: rgba(99, 102, 241, 0.9); }
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
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-0 sm:p-3 md:p-6 bg-slate-950/70 backdrop-blur-xl animate-in fade-in duration-200">
      <div
        ref={containerRef}
        className={`w-full flex flex-col sm:rounded-2xl rounded-none overflow-hidden shadow-2xl transition-all duration-300 ${
          showDeleteConfirm ? 'filter blur-md pointer-events-none select-none scale-[0.99] opacity-75' : ''
        } ${
          isFullscreen
            ? 'h-screen w-screen rounded-none'
            : 'max-w-6xl h-[100dvh] sm:h-[92vh]'
        } ${
          readerTheme === 'dark'
            ? 'bg-slate-950 text-slate-100 border-0 sm:border border-slate-800'
            : 'bg-white text-slate-900 border-0 sm:border border-slate-200'
        }`}
      >
        {/* Reader Navigation & Controls Toolbar */}
        <div
          className={`flex items-center justify-between px-3 sm:px-6 py-2.5 sm:py-3 border-b shrink-0 transition-colors gap-2 sm:gap-3 ${
            readerTheme === 'dark'
              ? 'bg-slate-900/90 border-slate-800 text-slate-200'
              : 'bg-slate-100/90 border-slate-200 text-slate-800'
          }`}
        >
          {/* File Info Title */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1 overflow-hidden">
            <div className="shrink-0 scale-90 sm:scale-100">{getFileBadge(file.fileType)}</div>
            <h3
              className="font-semibold text-xs sm:text-sm md:text-base truncate min-w-0"
              title={file.originalName}
            >
              {file.originalName}
            </h3>
          </div>

          {/* Controls Bar - Responsive and locked from overlapping */}
          <div className="flex items-center gap-1 sm:gap-2 shrink-0 ml-auto">
            {/* Unified Zoom Controls (for documents and images) */}
            {!isMediaFormat && (
              isTextFormat ? (
                <div
                  className={`flex items-center gap-0.5 sm:gap-1 px-1 sm:px-2 py-0.5 sm:py-1 rounded-lg sm:rounded-xl border shrink-0 ${
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
                  <button
                    onClick={resetFontSize}
                    title="Reset Font Size (16px)"
                    className="text-[11px] sm:text-xs font-mono px-0.5 sm:px-1 font-medium text-slate-300 hover:text-white transition-colors shrink-0"
                  >
                    {fontSize}px
                  </button>
                  <button
                    onClick={increaseFontSize}
                    title="Increase Font Size"
                    className="p-1 rounded-lg hover:bg-slate-800/20 text-slate-400 hover:text-white transition-colors shrink-0"
                  >
                    <ZoomIn className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </button>
                </div>
              ) : (
                <div
                  className={`flex items-center gap-0.5 sm:gap-1 px-1 sm:px-2 py-0.5 sm:py-1 rounded-lg sm:rounded-xl border shrink-0 ${
                    readerTheme === 'dark'
                      ? 'bg-slate-950/80 border-slate-800'
                      : 'bg-white border-slate-200 shadow-sm'
                  }`}
                >
                  <button
                    onClick={() => setZoomLevel((z) => Math.max(z - 25, 50))}
                    title="Zoom Out"
                    className="p-1 rounded-lg hover:bg-slate-800/20 text-slate-400 hover:text-white transition-colors shrink-0"
                  >
                    <ZoomOut className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </button>

                  <button
                    onClick={() => setZoomLevel(100)}
                    title="Reset Zoom (100%)"
                    className="text-[11px] sm:text-xs font-mono px-1 font-semibold text-indigo-400 hover:text-indigo-300 transition-colors shrink-0"
                  >
                    {zoomLevel}%
                  </button>

                  <button
                    onClick={() => setZoomLevel((z) => Math.min(z + 25, 250))}
                    title="Zoom In"
                    className="p-1 rounded-lg hover:bg-slate-800/20 text-slate-400 hover:text-white transition-colors shrink-0"
                  >
                    <ZoomIn className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </button>
                </div>
              )
            )}

            {/* Theme Toggle Button */}
            <button
              onClick={() => setReaderTheme(readerTheme === 'dark' ? 'light' : 'dark')}
              title={`Switch to ${readerTheme === 'dark' ? 'Light' : 'Dark'} theme`}
              className={`p-1.5 sm:p-2 rounded-lg sm:rounded-xl border transition-all shrink-0 ${
                readerTheme === 'dark'
                  ? 'bg-slate-950/80 border-slate-800 hover:border-slate-700 text-amber-400'
                  : 'bg-white border-slate-200 hover:border-slate-300 text-indigo-600 shadow-sm'
              }`}
            >
              {readerTheme === 'dark' ? <Sun className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <Moon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
            </button>

            {/* Fullscreen Toggle - Hidden on small mobile */}
            <button
              onClick={toggleFullscreen}
              title={isFullscreen ? 'Exit Full Screen' : 'Full Screen'}
              className={`hidden sm:inline-flex p-1.5 sm:p-2 rounded-lg sm:rounded-xl border transition-all shrink-0 ${
                readerTheme === 'dark'
                  ? 'bg-slate-950/80 border-slate-800 hover:border-slate-700 text-slate-300'
                  : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700 shadow-sm'
              }`}
            >
              {isFullscreen ? <Minimize2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <Maximize2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
            </button>

            {/* Open Raw / Full View in New Tab */}
            <a
              href={pdfBlobUrl || file.cloudinaryUrl}
              target="_blank"
              rel="noopener noreferrer"
              title="Open full document in new tab"
              className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-slate-800/60 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-700 transition-all shrink-0"
            >
              <ExternalLink className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </a>

            <div className="h-4 w-px bg-slate-700/60 shrink-0 mx-0.5 hidden sm:block" />

            {/* Delete Document Button */}
            <button
              onClick={() => setShowDeleteConfirm(true)}
              title="Delete this document"
              className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 border border-rose-500/25 transition-all shrink-0"
            >
              <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>

            {/* Close Modal */}
            <button
              onClick={onClose}
              title="Close Reader"
              className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl bg-slate-800/60 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 transition-all shrink-0"
            >
              <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
          </div>
        </div>

        {/* Content Viewer Body with Dedicated Single Scroller */}
        <div
          className={`flex-1 ${
            file.fileType === 'html'
              ? 'overflow-hidden'
              : 'overflow-auto modal-scroller'
          } transition-colors ${
            readerTheme === 'dark' ? 'bg-slate-900/90' : 'bg-slate-50 modal-scroller-light'
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
              {/* PDF VIEWER – High-Fidelity Canvas Reader with Native Mobile & Desktop Support */}
              {file.fileType === 'pdf' && (
                <PdfCanvasViewer
                  fileId={file.id}
                  originalName={file.originalName}
                  fetchWithAuth={fetchWithAuth}
                  zoomLevel={zoomLevel}
                  readerTheme={readerTheme}
                />
              )}

              {/* IMAGE VIEWER */}
              {file.fileType === 'image' && (
                <div
                  className={`w-max min-w-full min-h-full inline-flex p-4 sm:p-8 transition-all ${
                    zoomLevel > 100 ? 'items-start justify-start' : 'items-center justify-center'
                  }`}
                >
                  <div className="w-max min-w-full flex items-center justify-center m-auto">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={file.cloudinaryUrl}
                      alt={file.originalName}
                      style={{
                        width: zoomLevel === 100 ? 'auto' : `${zoomLevel}%`,
                        maxWidth: zoomLevel === 100 ? '100%' : 'none',
                        maxHeight: zoomLevel === 100 ? '80vh' : 'none',
                        minWidth: zoomLevel > 100 ? `${Math.round(360 * (zoomLevel / 100))}px` : undefined,
                        height: 'auto',
                        transition: 'width 0.15s ease-out',
                      }}
                      className="rounded-xl shadow-2xl select-none block object-contain"
                      onContextMenu={(e) => e.preventDefault()}
                    />
                  </div>
                </div>
              )}

              {/* TXT VIEWER */}
              {file.fileType === 'txt' && (
                <div className="p-3 sm:p-6 md:p-10 max-w-5xl mx-auto">
                  <pre
                    style={{ fontSize: `${fontSize}px`, lineHeight: 1.7 }}
                    className={`font-mono whitespace-pre-wrap break-words rounded-xl p-4 sm:p-8 transition-all ${
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
                <div className="p-2 sm:p-6 md:p-8 w-max min-w-full">
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
                          className={`sticky top-0 z-10 ${
                            readerTheme === 'dark'
                              ? 'bg-slate-950/95 text-indigo-400'
                              : 'bg-slate-100 text-indigo-700'
                          }`}
                        >
                          <tr>
                            {csvData[0]?.map((header, idx) => (
                              <th
                                key={idx}
                                className="px-3 sm:px-4 py-2.5 sm:py-3 font-semibold tracking-wider whitespace-nowrap border-b border-slate-700/40 text-xs sm:text-sm"
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
                                <td key={cellIdx} className="px-3 sm:px-4 py-2 sm:py-2.5 whitespace-nowrap text-xs sm:text-sm">
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
                <div className="w-full h-full flex-1">
                  <iframe
                    sandbox="allow-same-origin"
                    srcDoc={buildSandboxedHtmlDoc()}
                    className="w-full h-full border-0"
                    title={file.originalName}
                  />
                </div>
              )}

              {/* VIDEO VIEWER */}
              {file.fileType === 'video' && (
                <VideoPlayerView
                  url={file.cloudinaryUrl}
                  title={file.originalName}
                  theme={readerTheme}
                />
              )}

              {/* AUDIO VIEWER */}
              {file.fileType === 'audio' && (
                <AudioPlayerView
                  url={file.cloudinaryUrl}
                  title={file.originalName}
                  theme={readerTheme}
                  fileSize={resolvedFileSize ?? file.fileSize}
                />
              )}
            </>
          )}
        </div>

        {/* Mobile touch-scroll helper pill when zoomed */}
        {(file.fileType === 'pdf' || file.fileType === 'image') && zoomLevel > 100 && (
          <div className="sm:hidden flex items-center justify-center py-1 bg-indigo-950/40 border-t border-indigo-500/20 text-[10px] text-indigo-300 gap-1.5 select-none px-3">
            <span>↔</span>
            <span>Zoomed {zoomLevel}% — Swipe horizontally & vertically to browse</span>
          </div>
        )}

        {/* Document Stats & Highlighted Size Bottom Bar */}
        <div
          className={`flex items-center justify-between gap-2 px-3 sm:px-6 py-2 border-t text-xs shrink-0 select-none transition-colors ${
            readerTheme === 'dark'
              ? 'bg-slate-900/90 border-slate-800 text-slate-400'
              : 'bg-slate-100/90 border-slate-200 text-slate-600'
          }`}
        >
          <div className="flex items-center gap-1.5 sm:gap-3 min-w-0 flex-1">
            <span className="text-slate-500 shrink-0">File:</span>
            <span className="font-medium text-slate-200 truncate max-w-[130px] sm:max-w-xs md:max-w-md" title={file.originalName}>
              {file.originalName}
            </span>
            <span className="text-slate-700 hidden sm:inline">•</span>
            <div className="items-center gap-1 hidden sm:flex">
              <span className="text-slate-500">Type:</span>
              <span className="uppercase font-semibold text-slate-300">{file.fileType}</span>
            </div>
          </div>

          {/* Highlighted Document Size in Footer */}
          {displaySize && (
            <div className="flex items-center gap-1.5 shrink-0 ml-auto">
              <span className="text-slate-400 font-medium hidden sm:inline">Size:</span>
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg font-mono font-bold text-[11px] sm:text-xs transition-all ${
                  readerTheme === 'dark'
                    ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30 shadow-[0_0_10px_rgba(245,158,11,0.15)]'
                    : 'bg-amber-500/15 text-amber-900 border border-amber-300'
                }`}
              >
                <HardDrive className="w-3 h-3 text-amber-400" />
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

                <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-3 pt-2">
                  <button
                    type="button"
                    disabled={isDeleting}
                    onClick={() => {
                      setShowDeleteConfirm(false);
                      setDeleteError(null);
                    }}
                    className="w-full sm:w-auto px-4 py-2.5 sm:py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 hover:text-white transition-all disabled:opacity-50 min-w-[80px] text-center"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={isDeleting}
                    onClick={handleDeleteDocument}
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
