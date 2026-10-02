'use client';

import React, { useState, useMemo } from 'react';
import {
  FileSpreadsheet,
  Search,
  X,
  Layers,
  Download,
  Copy,
  Check,
  Table as TableIcon,
} from 'lucide-react';

interface ExcelSpreadsheetViewerProps {
  sheets: Record<string, string[][]>;
  sheetNames: string[];
  activeSheet: string;
  onSelectSheet: (sheetName: string) => void;
  fontSize: number;
  readerTheme: 'dark' | 'light';
  originalName: string;
  onDownload?: () => void;
}

function colIndexToLetter(index: number): string {
  let temp = index;
  let letter = '';
  while (temp >= 0) {
    letter = String.fromCharCode((temp % 26) + 65) + letter;
    temp = Math.floor(temp / 26) - 1;
  }
  return letter;
}

export default function ExcelSpreadsheetViewer({
  sheets,
  sheetNames,
  activeSheet,
  onSelectSheet,
  fontSize,
  readerTheme,
  originalName,
  onDownload,
}: ExcelSpreadsheetViewerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedCell, setCopiedCell] = useState<string | null>(null);

  const rawRows = useMemo(() => {
    return sheets[activeSheet] || [];
  }, [sheets, activeSheet]);

  // Determine max columns across rows to align grid correctly
  const maxCols = useMemo(() => {
    let max = 0;
    for (const row of rawRows) {
      if (row.length > max) max = row.length;
    }
    return max;
  }, [rawRows]);

  // Filter rows based on search
  const filteredRows = useMemo(() => {
    if (!searchQuery.trim()) {
      return rawRows.map((row, idx) => ({ row, originalIndex: idx }));
    }
    const q = searchQuery.toLowerCase().trim();
    const result: { row: string[]; originalIndex: number }[] = [];
    rawRows.forEach((row, idx) => {
      // Always include row 0 if it's considered header, or include if matched
      const matches = row.some((cell) => cell.toLowerCase().includes(q));
      if (matches || idx === 0) {
        result.push({ row, originalIndex: idx });
      }
    });
    return result;
  }, [rawRows, searchQuery]);

  const copyCellContent = (text: string, coord: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedCell(coord);
    setTimeout(() => setCopiedCell(null), 1500);
  };

  const isDark = readerTheme === 'dark';

  return (
    <div className="flex flex-col h-full w-full overflow-hidden">
      {/* ── Subheader Controls Bar ────────────────────────────────────────── */}
      <div
        className={`px-3 sm:px-6 py-2.5 sm:py-3 border-b shrink-0 flex flex-wrap items-center justify-between gap-3 ${
          isDark
            ? 'bg-slate-900/70 border-slate-800 text-slate-300'
            : 'bg-slate-50 border-slate-200 text-slate-700'
        }`}
      >
        {/* Sheet Tabs Navigation */}
        <div className="flex items-center gap-1.5 overflow-x-auto py-0.5 max-w-full no-scrollbar">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mr-1 flex items-center gap-1 shrink-0">
            <Layers className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Sheets:</span>
          </span>
          {sheetNames.map((name) => {
            const isSelected = name === activeSheet;
            const count = sheets[name]?.length || 0;
            return (
              <button
                key={name}
                type="button"
                onClick={() => {
                  onSelectSheet(name);
                  setSearchQuery('');
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 shrink-0 ${
                  isSelected
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-semibold shadow-sm'
                    : isDark
                    ? 'bg-slate-800/80 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700/60'
                    : 'bg-white hover:bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200'
                }`}
              >
                <FileSpreadsheet className="w-3 h-3 text-emerald-400" />
                <span className="max-w-[140px] truncate">{name}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    isSelected
                      ? 'bg-emerald-500/30 text-emerald-300'
                      : isDark
                      ? 'bg-slate-700 text-slate-400'
                      : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search & Actions */}
        <div className="flex items-center gap-2 ml-auto shrink-0">
          {/* Quick Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search in sheet..."
              className={`pl-8 pr-7 py-1 text-xs rounded-lg border focus:outline-none focus:ring-1 focus:ring-emerald-500 w-36 sm:w-48 transition-all ${
                isDark
                  ? 'bg-slate-950/80 border-slate-800 text-slate-200 placeholder:text-slate-500'
                  : 'bg-white border-slate-200 text-slate-800 placeholder:text-slate-400 shadow-inner'
              }`}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Quick Stats */}
          <div
            className={`hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-mono ${
              isDark
                ? 'bg-slate-950/60 border-slate-800 text-slate-400'
                : 'bg-white border-slate-200 text-slate-500'
            }`}
          >
            <span>{maxCols} cols</span>
            <span>•</span>
            <span>{rawRows.length} rows</span>
          </div>

          {/* Download button */}
          {onDownload && (
            <button
              type="button"
              onClick={onDownload}
              title={`Download ${originalName}`}
              className="px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5 transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Download</span>
            </button>
          )}
        </div>
      </div>

      {/* ── Active Search Feedback ────────────────────────────────────────── */}
      {searchQuery && (
        <div
          className={`px-4 py-1.5 border-b text-xs flex items-center justify-between ${
            isDark
              ? 'bg-emerald-950/20 border-emerald-900/30 text-emerald-400'
              : 'bg-emerald-50 border-emerald-200 text-emerald-700'
          }`}
        >
          <span>
            Filtering by &ldquo;{searchQuery}&rdquo; — {Math.max(0, filteredRows.length - 1)} matching data rows
          </span>
          <button
            onClick={() => setSearchQuery('')}
            className="text-[11px] underline hover:opacity-80"
          >
            Clear filter
          </button>
        </div>
      )}

      {/* ── Spreadsheet Grid ────────────────────────────────────────────── */}
      <div className="flex-1 overflow-auto p-2 sm:p-4 select-text">
        {rawRows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-12 h-12 rounded-2xl bg-slate-800/50 flex items-center justify-center text-slate-500 mb-3 border border-slate-700/50">
              <TableIcon className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-semibold text-slate-300">Worksheet is empty</h4>
            <p className="text-xs text-slate-500 mt-1">This sheet contains no cell records.</p>
          </div>
        ) : (
          <div
            className={`inline-block min-w-full rounded-xl overflow-hidden border shadow-sm ${
              isDark ? 'border-slate-800 bg-slate-900/70' : 'border-slate-200 bg-white'
            }`}
          >
            <table
              style={{ fontSize: `${fontSize}px` }}
              className="min-w-full border-collapse text-left"
            >
              {/* Excel Column Letters Header */}
              <thead
                className={`sticky top-0 z-20 ${
                  isDark ? 'bg-slate-950 text-slate-300' : 'bg-slate-100 text-slate-700'
                }`}
              >
                <tr className="border-b border-slate-700/50">
                  {/* Top-left row index corner */}
                  <th
                    className={`w-12 px-2.5 py-2 text-center text-[10px] font-mono font-semibold uppercase tracking-wider border-r sticky left-0 z-30 ${
                      isDark
                        ? 'bg-slate-950 text-slate-500 border-slate-800'
                        : 'bg-slate-200 text-slate-600 border-slate-300'
                    }`}
                  >
                    #
                  </th>

                  {/* Column Letters (A, B, C...) + optional row 0 header text */}
                  {Array.from({ length: maxCols }).map((_, colIdx) => {
                    const colLetter = colIndexToLetter(colIdx);
                    const headerText = rawRows[0]?.[colIdx];
                    return (
                      <th
                        key={colIdx}
                        className={`px-3 py-2 font-semibold tracking-wider whitespace-nowrap border-r border-slate-700/40 text-xs ${
                          isDark ? 'text-indigo-400' : 'text-indigo-700'
                        }`}
                      >
                        <div className="flex flex-col">
                          <span className="text-[10px] font-mono text-slate-500 uppercase">
                            {colLetter}
                          </span>
                          <span className="truncate max-w-[200px]" title={headerText}>
                            {headerText || `Col ${colIdx + 1}`}
                          </span>
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>

              {/* Data Rows */}
              <tbody
                className={`divide-y ${
                  isDark ? 'divide-slate-800/40' : 'divide-slate-200'
                }`}
              >
                {filteredRows.slice(1).map(({ row, originalIndex }, displayIdx) => {
                  const rowNumber = originalIndex + 1;
                  return (
                    <tr
                      key={originalIndex}
                      className={`transition-colors group ${
                        isDark
                          ? displayIdx % 2 === 0
                            ? 'bg-slate-900/30 hover:bg-slate-800/50 text-slate-300'
                            : 'bg-slate-950/20 hover:bg-slate-800/50 text-slate-300'
                          : displayIdx % 2 === 0
                          ? 'bg-white hover:bg-slate-50 text-slate-700'
                          : 'bg-slate-50/50 hover:bg-slate-100 text-slate-700'
                      }`}
                    >
                      {/* Sticky Row Number Index on Left */}
                      <td
                        className={`w-12 px-2.5 py-1.5 text-center text-[10px] font-mono font-medium border-r sticky left-0 z-10 transition-colors ${
                          isDark
                            ? 'bg-slate-950/90 text-slate-500 border-slate-800 group-hover:text-indigo-400'
                            : 'bg-slate-100 text-slate-500 border-slate-200 group-hover:text-indigo-600'
                        }`}
                      >
                        {rowNumber}
                      </td>

                      {/* Cell Data */}
                      {Array.from({ length: maxCols }).map((_, colIdx) => {
                        const cellVal = row[colIdx] ?? '';
                        const coord = `${colIndexToLetter(colIdx)}${rowNumber}`;
                        const isCopied = copiedCell === coord;
                        const isNumber =
                          cellVal !== '' && !isNaN(Number(cellVal)) && !cellVal.includes('\n');

                        return (
                          <td
                            key={colIdx}
                            onClick={() => copyCellContent(cellVal, coord)}
                            title={`Click to copy: ${coord}: ${cellVal}`}
                            className={`px-3 py-1.5 whitespace-nowrap border-r border-slate-800/30 text-xs cursor-pointer hover:underline relative ${
                              isNumber ? 'font-mono text-right' : 'text-left'
                            } ${
                              isCopied
                                ? isDark
                                  ? 'bg-emerald-500/20 text-emerald-300'
                                  : 'bg-emerald-100 text-emerald-800'
                                : ''
                            }`}
                          >
                            <span className="truncate max-w-xs inline-block align-middle">
                              {cellVal !== '' ? cellVal : <span className="opacity-20">—</span>}
                            </span>
                            {isCopied && (
                              <span className="absolute right-1 top-1/2 -translate-y-1/2 text-[9px] text-emerald-400 bg-slate-900 px-1 rounded shadow">
                                Copied!
                              </span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Footer Status Bar ───────────────────────────────────────────── */}
      <div
        className={`px-4 py-1.5 border-t shrink-0 flex items-center justify-between text-[11px] font-mono ${
          isDark
            ? 'bg-slate-950 border-slate-800 text-slate-400'
            : 'bg-slate-100 border-slate-200 text-slate-600'
        }`}
      >
        <div className="flex items-center gap-2">
          <span>Sheet: <strong className="text-emerald-400">{activeSheet}</strong></span>
          <span>•</span>
          <span>{rawRows.length} total rows</span>
          <span>•</span>
          <span>{maxCols} total columns</span>
        </div>
        <div className="text-[10px] text-slate-500 hidden sm:block">
          Tip: Click any cell to copy its content
        </div>
      </div>
    </div>
  );
}
