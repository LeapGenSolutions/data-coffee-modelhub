'use client';

import React, { useState } from 'react';
import { useAppStore, MODELS } from '../../store/useAppStore';

export function TeamSpace() {
  const activeView = useAppStore((state) => state.activeView);
  const setActiveView = useAppStore((state) => state.setActiveView);
  const workspaces = useAppStore((state) => state.workspaces);
  const currentWorkspaceId = useAppStore((state) => state.currentWorkspaceId);
  const setCurrentWorkspaceId = useAppStore((state) => state.setCurrentWorkspaceId);
  const addTeamDocument = useAppStore((state) => state.addTeamDocument);
  const selectedModelId = useAppStore((state) => state.selectedModelId);

  const [activeTeamChatIndex, setActiveTeamChatIndex] = useState<number | null>(0);
  const [selectedTeamDocs, setSelectedTeamDocs] = useState<string[]>([]);
  const [docFilter, setDocFilter] = useState('');
  const [teamInputText, setTeamInputText] = useState('');
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('Editor');
  const [copiedLink, setCopiedLink] = useState(false);

  const currentWorkspace = workspaces.find((w) => w.id === currentWorkspaceId) || workspaces[0];

  const filteredDocs = currentWorkspace.documents.filter((d) =>
    d.name.toLowerCase().includes(docFilter.toLowerCase())
  );

  const activeChat =
    activeTeamChatIndex !== null && currentWorkspace.chats[activeTeamChatIndex]
      ? currentWorkspace.chats[activeTeamChatIndex]
      : null;

  const toggleDocSelection = (name: string) => {
    setSelectedTeamDocs((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]
    );
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      Array.from(e.target.files).forEach((file) => {
        addTeamDocument(currentWorkspace.id, {
          name: file.name,
          info: `${Math.max(1, Math.round(file.size / 1024))} KB`,
          uploadedBy: 'You',
        });
      });
      e.target.value = '';
    }
  };

  const handleSendTeamMessage = () => {
    if (!teamInputText.trim() && selectedTeamDocs.length === 0) return;

    const userMsg = {
      id: `tm-${Date.now()}`,
      role: 'user' as const,
      content: teamInputText || 'Please review the selected team documents.',
      files: [...selectedTeamDocs],
    };

    if (activeChat) {
      activeChat.messages.push(userMsg);
      activeChat.messages.push({
        id: `tm-reply-${Date.now()}`,
        role: 'assistant' as const,
        model: selectedModelId,
        content: '<p>I reviewed the shared workspace context and selected documents. Here is a coordinated response the team can continue working from.</p>',
      });
    }

    setTeamInputText('');
    setSelectedTeamDocs([]);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="flex-1 overflow-y-auto min-h-0 bg-hub-bg text-hub-text selection:bg-hub-accent selection:text-white">
      {/* Collabs View */}
      {activeView === 'collabs' && (
        <div className="max-w-[1280px] mx-auto p-6 sm:p-8 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-7">
            <div>
              <h1 className="text-[22px] sm:text-[26px] font-bold text-hub-text leading-tight mb-1 tracking-tight">
                Team Collabs
              </h1>
              <p className="text-hub-text-sec text-[12px] sm:text-[13px]">
                See every workspace shared with you, team members involved, and each team’s usage.
              </p>
            </div>
            <div className="flex items-center gap-2.5 shrink-0">
              <button
                onClick={handleCopyLink}
                className="border border-hub-border bg-hub-panel hover:bg-hub-hover text-hub-text rounded-[9px] px-3.5 py-2 text-[12px] font-semibold transition-all duration-200 shadow-sm active:scale-95"
              >
                {copiedLink ? '✓ Copied!' : 'Copy invite link'}
              </button>
              <button
                onClick={() => setInviteModalOpen(true)}
                className="bg-hub-accent hover:bg-hub-accent-hi text-white rounded-[9px] px-4 py-2 text-[12px] font-semibold transition-all duration-200 shadow-md shadow-hub-accent/20 hover:shadow-hub-accent/30 active:scale-95"
              >
                Invite teammate
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {workspaces.map((space) => (
              <button
                key={space.id}
                onClick={() => {
                  setCurrentWorkspaceId(space.id);
                  setActiveView('team-chats');
                }}
                className="bg-hub-panel/90 backdrop-blur-md border border-hub-border hover:border-hub-accent/40 hover:bg-[#222526] rounded-xl p-4 text-left transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-black/50 group relative overflow-hidden"
              >
                {/* Subtle card ambient highlight */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-hub-accent/5 rounded-full blur-2xl group-hover:bg-hub-accent/10 transition-all pointer-events-none" />

                <div className="flex justify-between gap-3 items-start mb-3">
                  <div>
                    <h2 className="font-bold text-[16px] text-hub-text group-hover:text-white mb-0.5 transition-colors tracking-tight leading-tight">
                      {space.name}
                    </h2>
                    <p className="text-hub-text-sec text-[11.5px] leading-relaxed max-w-md">
                      {space.description}
                    </p>
                  </div>
                  <span className="text-[10.5px] px-2.5 py-1 rounded-full bg-[rgba(16,163,127,0.14)] text-[#75ddc0] border border-[rgba(16,163,127,0.25)] font-semibold shrink-0 shadow-sm">
                    Shared
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2.5 my-4">
                  <div className="bg-hub-bg/80 border border-hub-border/80 rounded-xl p-3 backdrop-blur-sm">
                    <span className="block text-[10px] uppercase tracking-wider text-hub-text-muted font-semibold">
                      Members
                    </span>
                    <strong className="block text-base font-extrabold text-hub-text mt-0.5">
                      {space.members.length}
                    </strong>
                  </div>
                  <div className="bg-hub-bg/80 border border-hub-border/80 rounded-xl p-3 backdrop-blur-sm">
                    <span className="block text-[10px] uppercase tracking-wider text-hub-text-muted font-semibold">
                      Tokens
                    </span>
                    <strong className="block text-base font-extrabold text-hub-text mt-0.5">
                      {new Intl.NumberFormat('en-US').format(space.tokens)}
                    </strong>
                  </div>
                  <div className="bg-hub-bg/80 border border-hub-border/80 rounded-xl p-3 backdrop-blur-sm">
                    <span className="block text-[10px] uppercase tracking-wider text-hub-text-muted font-semibold">
                      Credits
                    </span>
                    <strong className="block text-base font-extrabold text-hub-text mt-0.5">
                      {space.credits.toFixed(2)}
                    </strong>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 text-xs text-hub-text-muted pt-1 border-t border-hub-border/40">
                  {/* Clean stacked member avatars */}
                  <div className="flex items-center pl-1">
                    {space.members.slice(0, 5).map((m, idx) => (
                      <span
                        key={idx}
                        title={`${m.name} (${m.role})`}
                        className={`w-7.5 h-7.5 rounded-full flex items-center justify-center text-[11px] font-bold text-white border-2 border-hub-panel shadow-md transition-transform group-hover:scale-105 ${
                          idx > 0 ? '-ml-2.5' : ''
                        }`}
                        style={{ backgroundColor: m.color }}
                      >
                        {m.initials}
                      </span>
                    ))}
                  </div>
                  <span className="group-hover:text-hub-accent-hi transition-colors font-medium flex items-center gap-1">
                    {space.chats.length} team chats · {space.documents.length} files <span className="transition-transform group-hover:translate-x-1">→</span>
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Team Chats View */}
      {activeView === 'team-chats' && (
        <div className="h-screen grid grid-cols-1 md:grid-cols-[220px_minmax(0,1fr)] lg:grid-cols-[220px_minmax(0,1fr)_280px] overflow-hidden">
          {/* Left Column: Workspace Selector & Team Chat List */}
          <aside className="bg-hub-side border-r border-hub-border p-3.5 overflow-y-auto hidden md:block select-none">
            <h2 className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-hub-text-muted mb-2">Select workspace</h2>
            <select
              value={currentWorkspaceId}
              onChange={(e) => setCurrentWorkspaceId(e.target.value)}
              className="w-full bg-hub-panel border border-hub-border rounded-[9px] p-2 text-[12px] text-hub-text mb-3 outline-none focus:border-hub-accent transition-colors cursor-pointer"
            >
              {workspaces.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>

            <button
              onClick={() => {
                setActiveTeamChatIndex(null);
                setSelectedTeamDocs([]);
              }}
              className="w-full bg-hub-accent hover:bg-hub-accent-hi text-white rounded-[9px] py-2 text-[12px] font-semibold mb-3 transition-all duration-200 shadow-md shadow-hub-accent/15 active:scale-95"
            >
              + New team chat
            </button>

            <h2 className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-hub-text-muted mb-2">Team chats</h2>
            <div className="space-y-1">
              {currentWorkspace.chats.map((c, i) => {
                const model = MODELS.find((m) => m.id === c.model);
                const isActive = i === activeTeamChatIndex;
                return (
                  <button
                    key={c.id}
                    onClick={() => {
                      setActiveTeamChatIndex(i);
                      setSelectedTeamDocs([]);
                    }}
                    className={`w-full text-left p-2.5 rounded-[9px] transition-all duration-150 ${
                      isActive
                        ? 'bg-hub-active text-hub-text font-semibold shadow-sm border border-hub-border/60'
                        : 'text-hub-text-sec hover:bg-hub-hover hover:text-hub-text'
                    }`}
                  >
                    <strong className="block text-[13px] truncate">{c.title}</strong>
                    <span className="text-[10.5px] text-hub-text-muted">{model?.name || 'Model'} · Shared</span>
                  </button>
                );
              })}
            </div>
          </aside>

          {/* Center Column: Chat Messages & Composer */}
          <div className="flex flex-col min-w-0 min-h-0 bg-hub-bg">
            <header className="h-[52px] flex items-center justify-between gap-3 px-5 border-b border-hub-border bg-hub-bg/80 backdrop-blur-md shrink-0">
              <div>
                <strong className="block text-[14px] text-hub-text font-semibold leading-none">
                  {activeChat ? activeChat.title : 'New team chat'}
                </strong>
                <span className="text-[10.5px] text-hub-text-muted leading-none mt-[2px]">
                  {currentWorkspace.name} · {currentWorkspace.members.length} teammates
                </span>
              </div>
            </header>

            <div className="flex-1 overflow-y-auto p-5">
              {!activeChat || activeChat.messages.length === 0 ? (
                <div className="h-full grid place-items-center text-center p-6 text-hub-text-sec">
                  <div className="max-w-sm">
                    <div className="w-12 h-12 rounded-2xl bg-hub-panel border border-hub-border grid place-items-center mx-auto mb-3 text-hub-accent-hi text-xl">
                      💬
                    </div>
                    <h2 className="text-[18px] font-bold text-hub-text mb-1">Start a team conversation</h2>
                    <p className="text-[12px] text-hub-text-sec leading-relaxed">
                      Select team documents on the right, choose a model, and send your first message.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="max-w-[760px] mx-auto space-y-5">
                  {activeChat.messages.map((m) => (
                    <div key={m.id} className="flex gap-3 animate-in fade-in duration-200">
                      <div
                        className={`w-[30px] h-[30px] rounded-lg flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 text-white shadow-sm ${
                          m.role === 'user' ? 'bg-[#3B4A6B]' : 'bg-hub-accent'
                        }`}
                      >
                        {m.role === 'user' ? 'U' : 'AI'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-[13px] text-hub-text">
                            {m.role === 'user' ? 'You' : 'Assistant'}
                          </span>
                        </div>
                        {m.files && m.files.length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-2">
                            {m.files.map((file, idx) => (
                              <span
                                key={idx}
                                className="inline-flex items-center gap-1.5 bg-hub-hover border border-hub-border rounded-[9px] px-2.5 py-1 text-xs text-hub-text-sec"
                              >
                                📄 {file}
                              </span>
                            ))}
                          </div>
                        )}
                        <div
                          className="text-[14px] text-hub-text leading-[1.55] bg-hub-panel border border-hub-border rounded-[12px] p-3.5 shadow-sm"
                          dangerouslySetInnerHTML={{ __html: m.content }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 pt-0">
              <div className="max-w-[760px] mx-auto bg-hub-panel border border-hub-border focus-within:border-hub-accent rounded-[16px] p-3.5 shadow-lg transition-colors">
                <div className="text-[11px] font-medium text-hub-text-muted mb-2">
                  {selectedTeamDocs.length > 0
                    ? `${selectedTeamDocs.length} team document${selectedTeamDocs.length > 1 ? 's' : ''} selected: ${selectedTeamDocs.join(', ')}`
                    : 'No team documents selected'}
                </div>
                <textarea
                  rows={1}
                  value={teamInputText}
                  onChange={(e) => setTeamInputText(e.target.value)}
                  placeholder="Message your team workspace…"
                  className="w-full bg-transparent border-none outline-none resize-none text-hub-text placeholder:text-hub-text-muted text-[14px] leading-relaxed max-h-[160px]"
                />
                <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-hub-border/60">
                  <span className="text-[11px] text-hub-text-muted">Visible to workspace members</span>
                  <button
                    onClick={handleSendTeamMessage}
                    disabled={!teamInputText.trim() && selectedTeamDocs.length === 0}
                    className="w-[34px] h-[34px] rounded-[9px] bg-hub-accent hover:bg-hub-accent-hi text-white flex items-center justify-center font-bold text-sm disabled:bg-hub-hover disabled:text-hub-text-muted disabled:cursor-not-allowed transition-all active:scale-95"
                  >
                    ↑
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Team Documents List */}
          <aside className="bg-hub-side border-l border-hub-border p-3.5 overflow-y-auto hidden lg:block select-none">
            <h2 className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-hub-text-muted mb-2">Team documents</h2>
            <input type="file" id="team-file-input" onChange={handleFileUpload} hidden multiple />
            <button
              onClick={() => document.getElementById('team-file-input')?.click()}
              className="w-full border border-dashed border-hub-border hover:border-hub-accent/50 hover:bg-hub-hover rounded-[10px] py-2.5 px-3 text-xs text-hub-text-sec hover:text-hub-text mb-3.5 transition-all duration-200 text-center font-medium"
            >
              ＋ Upload to workspace
            </button>

            <div className="mb-3.5">
              <input
                type="text"
                value={docFilter}
                onChange={(e) => setDocFilter(e.target.value)}
                placeholder="Search documents"
                className="w-full bg-hub-panel border border-hub-border rounded-[9px] p-2.5 text-xs text-hub-text outline-none focus:border-hub-accent transition-colors"
              />
            </div>

            <div className="space-y-2">
              {filteredDocs.map((doc) => {
                const isSelected = selectedTeamDocs.includes(doc.name);
                return (
                  <button
                    key={doc.name}
                    onClick={() => toggleDocSelection(doc.name)}
                    className={`flex items-start gap-2.5 w-full text-left bg-hub-panel border rounded-[10px] p-2.5 transition-all duration-150 ${
                      isSelected
                        ? 'border-hub-accent bg-hub-hover shadow-sm'
                        : 'border-hub-border hover:border-hub-text-muted'
                    }`}
                  >
                    <span
                      className={`w-4 h-4 border border-hub-border rounded-[5px] flex items-center justify-center shrink-0 mt-0.5 text-[10px] font-bold transition-all ${
                        isSelected ? 'bg-hub-accent text-white border-hub-accent shadow-sm' : 'text-transparent'
                      }`}
                    >
                      ✓
                    </span>
                    <div className="min-w-0 flex-1">
                      <strong className="block text-xs font-semibold text-hub-text truncate">{doc.name}</strong>
                      <span className="text-[10.5px] text-hub-text-muted">{doc.info} · Uploaded by {doc.uploadedBy}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </aside>
        </div>
      )}

      {/* Invite Teammate Modal */}
      {inviteModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm grid place-items-center p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-hub-panel border border-hub-border rounded-2xl p-6 shadow-2xl relative overflow-hidden">
            <h2 className="text-[16px] font-bold text-hub-text mb-0.5">Invite teammate</h2>
            <p className="text-[11.5px] text-hub-text-sec mb-4">Give a teammate access to the selected project space.</p>

            <label className="block text-xs font-medium text-hub-text-sec mb-1.5">Email address</label>
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="teammate@company.com"
              className="w-full bg-hub-bg border border-hub-border rounded-[9px] p-2.5 text-xs text-hub-text outline-none focus:border-hub-accent mb-4 transition-colors"
            />

            <label className="block text-xs font-medium text-hub-text-sec mb-1.5">Role</label>
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value)}
              className="w-full bg-hub-bg border border-hub-border rounded-[9px] p-2.5 text-xs text-hub-text outline-none focus:border-hub-accent mb-6 transition-colors"
            >
              <option>Editor</option>
              <option>Viewer</option>
              <option>Admin</option>
            </select>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setInviteModalOpen(false)}
                className="border border-hub-border hover:bg-hub-hover text-hub-text rounded-[9px] px-4 py-2 text-xs font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setInviteModalOpen(false);
                  setInviteEmail('');
                }}
                className="bg-hub-accent hover:bg-hub-accent-hi text-white rounded-[9px] px-4 py-2 text-xs font-semibold transition-all duration-200 shadow-md shadow-hub-accent/20 active:scale-95"
              >
                Send invitation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
