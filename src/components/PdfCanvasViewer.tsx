'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AlertTriangle, Download, RotateCw } from 'lucide-react';

interface PageInfo {
  pageNum: number;
  width: number;
  height: number;
}

interface PdfCanvasViewerProps {
  fileId: string;
  originalName: string;
  fetchWithAuth: (url: string, options?: RequestInit) => Promise<Response>;
  zoomLevel: number;
  readerTheme: 'dark' | 'light';
  containerWidth?: number;
}

// Dynamically load PDF.js from public/pdfjs
function loadPdfJs(): Promise<any> {
  if (typeof window === 'undefined') return Promise.reject(new Error('Window not available'));
  if ((window as any).pdfjsLib) {
    return Promise.resolve((window as any).pdfjsLib);
  }

  return new Promise((resolve, reject) => {
    const existing = document.querySelector('script[src="/pdfjs/pdf.min.js"]');
    if (existing) {
      existing.addEventListener('load', () => {
        const lib = (window as any).pdfjsLib;
        if (lib) {
          lib.GlobalWorkerOptions.workerSrc = '/pdfjs/pdf.worker.min.js';
          resolve(lib);
        } else {
          reject(new Error('PDF.js not found after script load'));
        }
      });
      existing.addEventListener('error', () => reject(new Error('Failed to load PDF.js')));
      return;
    }

    const script = document.createElement('script');
    script.src = '/pdfjs/pdf.min.js';
    script.async = true;
    script.onload = () => {
      const lib = (window as any).pdfjsLib;
      if (lib) {
        lib.GlobalWorkerOptions.workerSrc = '/pdfjs/pdf.worker.min.js';
        resolve(lib);
      } else {
        reject(new Error('PDF.js initialized without library object'));
      }
    };
    script.onerror = () => reject(new Error('Failed to load PDF.js script'));
    document.head.appendChild(script);
  });
}

// Single Page Canvas Component
function SinglePdfPage({
  doc,
  pageInfo,
  baseWidth,
  zoomLevel,
  totalPages,
  readerTheme,
}: {
  doc: any;
  pageInfo: PageInfo;
  baseWidth: number;
  zoomLevel: number;
  totalPages: number;
  readerTheme: 'dark' | 'light';
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [rendered, setRendered] = useState(false);
  const renderTaskRef = useRef<any>(null);

  // Compute CSS display dimensions
  const displayWidth = Math.round(baseWidth * (zoomLevel / 100));
  const displayHeight = Math.round((pageInfo.height / pageInfo.width) * displayWidth);

  // High-DPI render scale for crisp text at all zoom levels
  const dpr = typeof window !== 'undefined' ? Math.min(window.devicePixelRatio || 1, 2) : 1;
  const renderScale = Math.max(1.5, (baseWidth / pageInfo.width) * dpr * 1.5);

  useEffect(() => {
    let isMounted = true;

    async function renderPage() {
      if (!doc || !canvasRef.current) return;

      try {
        if (renderTaskRef.current) {
          renderTaskRef.current.cancel();
        }

        const page = await doc.getPage(pageInfo.pageNum);
        if (!isMounted || !canvasRef.current) return;

        const viewport = page.getViewport({ scale: renderScale });
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        canvas.width = Math.round(viewport.width);
        canvas.height = Math.round(viewport.height);

        const task = page.render({
          canvasContext: ctx,
          viewport: viewport,
        });

        renderTaskRef.current = task;
        await task.promise;

        if (isMounted) {
          setRendered(true);
        }
      } catch (err: any) {
        if (err?.name !== 'RenderingCancelledException') {
          console.error(`Error rendering page ${pageInfo.pageNum}:`, err);
        }
      }
    }

    renderPage();

    return () => {
      isMounted = false;
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
      }
    };
  }, [doc, pageInfo.pageNum, renderScale]);

  return (
    <div
      className="flex flex-col items-center shrink-0 select-none"
      style={{
        width: `${displayWidth}px`,
        transition: 'width 0.15s ease-out',
      }}
    >
      <div
        className={`relative rounded-lg shadow-xl overflow-hidden border transition-all ${
          readerTheme === 'dark' ? 'border-slate-800 bg-white' : 'border-slate-300 bg-white'
        }`}
        style={{
          width: `${displayWidth}px`,
          height: `${displayHeight}px`,
        }}
      >
        <canvas
          ref={canvasRef}
          style={{
            width: `${displayWidth}px`,
            height: `${displayHeight}px`,
            display: 'block',
          }}
        />

        {!rendered && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/10 backdrop-blur-[2px] gap-2">
            <div className="w-6 h-6 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
            <span className="text-[11px] font-medium text-slate-500">Page {pageInfo.pageNum}…</span>
          </div>
        )}
      </div>

      <div className="py-1 px-2.5 mt-1.5 rounded-full text-[10px] font-mono font-medium tracking-wider text-slate-400 select-none bg-slate-800/40 border border-slate-700/30">
        Page {pageInfo.pageNum} of {totalPages}
      </div>
    </div>
  );
}

