import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { UsageRecord, RechargeRecord } from '../types';

export const MOCK_USAGE_HISTORY: UsageRecord[] = [
  { id: 'u1', date: 'Jul 15, 2026 · 10:42 AM', model: 'GPT-5', provider: 'OpenAI', inputTokens: 1240, outputTokens: 860, credits: 1.58, status: 'Completed' },
  { id: 'u2', date: 'Jul 15, 2026 · 9:18 AM', model: 'Claude Sonnet', provider: 'Anthropic', inputTokens: 780, outputTokens: 1320, credits: 1.44, status: 'Completed' },
  { id: 'u3', date: 'Jul 14, 2026 · 6:34 PM', model: 'Gemini Pro', provider: 'Google', inputTokens: 2150, outputTokens: 940, credits: 1.76, status: 'Completed' },
  { id: 'u4', date: 'Jul 14, 2026 · 3:06 PM', model: 'GPT-5 mini', provider: 'OpenAI', inputTokens: 510, outputTokens: 420, credits: 0.42, status: 'Completed' },
  { id: 'u5', date: 'Jul 13, 2026 · 11:51 AM', model: 'Claude Opus', provider: 'Anthropic', inputTokens: 1800, outputTokens: 2650, credits: 3.85, status: 'Completed' },
];

export const MOCK_RECHARGE_HISTORY: RechargeRecord[] = [
  { date: 'Jul 1, 2026', id: 'RC-20260701-1042', method: 'Visa •••• 4242', credits: 50, amount: '$50.00', status: 'Successful' },
  { date: 'Jun 12, 2026', id: 'RC-20260612-0831', method: 'Visa •••• 4242', credits: 25, amount: '$25.00', status: 'Successful' },
  { date: 'May 22, 2026', id: 'RC-20260522-0774', method: 'Mastercard •••• 8821', credits: 50, amount: '$50.00', status: 'Successful' },
];

export function useUsageHistory() {
  return useQuery<UsageRecord[]>({
    queryKey: ['billing', 'usageHistory'],
    queryFn: async () => {
      // Simulate API latency
      await new Promise((res) => setTimeout(res, 200));
      return MOCK_USAGE_HISTORY;
    },
  });
}

export function useRechargeHistory() {
  return useQuery<RechargeRecord[]>({
    queryKey: ['billing', 'rechargeHistory'],
    queryFn: async () => {
      await new Promise((res) => setTimeout(res, 200));
      return MOCK_RECHARGE_HISTORY;
    },
  });
}

export function useRechargeCreditsMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (amount: number) => {
      await new Promise((res) => setTimeout(res, 300));
      const newRecord: RechargeRecord = {
        date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        id: `RC-DEMO-${Math.floor(Math.random() * 9000 + 1000)}`,
        method: 'Demo payment',
        credits: amount,
        amount: `$${amount.toFixed(2)}`,
        status: 'Successful',
      };
      return newRecord;
    },
    onSuccess: (newRecord) => {
      queryClient.setQueryData<RechargeRecord[]>(['billing', 'rechargeHistory'], (old = []) => [
        newRecord,
        ...old,
      ]);
    },
  });
}
