export type AppView = 'chat' | 'billing' | 'collabs' | 'team-chats' | 'arena';

export type ProviderName = 'Anthropic' | 'OpenAI' | 'Google' | 'Azure';

export type BillingPlanTier = 'Free' | 'Pro' | 'Team' | 'Enterprise';

export interface User {
  id: string;
  name: string;
  email: string;
  plan: BillingPlanTier | string;
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

export interface FileAttachment {
  name: string;
  size?: string;
  type?: string;
  content?: string;
  url?: string;
}

export interface SemanticCitation {
  id: string;
  documentName: string;
  startLine?: number;
  endLine?: number;
  snippet: string;
  score?: number;
}

export interface MessageVersion {
  id: string;
  content: string;
  model?: string;
  createdAt: string;
  files?: string[];
  attachments?: FileAttachment[];
  citations?: SemanticCitation[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  model?: string;
  files?: string[];
  attachments?: FileAttachment[];
  createdAt?: string;
  
  // Message Branching & Versioning
  versions?: MessageVersion[];
  versionIndex?: number;
  citations?: SemanticCitation[];
  forkedFrom?: {
    chatId: string;
    messageId: string;
  };
}

export interface Chat {
  id: string;
  title: string;
  model: string;
  pinned: boolean;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt?: string;
  deletedAt?: string;
  workspaceId?: string;
  isTemporary?: boolean;
  forkedFromChatId?: string;
}

export interface WorkspaceMember {
  initials: string;
  name: string;
  role: 'Owner' | 'Admin' | 'Editor' | 'Viewer';
  color: string;
  email?: string;
}

export interface WorkspaceDoc {
  name: string;
  info: string;
  uploadedBy: string;
  content?: string;
  embeddingStatus?: 'indexed' | 'indexing' | 'unindexed' | 'failed';
  chunkCount?: number;
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
  provider?: 'Stripe' | 'Lemon Squeezy' | 'Direct' | 'Manual';
}

export interface WebhookEventLog {
  id: string;
  timestamp: string;
  provider: 'stripe' | 'lemonsqueezy';
  event: string;
  status: 'processed' | 'failed' | 'simulated';
  payloadSummary: string;
  creditsAdded?: number;
}

export type HistoryType = 'usage' | 'recharge';

export interface UserApiKeys {
  openai?: string;
  anthropic?: string;
  google?: string;
  azureEndpoint?: string;
}

export interface ArenaEntry {
  id: string;
  modelId: string;
  status: 'idle' | 'streaming' | 'completed' | 'error';
  content: string;
  ttftMs?: number;
  totalTimeMs?: number;
  tokenCount?: number;
  cost?: number;
  error?: string;
}

/* ─── Vector DB / RAG Types ─── */

export interface DocumentChunk {
  id: string;
  documentName: string;
  chunkIndex: number;
  startLine: number;
  endLine: number;
  content: string;
  tokenCount: number;
  embedding?: number[];
}

export interface VectorSearchResult {
  chunk: DocumentChunk;
  similarity: number;
}

export interface BM25Result {
  chunk: DocumentChunk;
  bm25Score: number;
}

export interface HybridSearchResult {
  chunk: DocumentChunk;
  denseSimilarity: number;
  bm25Score: number;
  rrfScore: number;
  denseRank: number;
  bm25Rank: number;
  combinedScore: number;
  relevanceExplanation?: string;
}

export interface RerankedChunk {
  chunk: DocumentChunk;
  originalScore: number;
  rerankScore: number;
  exactTermMatches: number;
  densityScore: number;
}

/* ─── Live Cost & Token Estimator Types ─── */

export interface ModelPricing {
  modelId: string;
  name: string;
  provider: ProviderName;
  inputCostPer1M: number;
  outputCostPer1M: number;
  contextWindowTokens: number;
}

export interface CostEstimate {
  inputTokens: number;
  contextLimit: number;
  contextPercent: number;
  estimatedInputCostUsd: number;
  estimatedTotalCostUsd: number;
  status: 'safe' | 'warning' | 'exceeded';
}

/* ─── Conversation Branch Tree Visualizer Types ─── */

export interface BranchTreeNode {
  id: string;
  messageId: string;
  role: 'user' | 'assistant' | 'system';
  model?: string;
  content: string;
  snippet: string;
  timestamp: string;
  versionIndex: number;
  totalVersions: number;
  isActive: boolean;
  parentId: string | null;
  children: string[];
  depth: number;
  forkedFromChatId?: string;
}

export interface ConversationTreeData {
  chatId: string;
  title: string;
  rootNodes: string[];
  nodes: Record<string, BranchTreeNode>;
  activeLeafId: string;
}

/* ─── Model Arena Blind ELO Types ─── */

export type ArenaVoteType = 'modelA' | 'modelB' | 'tie' | 'both_bad';

export interface EloRating {
  modelId: string;
  name: string;
  provider: ProviderName;
  elo: number;
  matches: number;
  wins: number;
  losses: number;
  ties: number;
  winRate: number;
  lastUpdated: string;
}

export interface ArenaMatch {
  id: string;
  timestamp: string;
  prompt: string;
  modelAId: string;
  modelBId: string;
  modelAName: string;
  modelBName: string;
  winner: 'modelA' | 'modelB' | 'tie' | 'both_bad';
  modelAOldElo: number;
  modelANewElo: number;
  modelBOldElo: number;
  modelBNewElo: number;
  deltaA: number;
  deltaB: number;
}

/* ─── API Types ─── */

export interface ChatRequest {
  prompt: string;
  model: string;
  chatId?: string;
  files?: string[];
  attachments?: FileAttachment[];
  apiKeys?: UserApiKeys;
  history?: { role: 'user' | 'assistant' | 'system'; content: string }[];
  useRag?: boolean;
  workspaceId?: string;
}

export interface ChatResponse {
  id: string;
  role: 'assistant';
  model: string;
  content: string;
  tokensUsed?: number;
  creditsCost?: number;
  citations?: SemanticCitation[];
}

export interface CheckoutSessionRequest {
  amount: number;
  credits: number;
  provider: 'stripe' | 'lemonsqueezy';
  planType?: 'one-time' | 'pro' | 'team';
  userEmail: string;
}

export interface ApiError {
  code: string;
  message: string;
  status: number;
}
