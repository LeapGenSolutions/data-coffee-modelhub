import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { UsageRecord, RechargeRecord } from '../types';
import { fetchUsageHistory, fetchRechargeHistory, rechargeCredits } from '../services/api';

export function useUsageHistory() {
  return useQuery<UsageRecord[]>({
    queryKey: ['billing', 'usageHistory'],
    queryFn: () => fetchUsageHistory(),
  });
}

export function useRechargeHistory() {
  return useQuery<RechargeRecord[]>({
    queryKey: ['billing', 'rechargeHistory'],
    queryFn: fetchRechargeHistory,
  });
}

export function useRechargeCreditsMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (amount: number) => rechargeCredits(amount),
    onSuccess: (newRecord) => {
      queryClient.setQueryData<RechargeRecord[]>(['billing', 'rechargeHistory'], (old = []) => [
        newRecord,
        ...old,
      ]);
    },
  });
}
