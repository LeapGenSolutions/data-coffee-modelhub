'use client';

import React, { useEffect, useRef, useMemo } from 'react';
import { useDocumentStore } from '../../store/useDocumentStore';
import { XIcon, CopyIcon, CheckIcon, SearchIcon, DocIcon } from '../icons';

export function DocumentInspector() {
  const { activeDocument, isInspectorOpen, closeInspector, highlightedLines, searchQuery, setSearchQuery } =
    useDocumentStore();

  const [copied, setCopied] = React.useState(false);
  const highlightedRef = useRef<HTMLDivElement>(null);

  const lines = useMemo(() => {
    if (!activeDocument?.content) return ['(Empty document or binary file preview not available)'];
    return activeDocument.content.split(/\r?\n/);
  }, [activeDocument?.content]);

  // Auto-scroll into view when highlighted lines change
  useEffect(() => {
    if (isInspectorOpen && highlightedLines) {
      setTimeout(() => {
        highlightedRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    }
  }, [isInspectorOpen, highlightedLines]);

  if (!isInspectorOpen || !activeDocument) return null;

  const totalLines = lines.length;
  const tokenEstimate = Math.max(1, Math.ceil((activeDocument.content || '').length / 4));

  const handleCopyAll = () => {
    navigator.clipboard.writeText(activeDocument.content || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-end animate-fade-in">
      <div className="w-full max-w-2xl bg-hub-panel border-l border-hub-border h-full flex flex-col shadow-2xl animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-hub-border bg-hub-side shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-1.5 rounded-lg bg-hub-accent/15 text-hub-accent-hi border border-hub-accent/30 shrink-0">
              <DocIcon size={16} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <strong className="text-sm font-bold text-hub-text truncate">{activeDocument.name}</strong>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-hub-bg border border-hub-border text-hub-text-sec shrink-0">
                  {activeDocument.size || 'Attached'}
                </span>
              </div>
              <span className="text-[11px] text-hub-text-muted">
                {totalLines} lines · ~{new Intl.NumberFormat('en-US').format(tokenEstimate)} tokens · text-embedding-3-small indexed
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={handleCopyAll}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-hub-border bg-hub-bg hover:bg-hub-hover text-xs font-semibold text-hub-text transition-colors"
              title="Copy document content"
            >
              {copied ? <CheckIcon size={12} className="text-emerald-400" /> : <CopyIcon size={12} />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
            <button
              onClick={closeInspector}
              className="p-1.5 rounded-lg text-hub-text-muted hover:text-hub-text hover:bg-hub-hover transition-colors"
              aria-label="Close inspector"
            >
              <XIcon size={16} />
            </button>
          </div>
        </div>

        {/* Toolbar: Search & Jump status */}
        <div className="px-5 py-2.5 border-b border-hub-border/60 bg-hub-bg flex items-center justify-between gap-3 shrink-0">
          <div className="relative flex-1 max-w-sm">
            <SearchIcon size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-hub-text-muted pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter document text…"
              className="w-full h-7.5 pl-8 pr-3 rounded-lg bg-hub-panel border border-hub-border text-xs text-hub-text placeholder:text-hub-text-muted outline-none focus:border-hub-accent"
            />
          </div>

          {highlightedLines ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-hub-accent/15 border border-hub-accent/40 text-[11px] font-semibold text-hub-accent-hi">
              <span>📍 Citation Highlight: Lines {highlightedLines.startLine}–{highlightedLines.endLine}</span>
            </div>
          ) : (
            <span className="text-[11px] text-hub-text-muted">Click citations in chat to jump to code</span>
          )}
        </div>

        {/* Document Content with Line Numbers */}
        <div className="flex-1 overflow-y-auto p-4 bg-[#0e1011] font-mono text-[12px] leading-relaxed select-text">
          <div className="min-w-full">
            {lines.map((line, idx) => {
              const lineNum = idx + 1;
              const isCited =
                highlightedLines && lineNum >= highlightedLines.startLine && lineNum <= highlightedLines.endLine;
              const isFirstCited = highlightedLines && lineNum === highlightedLines.startLine;

              const matchesSearch =
                searchQuery.trim() && line.toLowerCase().includes(searchQuery.toLowerCase());

              return (
                <div
                  key={lineNum}
                  ref={isFirstCited ? highlightedRef : undefined}
                  className={`flex items-start group py-0.5 px-2 -mx-2 rounded transition-colors ${
                    isCited
                      ? 'bg-hub-accent/20 border-l-2 border-hub-accent shadow-sm'
                      : matchesSearch
                      ? 'bg-yellow-500/20 text-yellow-200'
                      : 'hover:bg-hub-hover/40'
                  }`}
                >
                  <span
                    className={`w-10 select-none text-right pr-3 shrink-0 font-mono text-[11px] ${
                      isCited ? 'text-hub-accent-hi font-bold' : 'text-zinc-600 group-hover:text-zinc-400'
                    }`}
                  >
                    {lineNum}
                  </span>
                  <pre className="flex-1 text-[#e4e4e7] whitespace-pre-wrap break-words font-mono">
                    {line || '\n'}
                  </pre>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
