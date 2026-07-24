import { create } from 'zustand';
import { AIModel, AppView, Chat, ChatMessage, User, Workspace } from '../types';

export const MODELS: AIModel[] = [
  { id: 'claude-sonnet', name: 'Claude Sonnet', provider: 'Anthropic', color: '#D97757', desc: 'Fast, balanced everyday model' },
  { id: 'claude-opus',   name: 'Claude Opus',   provider: 'Anthropic', color: '#D97757', desc: 'Deepest reasoning and analysis' },
  { id: 'gpt-5',         name: 'GPT-5',         provider: 'OpenAI',    color: '#74AA9C', desc: 'General purpose flagship' },
  { id: 'gpt-5-mini',    name: 'GPT-5 mini',    provider: 'OpenAI',    color: '#74AA9C', desc: 'Quick and lightweight' },
  { id: 'gemini-pro',    name: 'Gemini Pro',    provider: 'Google',    color: '#6E8EF7', desc: 'Strong multimodal model' },
  { id: 'gemini-flash',  name: 'Gemini Flash',  provider: 'Google',    color: '#6E8EF7', desc: 'Lowest latency option' },
];

export const INITIAL_USER: User = {
  id: 'usr_1',
  name: 'User',
  email: 'user@datacoffee.com',
  plan: 'Team workspace',
  avatar: 'U',
  creditsRemaining: 84.25,
  tokensUsed: 24680,
};

export const INITIAL_CHATS: Chat[] = [
  {
    id: 1,
    title: 'Plan a product launch timeline',
    model: 'claude-sonnet',
    pinned: true,
    messages: [
      { id: 'm1', role: 'user', content: 'Help me plan a 6-week product launch timeline.' },
      {
        id: 'm2',
        role: 'assistant',
        model: 'claude-sonnet',
        content: '<p>Here’s a simple 6-week structure:</p><p><b>Weeks 1–2:</b> finalize messaging and pricing. <b>Weeks 3–4:</b> build landing page and demo assets. <b>Week 5:</b> brief sales and line up early customers. <b>Week 6:</b> launch, then a follow-up email sequence over the next 10 days.</p>'
      }
    ]
  },
  {
    id: 2,
    title: 'Summarize quarterly report',
    model: 'gpt-5',
    pinned: true,
    messages: [
      { id: 'm3', role: 'user', content: 'Summarize the key points of a quarterly financial report for me.', files: ['Q2-report.pdf'] },
      {
        id: 'm4',
        role: 'assistant',
        model: 'gpt-5',
        content: '<p>Revenue grew 14% quarter over quarter, driven mostly by the enterprise segment. Costs rose 6%, so margin improved. The main risk flagged is customer concentration — the top three accounts are 41% of revenue.</p>'
      }
    ]
  },
  {
    id: 3,
    title: 'Fix a Python date bug',
    model: 'claude-sonnet',
    pinned: false,
    messages: [
      { id: 'm5', role: 'user', content: 'Why does datetime.strptime fail on "2026-7-5"?' },
      {
        id: 'm6',
        role: 'assistant',
        model: 'claude-sonnet',
        content: '<p>Your format string probably expects zero-padded values. Use <b>%Y-%m-%d</b> and pad the input, or parse with a more forgiving approach. In this case "2026-07-05" will parse fine with %Y-%m-%d.</p>'
      }
    ]
  },
  {
    id: 4,
    title: 'Compare cloud storage pricing',
    model: 'gemini-pro',
    pinned: false,
    messages: [
      { id: 'm7', role: 'user', content: 'Compare S3, GCS and Azure Blob pricing at a high level.' },
      {
        id: 'm8',
        role: 'assistant',
        model: 'gemini-pro',
        content: '<p>All three land within a few cents per GB for standard storage. The real differences show up in egress fees and API request pricing — model your read/write pattern before choosing.</p>'
      }
    ]
  },
  {
    id: 5,
    title: 'Email to a late supplier',
    model: 'gpt-5-mini',
    pinned: false,
    messages: [
      { id: 'm9', role: 'user', content: 'Draft a firm but polite email to a supplier who is 2 weeks late.' },
      {
        id: 'm10',
        role: 'assistant',
        model: 'gpt-5-mini',
        content: '<p>Subject: Delivery status — action needed</p><p>Hi [Name], the order due on the 1st is now two weeks late and it’s affecting our schedule. Please confirm a firm ship date by Friday, or we’ll need to discuss alternatives. Thanks for the quick turnaround.</p>'
      }
    ]
  }
];