export default function PdfCanvasViewer({
  fileId,
  originalName,
  fetchWithAuth,
  zoomLevel,
  readerTheme,
}: PdfCanvasViewerProps) {
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [pages, setPages] = useState<PageInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rawBlobUrl, setRawBlobUrl] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [measuredWidth, setMeasuredWidth] = useState<number>(750);

  // Measure container width for responsive page sizing
  useEffect(() => {
    function updateWidth() {
      if (containerRef.current) {
        const w = containerRef.current.clientWidth;
        if (w > 0) {
          // Leave comfortable margin on sides
          setMeasuredWidth(Math.max(300, Math.min(850, w - (w < 640 ? 16 : 48))));
        }
      }
    }

    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  // Fetch and parse PDF document
  const loadDocument = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const pdfjs = await loadPdfJs();
      const res = await fetchWithAuth(`/api/files/${fileId}/raw`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || `Failed to fetch PDF data (${res.status})`);
      }

      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      setRawBlobUrl(blobUrl);

      const arrayBuffer = await blob.arrayBuffer();
      const loadingTask = pdfjs.getDocument({
        data: new Uint8Array(arrayBuffer),
        cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/cmaps/',
        cMapPacked: true,
      });

      const doc = await loadingTask.promise;
      setPdfDoc(doc);

      const pageList: PageInfo[] = [];
      for (let i = 1; i <= doc.numPages; i++) {
        const page = await doc.getPage(i);
        const vp = page.getViewport({ scale: 1 });
        pageList.push({
          pageNum: i,
          width: vp.width,
          height: vp.height,
        });
      }
      setPages(pageList);
    } catch (err: any) {
      console.error('PdfCanvasViewer load error:', err);
      setError(err?.message || 'Failed to render PDF document.');
    } finally {
      setLoading(false);
    }
  }, [fileId, fetchWithAuth]);

  useEffect(() => {
    loadDocument();
    return () => {
      if (rawBlobUrl) {
        URL.revokeObjectURL(rawBlobUrl);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fileId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center w-full py-24 gap-3 text-slate-400">
        <div className="w-9 h-9 border-3 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
        <p className="text-sm font-medium text-slate-300">Loading document pages…</p>
        <p className="text-xs text-slate-500">Preparing high-definition reader</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center w-full py-20 px-4 text-center">
        <div className="p-6 bg-rose-500/10 border border-rose-500/20 rounded-2xl max-w-md w-full flex flex-col items-center gap-3">
          <AlertTriangle className="w-10 h-10 text-rose-400" />
          <div>
            <h4 className="font-semibold text-rose-300 mb-1">Could not display PDF inline</h4>
            <p className="text-xs text-slate-400 mb-4">{error}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={loadDocument}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors"
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span>Retry</span>
            </button>
            {rawBlobUrl && (
              <a
                href={rawBlobUrl}
                download={originalName}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Open / Download</span>
              </a>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`w-full min-w-full inline-flex flex-col gap-6 py-4 sm:py-8 px-2 sm:px-6 transition-all ${
        zoomLevel > 100 ? 'items-start justify-start' : 'items-center justify-center'
      }`}
    >
      <div
        className={`flex flex-col gap-6 sm:gap-8 transition-all ${
          zoomLevel > 100 ? 'w-max min-w-full items-start' : 'w-full items-center'
        }`}
      >
        {pages.map((p) => (
          <SinglePdfPage
            key={p.pageNum}
            doc={pdfDoc}
            pageInfo={p}
            baseWidth={measuredWidth}
            zoomLevel={zoomLevel}
            totalPages={pages.length}
            readerTheme={readerTheme}
          />
        ))}
      </div>
    </div>
  );
}
