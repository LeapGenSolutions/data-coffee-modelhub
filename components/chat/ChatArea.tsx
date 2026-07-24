'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useChat } from 'ai/react';
import { useAppStore, MODELS } from '../../store/useAppStore';
import { ModelPicker } from './ModelPicker';
import { ChatMessage } from '../../types';

export function ChatArea() {
  const sidebarOpen = useAppStore((state) => state.sidebarOpen);
  const toggleSidebar = useAppStore((state) => state.toggleSidebar);
  const activeView = useAppStore((state) => state.activeView);
  const setActiveView = useAppStore((state) => state.setActiveView);
  const currentChatId = useAppStore((state) => state.currentChatId);
  const chats = useAppStore((state) => state.chats);
  const selectedModelId = useAppStore((state) => state.selectedModelId);
  const pendingFiles = useAppStore((state) => state.pendingFiles);
  const addPendingFile = useAppStore((state) => state.addPendingFile);
  const removePendingFile = useAppStore((state) => state.removePendingFile);
  const clearPendingFiles = useAppStore((state) => state.clearPendingFiles);
  const user = useAppStore((state) => state.user);
  const deductUsage = useAppStore((state) => state.deductUsage);
  const addChat = useAppStore((state) => state.addChat);
  const addMessageToChat = useAppStore((state) => state.addMessageToChat);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const activeChat = chats.find((c) => c.id === currentChatId);
  const selectedModel = MODELS.find((m) => m.id === selectedModelId) || MODELS[0];

  const { messages: apiMessages, input, handleInputChange, handleSubmit: handleSdkSubmit, isLoading } = useChat({
    api: '/api/chat',
    body: {
      model: selectedModelId,
    },
    onFinish: (message) => {
      if (currentChatId) {
        const assistantMsg: ChatMessage = {
          id: message.id,
          role: 'assistant',
          content: message.content,
          model: selectedModelId,
        };
        addMessageToChat(currentChatId, assistantMsg);
        deductUsage(message.content);
      }
    },
  });

  const displayMessages = activeChat ? activeChat.messages : [];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [displayMessages, isLoading]);

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    handleInputChange(e);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      Array.from(e.target.files).forEach((file) => {
        addPendingFile(file.name);
      });
      e.target.value = '';
    }
  };

  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const text = input.trim();
    if (!text && pendingFiles.length === 0) return;

    let targetChatId = currentChatId;

    if (!targetChatId) {
      const title = text ? (text.length > 32 ? `${text.slice(0, 32)}…` : text) : pendingFiles[0];
      const newChatId = Date.now();
      const newChat = {
        id: newChatId,
        title,
        model: selectedModelId,
        pinned: false,
        messages: [],
      };
      addChat(newChat);
      targetChatId = newChatId;
    }

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: text || 'Please review the attached document.',
      files: [...pendingFiles],
    };

    addMessageToChat(targetChatId, userMsg);
    deductUsage(userMsg.content + ' ' + (userMsg.files?.join(' ') || ''));

    const targetModel = MODELS.find((m) => m.id === selectedModelId) || MODELS[0];
    
    clearPendingFiles();
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    handleSdkSubmit(e as any);

    setTimeout(() => {
      const cannedReplies = [
        `<p>Good question — here's a quick take. The main thing to get right is the goal: once that's clear, the structure follows naturally. Want me to expand any part of this?</p>`,
        `<p>Here's a concise answer:</p><p>Start simple, verify it works, then layer on complexity. Most problems in this area come from doing those steps in the opposite order.</p>`,
        `<p>I've looked at what you sent. The short version: the approach is sound, but watch the edge cases — empty inputs and very large values are where it will break first.</p>`,
      ];
      const selectedReply = cannedReplies[Math.floor(Math.random() * cannedReplies.length)];

      const assistantMsg: ChatMessage = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        model: targetModel.id,
        content: selectedReply,
      };

      addMessageToChat(targetChatId!, assistantMsg);
      deductUsage(selectedReply);
    }, 1000);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 min-h-0 bg-hub-bg">
      {/* ─── Top Bar ─── */}
      <header className="h-[52px] flex items-center justify-between gap-3 px-5 border-b border-hub-border bg-hub-bg shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          {!sidebarOpen && (
            <button
              onClick={toggleSidebar}
              title="Show sidebar"
              className="p-1.5 rounded-lg text-hub-text-sec hover:bg-hub-hover hover:text-hub-text transition-colors shrink-0"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <rect x="1.5" y="2.5" width="13" height="11" rx="2" stroke="currentColor" strokeWidth="1.4" />
                <path d="M6 2.5v11" stroke="currentColor" strokeWidth="1.4" />
              </svg>
            </button>
          )}
          <h1 className="font-semibold text-[14px] truncate text-hub-text leading-none">
            {activeChat ? activeChat.title : 'New chat'}
          </h1>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Usage chips - hidden on small screens */}
          <div className="hidden lg:flex items-center gap-2">
            <div className="bg-hub-panel border border-hub-border rounded-[9px] px-2.5 py-[6px]">
              <div className="text-[9.5px] uppercase tracking-wider text-hub-text-muted font-semibold leading-none">Credits</div>
              <div className="text-[13px] font-bold text-hub-text leading-none mt-[3px]">{user.creditsRemaining.toFixed(2)}</div>
            </div>
            <div className="bg-hub-panel border border-hub-border rounded-[9px] px-2.5 py-[6px]">
              <div className="text-[9.5px] uppercase tracking-wider text-hub-text-muted font-semibold leading-none">Tokens</div>
              <div className="text-[13px] font-bold text-hub-text leading-none mt-[3px]">{new Intl.NumberFormat('en-US').format(user.tokensUsed)}</div>
            </div>
          </div>

          {/* User chip */}
          <button
            onClick={() => setActiveView('billing')}
            title="Account and billing"
            className="flex items-center gap-2 border border-hub-border bg-hub-panel hover:bg-hub-hover rounded-[9px] px-2 py-[5px] transition-colors"
          >
            <span className="w-[26px] h-[26px] rounded-full bg-gradient-to-br from-[#3B4A6B] to-[#25324E] text-white flex items-center justify-center font-bold text-[10.5px] shrink-0 border border-white/10">
              {user.avatar}
            </span>
            <span className="hidden md:flex flex-col items-start leading-none text-left">
              <strong className="text-[12px] font-semibold text-hub-text">{user.name}</strong>
              <span className="text-[10px] text-hub-text-muted mt-[1px]">{user.plan}</span>
            </span>
          </button>

          <ModelPicker position="top" />
        </div>
      </header>

      {/* ─── Chat Feed / Empty State ─── */}
      <div className="flex-1 overflow-y-auto min-h-0 py-6">
        {!activeChat || displayMessages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center px-4">
            <h2 className="text-[22px] font-bold text-hub-text mb-1.5 tracking-tight">How can I help you today?</h2>
            <p className="text-hub-text-sec text-[13px] max-w-md leading-relaxed">
              Pick a model from the switcher above (or below), attach a document if you need to, and start typing.
            </p>
          </div>
        ) : (
          <div className="max-w-[740px] mx-auto px-5 flex flex-col gap-5">
            {displayMessages.map((m) => {
              if (m.role === 'user') {
                return (
                  <div key={m.id} className="flex gap-3 animate-fade-in">
                    <div className="w-[28px] h-[28px] rounded-lg bg-gradient-to-br from-[#3B4A6B] to-[#25324E] text-white flex items-center justify-center font-bold text-[10.5px] shrink-0 mt-0.5 border border-white/10">
                      U
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-[13px] text-hub-text">You</span>
                      </div>
                      {m.files && m.files.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-2">
                          {m.files.map((file, i) => (
                            <span
                              key={i}
                              className="inline-flex items-center gap-1.5 bg-hub-hover border border-hub-border rounded-lg px-2.5 py-1 text-[11px] text-hub-text-sec"
                            >
                              <svg width="12" height="12" viewBox="0 0 13 13" fill="none" className="text-hub-accent-hi shrink-0">
                                <path d="M3 1.5h5L11 4.5v7a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
                                <path d="M8 1.5v3h3" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
                              </svg>
                              {file}
                            </span>
                          ))}
                        </div>
                      )}
                      <div className="bg-hub-panel border border-hub-border rounded-xl px-3.5 py-2.5 text-[13.5px] text-hub-text leading-[1.55]">
                        {m.content}
                      </div>
                    </div>
                  </div>
                );
              }

              const md = MODELS.find((x) => x.id === m.model) || selectedModel;

              return (
                <div key={m.id} className="flex gap-3 animate-fade-in">
                  <div
                    className="w-[28px] h-[28px] rounded-lg text-white flex items-center justify-center font-bold text-[10.5px] shrink-0 mt-0.5 border border-white/10"
                    style={{ backgroundColor: md.color }}
                  >
                    {md.provider[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-[13px] text-hub-text">Assistant</span>
                      <span className="inline-flex items-center gap-1 px-2 py-[2px] rounded-full border border-hub-border text-[10px] text-hub-text-sec">
                        <span className="w-[5px] h-[5px] rounded-full shrink-0" style={{ backgroundColor: md.color }} />
                        {md.name}
                      </span>
                    </div>
                    <div
                      className="text-[13.5px] text-hub-text leading-[1.6] space-y-2"
                      dangerouslySetInnerHTML={{ __html: m.content }}
                    />
                  </div>
                </div>
              );
            })}

            {isLoading && (
              <div className="flex gap-3">
                <div
                  className="w-[28px] h-[28px] rounded-lg text-white flex items-center justify-center font-bold text-[10.5px] shrink-0 mt-0.5 border border-white/10"
                  style={{ backgroundColor: selectedModel.color }}
                >
                  {selectedModel.provider[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-[13px] text-hub-text">Assistant</span>
                    <span className="inline-flex items-center gap-1 px-2 py-[2px] rounded-full border border-hub-border text-[10px] text-hub-text-sec">
                      <span className="w-[5px] h-[5px] rounded-full shrink-0" style={{ backgroundColor: selectedModel.color }} />
                      {selectedModel.name}
                    </span>
                  </div>
                  <div className="inline-flex items-center gap-1 py-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-hub-text-muted animate-blink" />
                    <span className="w-1.5 h-1.5 rounded-full bg-hub-text-muted animate-blink [animation-delay:0.2s]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-hub-text-muted animate-blink [animation-delay:0.4s]" />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* ─── Composer ─── */}
      <div className="px-5 pb-3 pt-2">
        <div className="max-w-[740px] mx-auto bg-hub-panel border border-hub-border focus-within:border-hub-accent/60 rounded-2xl px-3.5 pt-3 pb-2.5 transition-colors shadow-lg shadow-black/10">
          {pendingFiles.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {pendingFiles.map((file) => (
                <span
                  key={file}
                  className="inline-flex items-center gap-1.5 bg-hub-hover border border-hub-border rounded-lg px-2.5 py-1 text-[11px] text-hub-text-sec"
                >
                  <svg width="12" height="12" viewBox="0 0 13 13" fill="none" className="text-hub-accent-hi shrink-0">
                    <path d="M3 1.5h5L11 4.5v7a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
                    <path d="M8 1.5v3h3" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
                  </svg>
                  {file}
                  <button
                    onClick={() => removePendingFile(file)}
                    className="ml-0.5 text-hub-text-muted hover:text-red-400 text-[10px]"
                    title="Remove file"
                  >
                    ✕
                  </button>
                </span>
              ))}
            </div>
          )}

          <textarea
            ref={textareaRef}
            rows={1}
            value={input}
            onChange={handleTextareaChange}
            onKeyDown={handleKeyDown}
            placeholder={`Message ${selectedModel.name}…`}
            className="w-full bg-transparent border-none outline-none resize-none text-hub-text placeholder:text-hub-text-muted text-[13.5px] leading-relaxed max-h-[180px]"
          />

          <div className="flex items-center gap-1.5 mt-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              hidden
              multiple
              accept=".pdf,.doc,.docx,.txt,.md,.csv,.xlsx,.png,.jpg,.jpeg"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              title="Upload document"
              className="p-1.5 rounded-lg text-hub-text-sec hover:bg-hub-hover hover:text-hub-text transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M14 7 8.6 12.4a3.4 3.4 0 0 1-4.8-4.8L9.2 2.2a2.26 2.26 0 0 1 3.2 3.2L7 10.8a1.13 1.13 0 0 1-1.6-1.6L10.2 4.4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
            </button>

            <ModelPicker position="bottom" />

            <button
              type="button"
              onClick={() => handleSend()}
              disabled={!input.trim() && pendingFiles.length === 0}
              className="w-[32px] h-[32px] rounded-[9px] bg-hub-accent hover:bg-hub-accent-hi text-white flex items-center justify-center ml-auto disabled:bg-hub-hover disabled:text-hub-text-muted disabled:cursor-not-allowed transition-all active:scale-95"
            >
              <svg width="14" height="14" viewBox="0 0 15 15" fill="none">
                <path d="M7.5 12.5v-9M3.5 7 7.5 3l4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        </div>
        <div className="max-w-[740px] mx-auto mt-1.5 text-center text-[10.5px] text-hub-text-muted">
          Responses are simulated with Vercel AI SDK streaming. Model switching, uploads, and history are functional.
        </div>
      </div>
    </div>
  );
}
