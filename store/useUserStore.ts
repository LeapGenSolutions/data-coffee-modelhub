import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User, UserApiKeys, BillingPlanTier } from '../types';
import { MOCK_USER } from '../data/mock';

interface UserState {
  user: User;
  requestCount: number;
  apiKeys: UserApiKeys;
  keyModalOpen: boolean;
  authModalOpen: boolean;

  deductUsage: (text: string, multiplier?: number) => void;
  rechargeCredits: (amount: number) => void;
  setUser: (user: User) => void;
  loginAsUser: (account: User) => void;
  upgradePlan: (plan: BillingPlanTier) => void;
  setApiKeys: (keys: Partial<UserApiKeys>) => void;
  setKeyModalOpen: (open: boolean) => void;
  setAuthModalOpen: (open: boolean) => void;
}

const CREDIT_COST_PER_1K_TOKENS = 0.75;

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      user: MOCK_USER,
      requestCount: 342,
      apiKeys: {
        openai: '',
        anthropic: '',
        google: '',
        azureEndpoint: '',
      },
      keyModalOpen: false,
      authModalOpen: false,

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

      setUser: (user) => set({ user }),

      loginAsUser: (account) =>
        set({
          user: account,
        }),

      upgradePlan: (plan) =>
        set((state) => ({
          user: {
            ...state.user,
            plan,
          },
        })),

      setApiKeys: (keys) =>
        set((state) => ({
          apiKeys: { ...state.apiKeys, ...keys },
        })),

      setKeyModalOpen: (open) => set({ keyModalOpen: open }),
      setAuthModalOpen: (open) => set({ authModalOpen: open }),
    }),
    {
      name: 'modelhub-user-store',
      partialize: (state) => ({
        apiKeys: state.apiKeys,
        user: state.user,
      }),
    }
  )
);
