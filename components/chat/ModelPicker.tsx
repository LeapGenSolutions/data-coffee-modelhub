'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useAppStore, MODELS } from '../../store/useAppStore';
import { ProviderName } from '../../types';

interface ModelPickerProps {
  position?: 'top' | 'bottom';
}

export function ModelPicker({ position = 'top' }: ModelPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedModelId = useAppStore((state) => state.selectedModelId);
  const setSelectedModelId = useAppStore((state) => state.setSelectedModelId);
  const menuRef = useRef<HTMLDivElement>(null);

  const currentModel = MODELS.find((m) => m.id === selectedModelId) || MODELS[0];

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const providers: ProviderName[] = ['Anthropic', 'OpenAI', 'Google'];

  return (
    <div className="relative inline-block" ref={menuRef}>
      {position === 'top' ? (
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          className="flex items-center gap-2 border border-hub-border bg-hub-panel hover:bg-hub-hover text-hub-text rounded-[9px] px-3 py-[7px] font-semibold text-[13px] transition-colors"
        >
          <span
            className="w-2 h-2 rounded-full shrink-0"
            style={{ backgroundColor: currentModel.color }}
          />
          <span>{currentModel.name}</span>
          <span className="text-hub-text-muted leading-none">
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path d="m2 3.5 3 3 3-3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          className="flex items-center gap-[8px] border border-hub-border bg-hub-panel hover:bg-hub-hover text-hub-text-sec rounded-[20px] px-2.5 py-[5px] font-medium text-[12px] transition-colors"
        >
          <span
            className="w-[8px] h-[8px] rounded-full shrink-0"
            style={{ backgroundColor: currentModel.color }}
          />
          <span>{currentModel.name}</span>
          <span className="text-hub-text-muted leading-none">
            <svg width="9" height="9" viewBox="0 0 10 10" fill="none">
              <path d="m2 3.5 3 3 3-3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        </button>
      )}

      {isOpen && (
        <div
          role="listbox"
          className={`absolute z-50 w-[300px] bg-hub-panel border border-hub-border rounded-[12px] shadow-[0_14px_40px_rgba(0,0,0,0.5)] p-[6px] transition-all ${
            position === 'top' ? 'top-[calc(100%+6px)] right-0' : 'bottom-[calc(100%+6px)] left-0'
          }`}
        >
          {providers.map((provider) => {
            const providerModels = MODELS.filter((m) => m.provider === provider);
            if (providerModels.length === 0) return null;
            return (
              <div key={provider} className="mb-1 last:mb-0">
                <div className="text-[10.5px] font-semibold tracking-[0.08em] uppercase text-hub-text-muted px-[10px] pt-2 pb-[4px]">
                  {provider}
                </div>
                {providerModels.map((m) => {
                  const isSelected = m.id === selectedModelId;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => {
                        setSelectedModelId(m.id);
                        setIsOpen(false);
                      }}
                      className={`flex items-center gap-[10px] w-full text-left px-[10px] py-2 rounded-[8px] transition-colors ${
                        isSelected ? 'bg-hub-hover text-hub-text' : 'hover:bg-hub-hover text-hub-text-sec'
                      }`}
                    >
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: m.color }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-[13px] text-hub-text">{m.name}</div>
                        <div className="text-[11.5px] text-hub-text-muted truncate">{m.desc}</div>
                      </div>
                      {isSelected && (
                        <span className="text-hub-accent-hi shrink-0">
                          <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                            <path d="m2.5 7 3 3 5-6.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