export const INITIAL_WORKSPACES: Workspace[] = [
  {
    id: 'product',
    name: 'Product Research',
    description: 'Compare foundation models and prepare recommendations for the client demo.',
    tokens: 18420,
    credits: 11.28,
    members: [
      { initials: 'U', name: 'User', role: 'Owner', color: '#3B4A6B' },
      { initials: 'AK', name: 'Ava Kim', role: 'Editor', color: '#8B5CF6' },
      { initials: 'JM', name: 'Jordan Miles', role: 'Editor', color: '#C56A46' },
      { initials: 'RS', name: 'Riya Shah', role: 'Viewer', color: '#287A68' },
      { initials: 'DL', name: 'Daniel Lee', role: 'Editor', color: '#4F70C8' }
    ],
    documents: [
      { name: 'enterprise-requirements.pdf', info: 'PDF · 2.4 MB', uploadedBy: 'Jordan' },
      { name: 'model-comparison.xlsx', info: 'Excel · 820 KB', uploadedBy: 'Ava' },
      { name: 'client-demo-notes.docx', info: 'Word · 340 KB', uploadedBy: 'User' },
      { name: 'security-checklist.pdf', info: 'PDF · 1.1 MB', uploadedBy: 'Riya' }
    ],
    chats: [
      {
        id: 'tc-1',
        title: 'Model comparison matrix',
        model: 'claude-sonnet',
        pinned: false,
        messages: [
          { id: 'tm1', role: 'user', content: 'Compare the models using our requirements document.', files: ['enterprise-requirements.pdf'] },
          { id: 'tm2', role: 'assistant', model: 'claude-sonnet', content: '<p>I compared the requirements against the candidate models. Claude Sonnet is strongest for long-document analysis, GPT-5 for general reasoning, and Gemini Pro for multimodal workflows.</p>' }
        ]
      },
      { id: 'tc-2', title: 'Enterprise security questions', model: 'gpt-5', pinned: false, messages: [] }
    ]
  },
  {
    id: 'client',
    name: 'Client Delivery',
    description: 'Coordinate requirements, meeting notes, deliverables, and approved AI outputs.',
    tokens: 12780,
    credits: 7.64,
    members: [
      { initials: 'U', name: 'User', role: 'Owner', color: '#3B4A6B' },
      { initials: 'JM', name: 'Jordan Miles', role: 'Admin', color: '#C56A46' },
      { initials: 'DL', name: 'Daniel Lee', role: 'Editor', color: '#4F70C8' }
    ],
    documents: [
      { name: 'meeting-notes-july.pdf', info: 'PDF · 680 KB', uploadedBy: 'Daniel' },
      { name: 'approved-prompts.docx', info: 'Word · 190 KB', uploadedBy: 'User' },
      { name: 'delivery-plan.xlsx', info: 'Excel · 410 KB', uploadedBy: 'Jordan' }
    ],
    chats: [
      { id: 'tc-3', title: 'Requirements summary', model: 'gpt-5', pinned: false, messages: [] },
      { id: 'tc-4', title: 'Meeting action items', model: 'claude-sonnet', pinned: false, messages: [] }
    ]
  }
];

interface AppState {
  // Navigation & UI state
  sidebarOpen: boolean;
  activeView: AppView;
  selectedModelId: string;
  currentChatId: number | string | null;
  pendingFiles: string[];
  currentWorkspaceId: string;

