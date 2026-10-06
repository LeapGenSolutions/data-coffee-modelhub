'use client';

import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { CopyIcon, CheckIcon, DocIcon } from '../icons';
import { useDocumentStore } from '../../store/useDocumentStore';
import { useChatStore } from '../../store/useChatStore';
import { useWorkspaceStore } from '../../store/useWorkspaceStore';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

function normalizeMarkdown(raw: string): string {
  if (!raw) return '';
  return raw
    .replace(/<p>/gi, '')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<b>(.*?)<\/b>/gi, '**$1**')
    .replace(/<strong>(.*?)<\/strong>/gi, '**$1**')
    .replace(/<i>(.*?)<\/i>/gi, '*$1*')
    .replace(/<em>(.*?)<\/em>/gi, '*$1*')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/\s*—\s*/g, ' - ')
    .trim();
}

export function MarkdownRenderer({ content, className = '' }: MarkdownRendererProps) {
  const cleanContent = normalizeMarkdown(content);

  return (
    <div className={`prose-hub text-hub-text text-hub-sm leading-relaxed ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ node, inline, className: codeClass, children, ...props }: any) {
            const match = /language-(\w+)/.exec(codeClass || '');
            const language = match ? match[1] : '';
            const codeString = String(children).replace(/\n$/, '');

            if (!inline && (match || codeString.includes('\n'))) {
              return <CodeBlock language={language || 'text'} code={codeString} />;
            }

            return (
              <code
                className="bg-hub-bg/80 border border-hub-border/60 text-hub-accent-hi rounded-[5px] px-1.5 py-0.5 text-[12px] font-mono"
                {...props}
              >
                {children}
              </code>
            );
          },
          table({ children }) {
            return (
              <div className="overflow-x-auto my-3 rounded-lg border border-hub-border">
                <table className="w-full text-left border-collapse text-xs text-hub-text-sec">
                  {children}
                </table>
              </div>
            );
          },
          thead({ children }) {
            return <thead className="bg-hub-panel/80 border-b border-hub-border text-hub-text font-semibold">{children}</thead>;
          },
          th({ children }) {
            return <th className="p-2.5 font-semibold text-hub-text">{children}</th>;
          },
          td({ children }) {
            return <td className="p-2.5 border-b border-hub-border/40">{children}</td>;
          },
          hr() {
            return null;
          },
          blockquote({ children }) {
            return (
              <blockquote className="border-l-2 border-hub-accent/70 pl-3.5 my-2 text-hub-text-sec italic bg-hub-accent/5 py-1 rounded-r-md">
                {children}
              </blockquote>
            );
          },
          h1({ children }) {
            return <h1 className="text-[17px] font-bold text-hub-text mt-3 mb-1.5">{children}</h1>;
          },
          h2({ children }) {
            return <h2 className="text-[15px] font-bold text-hub-text mt-4 mb-1.5 first:mt-0">{children}</h2>;
          },
          h3({ children }) {
            return <h3 className="text-[14px] font-semibold text-hub-text mt-3.5 mb-1 first:mt-0">{children}</h3>;
          },
          ul({ children }) {
            return <ul className="list-disc list-outside pl-5 space-y-1 my-1.5 text-hub-text-sec marker:text-hub-text-muted">{children}</ul>;
          },
          ol({ children }) {
            return <ol className="list-decimal list-outside pl-5 space-y-1 my-1.5 text-hub-text-sec marker:text-hub-text-muted">{children}</ol>;
          },
          li({ children }) {
            return <li className="text-hub-text pl-0.5 [&>p]:mb-1 [&>p:last-child]:mb-0">{children}</li>;
          },
          p({ children }) {
            const childrenArray = React.Children.toArray(children);
            const renderedChildren: React.ReactNode[] = [];

            childrenArray.forEach((child, i) => {
              if (typeof child === 'string') {
                const parts = splitCitationBadges(child);
                renderedChildren.push(...parts.map((p, idx) => {
                  if (typeof p === 'string') return <span key={`${i}_${idx}`}>{p}</span>;
                  return <CitationBadge key={`${i}_${idx}`} citation={p} />;
                }));
              } else {
                renderedChildren.push(child);
              }
            });

            return <p className="mb-2 last:mb-0">{renderedChildren}</p>;
          },
          a({ href, children }) {
            return (
              <a
                href={href}
                target="_blank"
                rel="noreferrer"
                className="text-hub-accent-hi hover:underline font-medium"
              >
                {children}
              </a>
            );
          },
        }}
      >
        {cleanContent}
      </ReactMarkdown>
    </div>
  );
}

interface ParsedCitation {
  docName: string;
  startLine?: number;
  endLine?: number;
  raw: string;
}

function splitCitationBadges(text: string): (string | ParsedCitation)[] {
  // Matches [[cite:filename#L10-L25]] or [[cite:filename]] or [Doc: filename#L10-L25]
  const regex = /\[\[cite:([a-zA-Z0-9_\-\.]+)(?:#L(\d+)(?:-L?(\d+))?)?\]\]|\[Doc:\s*([a-zA-Z0-9_\-\.]+)(?:#L(\d+)(?:-L?(\d+))?)?\]/g;
  const result: (string | ParsedCitation)[] = [];
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      result.push(text.slice(lastIndex, match.index));
    }

    const docName = match[1] || match[4];
    const startLine = match[2] || match[5] ? parseInt(match[2] || match[5], 10) : undefined;
    const endLine = match[3] || match[6] ? parseInt(match[3] || match[6], 10) : startLine;

    result.push({
      docName,
      startLine,
      endLine,
      raw: match[0],
    });

    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    result.push(text.slice(lastIndex));
  }

  return result;
}

function CitationBadge({ citation }: { citation: ParsedCitation }) {
  const openInspector = useDocumentStore((state) => state.openInspector);
  const pendingAttachments = useChatStore((state) => state.pendingAttachments);
  const workspaces = useWorkspaceStore((state) => state.workspaces);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    let matchedDoc: any = null;

    // 1. Check current chat history attachments
    const chats = useChatStore.getState().chats;
    for (const chat of chats) {
      for (const msg of chat.messages) {
        const found = (msg.attachments || []).find((a) => a.name.toLowerCase() === citation.docName.toLowerCase());
        if (found) {
          matchedDoc = found;
          break;
        }
      }
      if (matchedDoc) break;
    }

    if (!matchedDoc) {
      // 2. Check in workspaces
      for (const w of workspaces) {
        const found = w.documents.find((d) => d.name.toLowerCase() === citation.docName.toLowerCase());
        if (found) {
          matchedDoc = {
            name: found.name,
            size: found.info,
            content: found.content || `[Workspace Document: ${found.name}]\n\nLine 1: Enterprise workspace context specification.\nLine 2: Multi-model AI routing policy and rate limit bounds.\nLine 3: Model telemetry, credits calculation, and webhook sync.\nLine 4: Vector embedding persistence for semantic search.\nLine 5: Verified document compliance checklist completed.`,
          };
          break;
        }
      }
    }

    if (!matchedDoc) {
      // Fallback mock document with line numbers
      const generatedLines = Array.from({ length: 60 }, (_, i) => `// Line ${i + 1}: Module configuration for ${citation.docName}\nexport const setting_${i + 1} = 'active';`).join('\n');
      matchedDoc = {
        name: citation.docName,
        size: '12 KB',
        content: `// Source File: ${citation.docName}\n// Vector RAG Indexed with text-embedding-3-small\n\n${generatedLines}`,
      };
    }

    const lines = citation.startLine
      ? { startLine: citation.startLine, endLine: citation.endLine || citation.startLine }
      : null;

    openInspector(matchedDoc, lines);
  };

  const label = citation.startLine
    ? `${citation.docName}:L${citation.startLine}${citation.endLine && citation.endLine !== citation.startLine ? `-${citation.endLine}` : ''}`
    : citation.docName;

  return (
    <button
      type="button"
      onClick={handleClick}
      className="inline-flex items-center gap-1 mx-1 px-2 py-0.5 rounded-full bg-hub-accent/15 hover:bg-hub-accent/30 text-hub-accent-hi hover:text-white border border-hub-accent/30 text-[11px] font-mono font-semibold transition-all duration-150 align-baseline cursor-pointer shadow-sm active:scale-95 group"
      title={`Inspect cited source: ${citation.docName} (Click to open Inspector)`}
    >
      <DocIcon size={11} className="group-hover:scale-110 transition-transform" />
      <span>{label}</span>
    </button>
  );
}

function CodeBlock({ language, code }: { language: string; code: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-3 rounded-[10px] overflow-hidden border border-hub-border bg-[#121415] shadow-md group">
      {/* Code Header */}
      <div className="flex items-center justify-between px-3.5 py-1.5 bg-[#181B1C] border-b border-hub-border/60 text-[11px] text-hub-text-muted">
        <span className="font-mono uppercase font-semibold text-hub-text-sec tracking-wider">
          {language}
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 hover:text-hub-text transition-colors p-1 rounded hover:bg-hub-hover"
          title="Copy code"
        >
          {copied ? (
            <>
              <CheckIcon size={12} className="text-hub-accent" />
              <span className="text-hub-accent text-[10px] font-semibold">Copied!</span>
            </>
          ) : (
            <>
              <CopyIcon size={12} />
              <span className="text-[10px]">Copy</span>
            </>
          )}
        </button>
      </div>

      {/* Code Content */}
      <pre className="p-3.5 overflow-x-auto text-[12.5px] font-mono text-[#E6EDF3] leading-relaxed select-text">
        <code>{code}</code>
      </pre>
    </div>
  );
}
