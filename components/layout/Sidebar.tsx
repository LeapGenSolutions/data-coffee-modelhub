'use client';

import React from 'react';
import { useAppStore, MODELS } from '../../store/useAppStore';

export function Sidebar() {
  const sidebarOpen = useAppStore((state) => state.sidebarOpen);
  const toggleSidebar = useAppStore((state) => state.toggleSidebar);
  const activeView = useAppStore((state) => state.activeView);
  const setActiveView = useAppStore((state) => state.setActiveView);
  const currentChatId = useAppStore((state) => state.currentChatId);
  const setCurrentChatId = useAppStore((state) => state.setCurrentChatId);
  const chats = useAppStore((state) => state.chats);
  const togglePinChat = useAppStore((state) => state.togglePinChat);
  const createNewChat = useAppStore((state) => state.createNewChat);
  const user = useAppStore((state) => state.user);

  const pinnedChats = chats.filter((c) => c.pinned);
  const recentChats = chats.filter((c) => !c.pinned);

  if (!sidebarOpen) return null;

  return (
    <aside className="w-[264px] bg-hub-side border-r border-hub-border flex flex-col h-screen shrink-0 transition-all duration-300 z-30 select-none">
      {/* ─── Sidebar Header ─── */}
      <div className="px-3 pt-3.5 pb-2.5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-hub-accent-hi to-hub-accent text-white grid place-items-center text-sm font-extrabold shrink-0 shadow-md shadow-hub-accent/25">
              M
            </span>
            <div className="leading-none">
              <div className="font-bold text-[15px] text-hub-text tracking-tight">
                Data Coffee
              </div>
              <div className="text-[10.5px] text-hub-text-muted font-medium mt-[2px]">
                Model Hub
              </div>
            </div>
          </div>
          <button
            onClick={toggleSidebar}
            title="Hide sidebar"
            aria-label="Hide sidebar"
            className="p-1.5 rounded-lg text-hub-text-sec hover:bg-hub-hover hover:text-hub-text transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <rect x="1.5" y="2.5" width="13" height="11" rx="2" stroke="currentColor" strokeWidth="1.4" />
              <path d="M6 2.5v11" stroke="currentColor" strokeWidth="1.4" />
            </svg>
          </button>
        </div>

        <button
          onClick={createNewChat}
          className="flex items-center justify-center gap-2 w-full border border-hub-border/80 hover:border-hub-accent/40 bg-hub-panel/60 hover:bg-hub-hover text-hub-text rounded-[10px] px-3 py-[9px] text-[13px] font-semibold transition-all duration-200 shadow-sm active:scale-[0.97] group"
        >
          <svg width="13" height="13" viewBox="0 0 14 14" fill="none" className="text-hub-accent-hi group-hover:scale-110 transition-transform">
            <path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
          New chat
        </button>
      </div>

      {/* ─── Scrollable Navigation ─── */}
      <nav className="flex-1 overflow-y-auto px-2 py-0.5 space-y-0.5 min-h-0">
        {/* Workspace Section */}
        <div className="text-[10.5px] font-semibold tracking-[0.08em] uppercase text-hub-text-muted px-2.5 pt-4 pb-1">
          Workspace
        </div>
        <button
          onClick={() => setActiveView('billing')}
          className={`flex items-center gap-2.5 w-full text-left px-2.5 py-[7px] rounded-[9px] text-[13px] font-medium transition-all duration-150 ${
            activeView === 'billing'
              ? 'bg-hub-hover text-hub-text font-semibold'
              : 'text-hub-text-sec hover:bg-hub-hover/70 hover:text-hub-text'
          }`}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="text-hub-accent-hi shrink-0">
            <path d="M2 11V7m3 4V3m3 8V5m3 6V1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <span>Usage & billing</span>
        </button>

        {/* Shared Workspace Section */}
        <div className="text-[10.5px] font-semibold tracking-[0.08em] uppercase text-hub-text-muted px-2.5 pt-4 pb-1">
          Shared Workspace
        </div>
        <button
          onClick={() => setActiveView('collabs')}
          className={`flex items-center gap-2.5 w-full text-left px-2.5 py-[7px] rounded-[9px] text-[13px] font-medium transition-all duration-150 ${
            activeView === 'collabs'
              ? 'bg-hub-hover text-hub-text font-semibold'
              : 'text-hub-text-sec hover:bg-hub-hover/70 hover:text-hub-text'
          }`}
        >
          <span className="w-[18px] h-[18px] border border-hub-border/80 rounded-[5px] grid place-items-center text-[10px] text-hub-accent-hi shrink-0">
            ⌘
          </span>
          <span>Team Collabs</span>
        </button>
        <button
          onClick={() => setActiveView('team-chats')}
          className={`flex items-center gap-2.5 w-full text-left px-2.5 py-[7px] rounded-[9px] text-[13px] font-medium transition-all duration-150 ${
            activeView === 'team-chats'
              ? 'bg-hub-hover text-hub-text font-semibold'
              : 'text-hub-text-sec hover:bg-hub-hover/70 hover:text-hub-text'
          }`}
        >
          <span className="w-[18px] h-[18px] border border-hub-border/80 rounded-[5px] grid place-items-center text-[10px] text-hub-accent-hi shrink-0">
            ⌘
          </span>
          <span>Team Chats</span>
        </button>

        {/* Pinned Section */}
        {pinnedChats.length > 0 && (
          <>
            <div className="text-[10.5px] font-semibold tracking-[0.08em] uppercase text-hub-text-muted px-2.5 pt-4 pb-1">
              Pinned
            </div>
            {pinnedChats.map((c) => {
              const model = MODELS.find((m) => m.id === c.model) || MODELS[0];
              const isActive = activeView === 'chat' && c.id === currentChatId;
              return (
                <div
                  key={c.id}
                  onClick={() => setCurrentChatId(c.id)}
                  className={`group flex items-center gap-2.5 w-full text-left px-2.5 py-[7px] rounded-[9px] cursor-pointer transition-all duration-150 ${
                    isActive
                      ? 'bg-hub-active text-hub-text font-semibold'
                      : 'text-hub-text-sec hover:bg-hub-hover/70 hover:text-hub-text'
                  }`}
                >
                  <span
                    className="w-[7px] h-[7px] rounded-full shrink-0"
                    style={{ backgroundColor: model.color }}
                  />
                  <span className="flex-1 min-w-0 truncate text-[13px]">{c.title}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      togglePinChat(c.id);
                    }}
                    title="Unpin"
                    className="text-amber-400 p-0.5 rounded hover:bg-hub-hover transition-opacity"
                  >
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                      <path d="M7.5 1.5 10.5 4.5 8 5.5 6.5 9 5 7.5 2 10.5 4.5 7 3 5.5 6.5 4z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
                    </svg>
                  </button>
                </div>
              );
            })}
          </>
        )}

        {/* Recents Section */}
        <div className="text-[10.5px] font-semibold tracking-[0.08em] uppercase text-hub-text-muted px-2.5 pt-4 pb-1">
          Recents
        </div>
        {recentChats.map((c) => {
          const model = MODELS.find((m) => m.id === c.model) || MODELS[0];
          const isActive = activeView === 'chat' && c.id === currentChatId;
          return (
            <div
              key={c.id}
              onClick={() => setCurrentChatId(c.id)}
              className={`group flex items-center gap-2.5 w-full text-left px-2.5 py-[7px] rounded-[9px] cursor-pointer transition-all duration-150 ${
                isActive
                  ? 'bg-hub-active text-hub-text font-semibold'
                  : 'text-hub-text-sec hover:bg-hub-hover/70 hover:text-hub-text'
              }`}
            >
              <span
                className="w-[7px] h-[7px] rounded-full shrink-0"
                style={{ backgroundColor: model.color }}
              />
              <span className="flex-1 min-w-0 truncate text-[13px]">{c.title}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  togglePinChat(c.id);
                }}
                title="Pin chat"
                className="opacity-0 group-hover:opacity-100 text-hub-text-muted hover:text-amber-400 p-0.5 rounded hover:bg-hub-hover transition-all"
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M7.5 1.5 10.5 4.5 8 5.5 6.5 9 5 7.5 2 10.5 4.5 7 3 5.5 6.5 4z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
          );
        })}
      </nav>

      {/* ─── Sidebar Footer ─── */}
      <div className="border-t border-hub-border px-3 py-3 flex items-center gap-2.5 bg-hub-side shrink-0">
        <div className="w-[30px] h-[30px] rounded-full bg-gradient-to-br from-[#3B4A6B] to-[#25324E] text-white flex items-center justify-center font-bold text-[11px] shrink-0 border border-white/10">
          {user.avatar}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-[12.5px] text-hub-text leading-tight truncate">{user.name}</div>
          <div className="text-[10.5px] text-hub-text-muted leading-tight">{user.plan}</div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-[11px] font-bold text-hub-accent-hi leading-tight">{user.creditsRemaining.toFixed(2)} credits</div>
          <div className="text-[10px] text-hub-text-muted leading-tight">{new Intl.NumberFormat('en-US').format(user.tokensUsed)} tokens</div>
        </div>
      </div>
    </aside>
  );
}
