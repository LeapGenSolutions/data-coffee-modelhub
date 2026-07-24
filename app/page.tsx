'use client';

import React from 'react';
import { useAppStore } from '../store/useAppStore';
import { Sidebar } from '../components/layout/Sidebar';
import { ChatArea } from '../components/chat/ChatArea';
import { UsageDashboard } from '../components/dashboard/UsageDashboard';
import { TeamSpace } from '../components/workspace/TeamSpace';

export default function Home() {
  const activeView = useAppStore((state) => state.activeView);

  return (
    <div className="flex h-screen overflow-hidden bg-hub-bg font-sans">
      <Sidebar />
      <main className="flex-1 flex flex-col min-w-0 min-h-0 relative">
        {activeView === 'chat' && <ChatArea />}
        {activeView === 'billing' && <UsageDashboard />}
        {(activeView === 'collabs' || activeView === 'team-chats') && <TeamSpace />}
      </main>
    </div>
  );
}
