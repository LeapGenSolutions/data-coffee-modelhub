export type AppView = 'chat' | 'billing' | 'collabs' | 'team-chats';

export type ProviderName = 'Anthropic' | 'OpenAI' | 'Google';

export interface User {
  id: string;
  name: string;
  email: string;
  plan: string;
  avatar: string;
  creditsRemaining: number;
  tokensUsed: number;
}

export interface AIModel {
  id: string;
  name: string;
  provider: ProviderName;
  color: string;
  desc: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  model?: string;
  files?: string[];
  createdAt?: string;
}

export interface Chat {
  id: number | string;
  title: string;
  model: string;
  pinned: boolean;
  messages: ChatMessage[];
  createdAt?: string;
  workspaceId?: string;
}

export interface WorkspaceMember {
  initials: string;
  name: string;
  role: 'Owner' | 'Admin' | 'Editor' | 'Viewer';
  color: string;
}

export interface WorkspaceDoc {
  name: string;
  info: string;
  uploadedBy: string;
}

export interface Workspace {
  id: string;
  name: string;
  description: string;
  tokens: number;
  credits: number;
  members: WorkspaceMember[];
  documents: WorkspaceDoc[];
  chats: Chat[];
}

export interface UsageRecord {
  id?: string;
  date: string;
  model: string;
  provider: ProviderName;
  inputTokens: number;
  outputTokens: number;
  credits: number;
  status: 'Completed' | 'Failed' | 'Pending';
}

export interface RechargeRecord {
  date: string;
  id: string;
  method: string;
  credits: number;
  amount: string;
  status: 'Successful' | 'Pending' | 'Failed';
}

export type HistoryType = 'usage' | 'recharge';
