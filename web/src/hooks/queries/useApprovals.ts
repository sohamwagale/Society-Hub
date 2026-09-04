import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { onboardingAPI } from '../../services/api/onboarding';

export function usePendingApprovalsQuery() {
  return useQuery({
    queryKey: ['pendingApprovals'],
    queryFn: () => onboardingAPI.pendingApprovals(),
  });
}

export function useApproveResidentMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, approve }: { userId: string; approve: boolean }) =>
      onboardingAPI.approve(userId, approve),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pendingApprovals'] });
      queryClient.invalidateQueries({ queryKey: ['residents'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
    },
  });
}
