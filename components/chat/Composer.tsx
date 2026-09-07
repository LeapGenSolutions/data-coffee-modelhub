'use client';

import React, { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { useUIStore } from '../../store/useUIStore';
import { useChatStore } from '../../store/useChatStore';
import { ModelPicker } from './ModelPicker';
import { PaperclipIcon, SendIcon, XIcon, DocIcon, CalculatorIcon, GaugeIcon } from '../icons';
import { MOCK_MODELS } from '../../data/mock';
import { parseUploadedFile } from '../../lib/documentParser';
import { estimatePromptCost } from '../../lib/pricing';

interface ComposerProps {
  input: string;
  setInput: (value: string) => void;
  onSend: () => void;
  isStreaming: boolean;
  isTemp?: boolean;
}

export function Composer({ input, setInput, onSend, isStreaming, isTemp = false }: ComposerProps) {
  const { selectedModelId } = useUIStore();
  const { pendingFiles, addPendingFile, removePendingFile } = useChatStore();
  const [pickerOpen, setPickerOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentModel = MOCK_MODELS.find((m) => m.id === selectedModelId) || MOCK_MODELS[0];

  // Live Token & Cost Estimation
  const costEstimate = estimatePromptCost(
    input,
    pendingFiles.map((f) => ({ name: f })),
    selectedModelId
  );

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [input]);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  const [uploadingFiles, setUploadingFiles] = useState<Set<string>>(new Set());

  const SERVER_UPLOAD_EXTENSIONS = new Set(['.pdf', '.png', '.jpg', '.jpeg', '.tiff', '.tif', '.bmp', '.webp', '.docx', '.xlsx', '.pptx']);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      for (const file of Array.from(e.target.files)) {
        const ext = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));

        if (SERVER_UPLOAD_EXTENSIONS.has(ext)) {
          // Server-side upload for OCR-capable files
          setUploadingFiles((prev) => new Set(prev).add(file.name));
          try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('workspaceId', 'default');

            const res = await fetch('/api/documents/upload', {
              method: 'POST',
              body: formData,
            });

            if (res.ok) {
              const result = await res.json();
              addPendingFile(file.name, {
                name: file.name,
                size: file.size > 1024 * 1024
                  ? `${(file.size / (1024 * 1024)).toFixed(2)} MB`
                  : `${Math.max(1, Math.round(file.size / 1024))} KB`,
                type: file.type,
                content: result.preview || `[Indexed document: ${file.name}]`,
              });
            } else {
              // Fallback to client-side parsing if server upload fails
              const parsed = await parseUploadedFile(file);
              addPendingFile(file.name, parsed);
            }
          } catch {
            // Fallback to client-side parsing
            const parsed = await parseUploadedFile(file);
            addPendingFile(file.name, parsed);
          } finally {
            setUploadingFiles((prev) => {
              const next = new Set(prev);
              next.delete(file.name);
              return next;
            });
          }
        } else {
          // Client-side parsing for text/code files
          const parsed = await parseUploadedFile(file);
          addPendingFile(file.name, parsed);
        }
      }
      e.target.value = '';
    }
  };

  return (
    <div
      className={`relative rounded-hub-lg bg-hub-panel border transition-all shadow-hub-card ${
        isTemp
          ? 'border-dashed border-amber-500/40 focus-within:border-amber-500/80'
          : 'border-hub-border focus-within:border-hub-accent/60'
      }`}
    >
      {/* Pending files */}
      {(pendingFiles.length > 0 || uploadingFiles.size > 0) && (
        <div className="flex flex-wrap gap-1.5 px-3 pt-3">
          {/* Files currently uploading/processing via OCR */}
          {Array.from(uploadingFiles).filter((f) => !pendingFiles.includes(f)).map((f) => (
            <span
              key={`uploading-${f}`}
              className="inline-flex items-center gap-1.5 bg-hub-accent/10 rounded-full px-2.5 py-1 text-hub-xs text-hub-accent-hi border border-hub-accent/30 animate-pulse"
            >
              <span className="h-2 w-2 rounded-full bg-hub-accent animate-ping" />
              {f}
              <span className="text-[10px] text-hub-accent">Processing…</span>
            </span>
          ))}
          {/* Already attached files */}
          {pendingFiles.map((f) => (
            <span
              key={f}
              className="inline-flex items-center gap-1.5 bg-hub-hover rounded-full px-2.5 py-1 text-hub-xs text-hub-text-sec border border-hub-border/60"
            >
              <DocIcon size={12} /> {f}
              <button
                onClick={() => removePendingFile(f)}
                className="hover:text-red-400 transition-colors ml-0.5"
                title="Remove file"
              >
                <XIcon size={10} />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="flex items-end gap-2 p-3">
        {/* Hidden File Input */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileUpload}
          hidden
          multiple
          accept=".pdf,.doc,.docx,.xlsx,.pptx,.txt,.md,.csv,.tsv,.json,.ts,.tsx,.js,.jsx,.py,.rs,.go,.sql,.html,.css,.yaml,.yml,.png,.jpg,.jpeg,.tiff,.tif,.bmp,.webp"
        />

        <button
          onClick={() => fileInputRef.current?.click()}
          className="shrink-0 p-2 rounded-hub-sm text-hub-text-muted hover:text-hub-text hover:bg-hub-hover transition-colors"
          title="Attach document / code file"
          aria-label="Attach document"
        >
          <PaperclipIcon size={16} />
        </button>

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={isTemp ? 'Message in Isolated Temporary Mode…' : `Message ${currentModel.name}…`}
          rows={1}
          className="flex-1 resize-none bg-transparent text-hub-sm text-hub-text placeholder:text-hub-text-muted outline-none max-h-[200px] leading-relaxed"
        />

        {/* Model Picker Trigger */}
        <div className="relative">
          <button
            onClick={() => setPickerOpen(!pickerOpen)}
            className="shrink-0 flex items-center gap-1.5 rounded-full px-2.5 py-1 text-hub-xs font-medium hover:bg-hub-hover transition-colors border border-hub-border/40"
            aria-label="Select model"
          >
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: currentModel.color }} />
            {currentModel.name}
          </button>
          {pickerOpen && <ModelPicker onClose={() => setPickerOpen(false)} />}
        </div>

        {/* Send Button */}
        <button
          onClick={onSend}
          disabled={(!input.trim() && pendingFiles.length === 0) || isStreaming}
          className="shrink-0 h-8 w-8 rounded-hub-sm flex items-center justify-center bg-hub-accent text-white disabled:opacity-30 hover:bg-hub-accent-hi transition-colors shadow-sm"
          aria-label="Send message"
        >
          <SendIcon size={14} />
        </button>
      </div>

      {/* Live Token & Cost Estimator Bar */}
      <div className="flex items-center justify-between px-3 py-1.5 border-t border-hub-border/30 bg-black/20 text-[10.5px] text-hub-text-muted font-mono rounded-b-hub-lg">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1" title="Estimated prompt token count">
            <GaugeIcon size={11} className="text-hub-text-muted" />
            <strong className="text-hub-text font-normal">
              {costEstimate.inputTokens.toLocaleString()}
            </strong>{' '}
            / {(costEstimate.contextLimit / 1000).toFixed(0)}k tokens
          </span>

          <span
            className={`px-1.5 py-0.2 rounded text-[10px] font-semibold ${
              costEstimate.status === 'exceeded'
                ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                : costEstimate.status === 'warning'
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
            }`}
          >
            {costEstimate.contextPercent}% ctx
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <CalculatorIcon size={11} className="text-hub-text-muted" />
          <span>
            Est. Cost:{' '}
            <strong className="text-hub-text font-medium">
              ${costEstimate.estimatedTotalCostUsd < 0.00001 ? '< $0.00001' : costEstimate.estimatedTotalCostUsd.toFixed(5)}
            </strong>
          </span>
        </div>
      </div>
    </div>
  );
}
