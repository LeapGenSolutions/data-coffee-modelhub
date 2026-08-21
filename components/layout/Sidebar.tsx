'use client';

import React, { useState, useMemo } from 'react';
import { useUIStore } from '../../store/useUIStore';
import { useChatStore } from '../../store/useChatStore';
import { useUserStore } from '../../store/useUserStore';
import { Avatar } from '../ui/avatar';
import { AppView, Chat } from '../../types';
import {
  PlusIcon,
  SearchIcon,
  PinFilledIcon,
  ChatBubbleIcon,
  BillingIcon,
  TeamIcon,
  ArenaIcon,
  LockIcon,
  TrashIcon,
  KeyIcon,
} from '../icons';
import { MOCK_MODELS } from '../../data/mock';

const NAV_ITEMS: { key: AppView; label: string; icon: any }[] = [
  { key: 'chat',    label: 'Chats',            icon: ChatBubbleIcon },
  { key: 'arena',   label: 'Model Arena',      icon: ArenaIcon },
  { key: 'collabs', label: 'Workspaces',       icon: TeamIcon },
  { key: 'billing', label: 'Usage & billing',  icon: BillingIcon },
];

export function Sidebar() {
  const { sidebarOpen, activeView, setActiveView, isTempChatActive, setIsTempChatActive } = useUIStore();
  const { chats, currentChatId, setCurrentChatId, togglePinChat, createNewChat, deleteChat } = useChatStore();
  const { user, setKeyModalOpen, setAuthModalOpen, apiKeys } = useUserStore();

  const [search, setSearch] = useState('');
  const [pinnedOpen, setPinnedOpen] = useState(true);
  const [recentOpen, setRecentOpen] = useState(true);

  const filtered = useMemo(
    () => chats.filter((c) => c.title.toLowerCase().includes(search.toLowerCase())),
    [chats, search]
  );
  const pinned  = filtered.filter((c) => c.pinned);
  const recent  = filtered.filter((c) => !c.pinned);

  const hasConfiguredKeys = Boolean(apiKeys.openai || apiKeys.anthropic || apiKeys.google);

  if (!sidebarOpen) return null;

  return (
    <aside className="shrink-0 flex flex-col w-sidebar-w bg-hub-side border-r border-hub-border h-full select-none">
      {/* Logo Header */}
      <div className="flex items-center justify-between px-4 h-12 shrink-0 border-b border-hub-border">
        <span className="text-hub-accent text-hub-lg font-bold tracking-tight">☕ Data Coffee</span>
        <span className="text-[10px] text-hub-text-muted bg-hub-panel border border-hub-border px-1.5 py-0.5 rounded font-mono">
          Ctrl+K
        </span>
      </div>

      {/* Navigation Links */}
      <nav className="flex flex-col gap-0.5 px-2 pt-3 pb-1">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = (activeView === item.key || (item.key === 'collabs' && activeView === 'team-chats')) && !isTempChatActive;
          return (
            <button
              key={item.key}
              onClick={() => {
                setIsTempChatActive(false);
                setActiveView(item.key);
              }}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-hub-sm text-hub-sm font-medium transition-colors ${
                active ? 'bg-hub-active text-hub-text' : 'text-hub-text-sec hover:bg-hub-hover hover:text-hub-text'
              }`}
            >
              <Icon size={15} />
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* Chats Section */}
      {(activeView === 'chat' || activeView === 'team-chats') && (
        <div className="flex-1 flex flex-col min-h-0 border-t border-hub-border mt-1">
          {/* Action buttons */}
          <div className="px-2 pt-2.5 pb-1 flex flex-col gap-2">
            <div className="grid grid-cols-2 gap-1.5">
              <button
                onClick={() => {
                  setIsTempChatActive(false);
                  createNewChat();
                }}
                className="h-8 flex items-center justify-center gap-1.5 px-2 rounded-[8px] text-xs font-semibold text-hub-accent hover:bg-hub-hover transition-colors border border-hub-accent/25"
              >
                <PlusIcon size={13} />
                New Chat
              </button>

              <button
                onClick={() => {
                  setIsTempChatActive(true);
                  setActiveView('chat');
                }}
                className={`h-8 flex items-center justify-center gap-1.5 px-2 rounded-[8px] text-xs font-semibold transition-colors border ${
                  isTempChatActive
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    : 'text-amber-400 hover:bg-hub-hover border-amber-500/25'
                }`}
                title="Start an ephemeral, un-saved conversation"
              >
                <LockIcon size={13} />
                Temp Chat
              </button>
            </div>

            {/* Search Input */}
            <div className="relative flex items-center">
              <SearchIcon size={13} className="absolute left-2.5 text-hub-text-muted pointer-events-none" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search chats…"
                className="w-full h-8 pl-8 pr-3 rounded-[8px] bg-hub-bg border border-hub-border text-xs text-hub-text placeholder:text-hub-text-muted outline-none focus:border-hub-accent/60 transition-colors"
              />
            </div>
          </div>

          {/* Chat List */}
          <div className="flex-1 overflow-y-auto px-2 pb-3 space-y-0.5 mt-1">
            {pinned.length > 0 && (
              <ChatGroup label="Pinned" open={pinnedOpen} onToggle={() => setPinnedOpen(!pinnedOpen)}>
                {pinned.map((c) => (
                  <ChatRow
                    key={c.id}
                    chat={c}
                    active={!isTempChatActive && c.id === currentChatId}
                    onSelect={() => {
                      setIsTempChatActive(false);
                      setCurrentChatId(c.id);
                    }}
                    onTogglePin={() => togglePinChat(c.id)}
                    onDelete={() => deleteChat(c.id)}
                  />
                ))}
              </ChatGroup>
            )}
            {recent.length > 0 && (
              <ChatGroup label="Recent" open={recentOpen} onToggle={() => setRecentOpen(!recentOpen)}>
                {recent.map((c) => (
                  <ChatRow
                    key={c.id}
                    chat={c}
                    active={!isTempChatActive && c.id === currentChatId}
                    onSelect={() => {
                      setIsTempChatActive(false);
                      setCurrentChatId(c.id);
                    }}
                    onTogglePin={() => togglePinChat(c.id)}
                    onDelete={() => deleteChat(c.id)}
                  />
                ))}
              </ChatGroup>
            )}
          </div>
        </div>
      )}

      {/* Spacer when not on Chat view */}
      {activeView !== 'chat' && activeView !== 'team-chats' && <div className="flex-1" />}

      {/* BYOK API Key Button */}
      <div className="px-2 pb-1 border-t border-hub-border/50 pt-2">
        <button
          onClick={() => setKeyModalOpen(true)}
          className="w-full flex items-center justify-between px-3 py-1.5 rounded-[8px] text-xs font-medium text-hub-text-sec hover:text-hub-text hover:bg-hub-hover transition-colors"
        >
          <span className="flex items-center gap-2">
            <KeyIcon size={13} className={hasConfiguredKeys ? 'text-hub-accent' : 'text-hub-text-muted'} />
            API Keys (BYOK)
          </span>
          <span className={`text-[10.5px] font-semibold px-2 py-0.5 rounded-full ${hasConfiguredKeys ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' : 'bg-hub-panel text-hub-text-muted border border-hub-border'}`}>
            {hasConfiguredKeys ? 'Configured' : 'Auto'}
          </span>
        </button>
      </div>

      {/* User Footer / Auth Profile Trigger */}
      <button
        onClick={() => setAuthModalOpen(true)}
        className="shrink-0 flex items-center gap-2.5 px-3 py-2.5 border-t border-hub-border bg-hub-side hover:bg-hub-hover text-left transition-colors group cursor-pointer"
        title="Manage Account, NextAuth Session & Auto-Login"
      >
        <div className="shrink-0">
          <Avatar initials={user.avatar} size="sm" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-hub-text truncate leading-snug group-hover:text-hub-accent-hi transition-colors">{user.name}</span>
            <span className="text-[9.5px] font-bold px-1.5 py-0.2 rounded bg-hub-accent/15 text-hub-accent-hi border border-hub-accent/25">{user.plan}</span>
          </div>
          <div className="text-[11px] text-hub-text-muted truncate leading-tight">{user.email}</div>
        </div>
        <span className="text-xs text-hub-accent font-bold shrink-0 font-mono tracking-tight">${user.creditsRemaining.toFixed(2)}</span>
      </button>
    </aside>
  );
}

function ChatGroup({ label, open, onToggle, children }: { label: string; open: boolean; onToggle: () => void; children: React.ReactNode }) {
  return (
    <div>
      <button
        onClick={onToggle}
        className="flex items-center gap-1.5 px-2 py-1.5 w-full text-[10.5px] font-semibold text-hub-text-muted uppercase tracking-wide hover:text-hub-text-sec transition-colors"
      >
        <span>{open ? '▼' : '▶'}</span>
        {label}
      </button>
      {open && <div className="space-y-0.5">{children}</div>}
    </div>
  );
}

function ChatRow({
  chat,
  active,
  onSelect,
  onTogglePin,
  onDelete,
}: {
  chat: Chat;
  active: boolean;
  onSelect: () => void;
  onTogglePin: () => void;
  onDelete: () => void;
}) {
  const model = MOCK_MODELS.find((m) => m.id === chat.model);
  return (
    <div
      onClick={onSelect}
      onDoubleClick={onTogglePin}
      className={`group w-full flex items-center gap-2 px-3 py-2 rounded-hub-sm text-left transition-colors cursor-pointer ${
        active ? 'bg-hub-active text-hub-text' : 'text-hub-text-sec hover:bg-hub-hover hover:text-hub-text'
      }`}
      title="Double-click to pin/unpin"
    >
      <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: model?.color || '#888' }} />
      <span className="flex-1 truncate text-hub-sm">{chat.title}</span>

      {chat.pinned && <span className="text-hub-text-muted opacity-60 shrink-0"><PinFilledIcon size={11} /></span>}

      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        className="opacity-0 group-hover:opacity-100 p-0.5 text-hub-text-muted hover:text-red-400 transition-opacity"
        title="Delete chat"
      >
        <TrashIcon size={12} />
      </button>
    </div>
  );
}
