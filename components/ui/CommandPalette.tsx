'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useUIStore } from '../../store/useUIStore';
import { useChatStore } from '../../store/useChatStore';
import { useUserStore } from '../../store/useUserStore';
import { SearchIcon, LockIcon, PlusIcon, ChatBubbleIcon, TeamIcon, BillingIcon, ArenaIcon, KeyIcon } from '../icons';
import { MOCK_MODELS } from '../../data/mock';

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const { setActiveView, setSelectedModelId, setIsTempChatActive } = useUIStore();
  const { createNewChat, chats, setCurrentChatId } = useChatStore();
  const { setKeyModalOpen } = useUserStore();

  // Listen for Ctrl+K / Cmd+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      if (e.key === 'Escape' && open) {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open]);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
    }
  }, [open]);

  if (!open) return null;

  const actions = [
    {
      id: 'act_new',
      label: 'New Chat',
      category: 'Actions',
      icon: PlusIcon,
      perform: () => {
        createNewChat();
        setOpen(false);
      },
    },
    {
      id: 'act_temp',
      label: 'Start Isolated Temporary Chat',
      category: 'Actions',
      icon: LockIcon,
      perform: () => {
        setIsTempChatActive(true);
        setActiveView('chat');
        setOpen(false);
      },
    },
    {
      id: 'act_keys',
      label: 'Configure API Keys (BYOK - Azure Foundry, OpenAI, Gemini)',
      category: 'Settings',
      icon: KeyIcon,
      perform: () => {
        setKeyModalOpen(true);
        setOpen(false);
      },
    },
    {
      id: 'nav_arena',
      label: 'Go to Model Arena (Side-by-Side Benchmark)',
      category: 'Navigation',
      icon: ArenaIcon,
      perform: () => {
        setActiveView('arena');
        setOpen(false);
      },
    },
    {
      id: 'nav_chats',
      label: 'Go to Chats View',
      category: 'Navigation',
      icon: ChatBubbleIcon,
      perform: () => {
        setActiveView('chat');
        setOpen(false);
      },
    },
    {
      id: 'nav_collabs',
      label: 'Go to Workspaces View',
      category: 'Navigation',
      icon: TeamIcon,
      perform: () => {
        setActiveView('collabs');
        setOpen(false);
      },
    },
    {
      id: 'nav_billing',
      label: 'Go to Usage & Billing',
      category: 'Navigation',
      icon: BillingIcon,
      perform: () => {
        setActiveView('billing');
        setOpen(false);
      },
    },
    ...MOCK_MODELS.map((m) => ({
      id: `model_${m.id}`,
      label: `Switch Model to ${m.name} (${m.provider})`,
      category: 'Models',
      icon: SearchIcon,
      perform: () => {
        setSelectedModelId(m.id);
        setOpen(false);
      },
    })),
    ...chats.map((c) => ({
      id: `chat_${c.id}`,
      label: `Open Chat: ${c.title}`,
      category: 'Recent Chats',
      icon: ChatBubbleIcon,
      perform: () => {
        setCurrentChatId(c.id);
        setActiveView('chat');
        setOpen(false);
      },
    })),
  ];

  const filtered = actions.filter((a) => a.label.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-start justify-center pt-20 p-4 animate-fade-in">
      <div className="w-full max-w-lg bg-hub-panel border border-hub-border rounded-2xl shadow-hub-float overflow-hidden animate-scale-in">
        {/* Search Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-hub-border bg-hub-bg/50">
          <SearchIcon size={16} className="text-hub-text-muted shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command, model, or chat name… (Esc to exit)"
            className="w-full bg-transparent text-hub-sm text-hub-text placeholder:text-hub-text-muted outline-none"
          />
        </div>

        {/* Results List */}
        <div className="max-h-80 overflow-y-auto p-2 space-y-1">
          {filtered.length === 0 ? (
            <div className="py-8 text-center text-hub-xs text-hub-text-muted">No matching commands found.</div>
          ) : (
            filtered.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={item.perform}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-hub-sm text-left text-hub-sm text-hub-text-sec hover:bg-hub-hover hover:text-hub-text transition-colors group"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Icon size={15} className="text-hub-text-muted group-hover:text-hub-accent shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </div>
                  <span className="text-[10px] text-hub-text-muted/60 uppercase font-semibold shrink-0 ml-2">
                    {item.category}
                  </span>
                </button>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 bg-hub-bg border-t border-hub-border/50 flex items-center justify-between text-[11px] text-hub-text-muted">
          <span>Navigation Shortcuts</span>
          <span className="font-mono">Ctrl + K</span>
        </div>
      </div>
    </div>
  );
}