  // Domain data state
  user: User;
  chats: Chat[];
  workspaces: Workspace[];
  requestCount: number;

  // Actions
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  setActiveView: (view: AppView) => void;
  setSelectedModelId: (id: string) => void;
  setCurrentChatId: (id: number | string | null) => void;
  addChat: (chat: Chat) => void;
  togglePinChat: (id: number | string) => void;
  addMessageToChat: (chatId: number | string, message: ChatMessage) => void;
  addPendingFile: (filename: string) => void;
  removePendingFile: (filename: string) => void;
  clearPendingFiles: () => void;
  deductUsage: (text: string, multiplier?: number) => void;
  rechargeCredits: (amount: number) => void;
  setCurrentWorkspaceId: (id: string) => void;
  addTeamDocument: (workspaceId: string, doc: { name: string; info: string; uploadedBy: string }) => void;
  createNewChat: () => void;
}

const CREDIT_COST_PER_1K_TOKENS = 0.75;

export const useAppStore = create<AppState>((set, get) => ({
  sidebarOpen: true,
  activeView: 'chat',
  selectedModelId: 'claude-sonnet',
  currentChatId: 1,
  pendingFiles: [],
  currentWorkspaceId: 'product',
  user: INITIAL_USER,
  chats: INITIAL_CHATS,
  workspaces: INITIAL_WORKSPACES,
  requestCount: 342,

  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setActiveView: (view) => set({ activeView: view }),
  setSelectedModelId: (id) => set({ selectedModelId: id }),
  setCurrentChatId: (id) => set({ currentChatId: id, activeView: 'chat' }),

  addChat: (newChat) =>
    set((state) => ({
      chats: [newChat, ...state.chats],
      currentChatId: newChat.id,
      activeView: 'chat',
    })),

  togglePinChat: (id) =>
    set((state) => ({
      chats: state.chats.map((c) => (c.id === id ? { ...c, pinned: !c.pinned } : c)),
    })),

  addMessageToChat: (chatId, message) =>
    set((state) => ({
      chats: state.chats.map((c) =>
        c.id === chatId ? { ...c, model: message.model || c.model, messages: [...c.messages, message] } : c
      ),
    })),

  addPendingFile: (filename) =>
    set((state) => ({
      pendingFiles: state.pendingFiles.includes(filename) ? state.pendingFiles : [...state.pendingFiles, filename],
    })),

  removePendingFile: (filename) =>
    set((state) => ({
      pendingFiles: state.pendingFiles.filter((f) => f !== filename),
    })),

  clearPendingFiles: () => set({ pendingFiles: [] }),

  deductUsage: (text, multiplier = 1) => {
    const rawLen = (text || '').replace(/<[^>]+>/g, '').length;
    const estimatedTokens = Math.max(1, Math.ceil(rawLen / 4) * multiplier);

    set((state) => {
      const newTokens = state.user.tokensUsed + estimatedTokens;
      const creditCost = (estimatedTokens / 1000) * CREDIT_COST_PER_1K_TOKENS;
      const newCredits = Math.max(0, state.user.creditsRemaining - creditCost);

      return {
        requestCount: state.requestCount + 1,
        user: {
          ...state.user,
          tokensUsed: newTokens,
          creditsRemaining: newCredits,
        },
      };
    });
  },

  rechargeCredits: (amount) =>
    set((state) => ({
      user: {
        ...state.user,
        creditsRemaining: state.user.creditsRemaining + amount,
      },
    })),

  setCurrentWorkspaceId: (id) => set({ currentWorkspaceId: id }),

  addTeamDocument: (workspaceId, doc) =>
    set((state) => ({
      workspaces: state.workspaces.map((w) =>
        w.id === workspaceId ? { ...w, documents: [doc, ...w.documents] } : w
      ),
    })),

  createNewChat: () => {
    set({
      currentChatId: null,
      activeView: 'chat',
      pendingFiles: [],
    });
  },
}));
