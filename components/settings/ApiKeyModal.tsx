'use client';

import React, { useState, useEffect } from 'react';
import { useUserStore } from '../../store/useUserStore';
import { Dialog, DialogFooter } from '../ui/Dialog';
import { Button } from '../ui/button';
import { useToast } from '../ui/Toast';
import { CheckIcon } from '../icons';

export function ApiKeyModal() {
  const { apiKeys, setApiKeys, keyModalOpen, setKeyModalOpen } = useUserStore();
  const toast = useToast();

  const [openaiKey, setOpenaiKey] = useState('');
  const [anthropicKey, setAnthropicKey] = useState('');
  const [googleKey, setGoogleKey] = useState('');
  const [showKeys, setShowKeys] = useState(false);

  // Sync state whenever modal opens or stored keys update
  useEffect(() => {
    if (keyModalOpen) {
      setOpenaiKey(apiKeys.openai || '');
      setAnthropicKey(apiKeys.anthropic || '');
      setGoogleKey(apiKeys.google || '');
    }
  }, [keyModalOpen, apiKeys]);

  const handleSave = () => {
    setApiKeys({
      openai: openaiKey.trim(),
      anthropic: anthropicKey.trim(),
      google: googleKey.trim(),
    });
    setKeyModalOpen(false);
    toast.success('API keys saved successfully');
  };

  const handleClear = () => {
    setOpenaiKey('');
    setAnthropicKey('');
    setGoogleKey('');
    setApiKeys({ openai: '', anthropic: '', google: '' });
    toast.info('API keys removed. Using environment defaults or fallback.');
  };

  return (
    <Dialog
      open={keyModalOpen}
      onClose={() => setKeyModalOpen(false)}
      title="API Key Configuration (BYOK)"
      description="Provide your own provider or Microsoft Azure Foundry API keys for live model inference and RAG embeddings. Keys are stored safely in your browser storage."
    >
      <div className="space-y-4 py-2">
        {/* OpenAI / Azure Microsoft Foundry Key */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-semibold text-hub-text flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#74AA9C]" />
              OpenAI / Microsoft Azure Foundry Key (RAG & Chat)
            </label>
            {openaiKey && (
              <span className="text-[10.5px] text-emerald-400 font-medium flex items-center gap-1">
                <CheckIcon size={11} /> Configured
              </span>
            )}
          </div>
          <input
            type={showKeys ? 'text' : 'password'}
            value={openaiKey}
            onChange={(e) => setOpenaiKey(e.target.value)}
            placeholder="Azure Foundry key (e.g. Bn...) or OpenAI (sk-...)"
            className="w-full bg-hub-bg border border-hub-border rounded-[9px] px-3 py-2 text-xs text-hub-text placeholder:text-hub-text-muted outline-none focus:border-hub-accent font-mono"
          />
        </div>

        {/* Google Gemini Key */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-semibold text-hub-text flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#6E8EF7]" />
              Google Gemini API Key
            </label>
            {googleKey && (
              <span className="text-[10.5px] text-emerald-400 font-medium flex items-center gap-1">
                <CheckIcon size={11} /> Configured
              </span>
            )}
          </div>
          <input
            type={showKeys ? 'text' : 'password'}
            value={googleKey}
            onChange={(e) => setGoogleKey(e.target.value)}
            placeholder="AIzaSy..."
            className="w-full bg-hub-bg border border-hub-border rounded-[9px] px-3 py-2 text-xs text-hub-text placeholder:text-hub-text-muted outline-none focus:border-hub-accent font-mono"
          />
        </div>

        {/* Anthropic Key */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-semibold text-hub-text flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#D97757]" />
              Anthropic API Key
            </label>
            {anthropicKey && (
              <span className="text-[10.5px] text-emerald-400 font-medium flex items-center gap-1">
                <CheckIcon size={11} /> Configured
              </span>
            )}
          </div>
          <input
            type={showKeys ? 'text' : 'password'}
            value={anthropicKey}
            onChange={(e) => setAnthropicKey(e.target.value)}
            placeholder="sk-ant-api03-..."
            className="w-full bg-hub-bg border border-hub-border rounded-[9px] px-3 py-2 text-xs text-hub-text placeholder:text-hub-text-muted outline-none focus:border-hub-accent font-mono"
          />
        </div>

        {/* Toggle Show Keys */}
        <div className="flex items-center justify-between pt-1">
          <label className="flex items-center gap-2 text-xs text-hub-text-muted cursor-pointer">
            <input
              type="checkbox"
              checked={showKeys}
              onChange={(e) => setShowKeys(e.target.checked)}
              className="rounded bg-hub-bg border-hub-border accent-hub-accent"
            />
            Show key characters
          </label>
          <button
            onClick={handleClear}
            className="text-xs text-red-400 hover:text-red-300 transition-colors"
          >
            Clear all keys
          </button>
        </div>
      </div>

      <DialogFooter>
        <Button variant="ghost" onClick={() => setKeyModalOpen(false)}>
          Cancel
        </Button>
        <Button variant="default" onClick={handleSave}>
          Save Keys
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
