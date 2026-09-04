import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { reimbursementsAPI } from '../../services/api/reimbursements';
import type { ReimbursementCreate } from '../../types';

export function useReimbursementsQuery() {
  return useQuery({
    queryKey: ['reimbursements'],
    queryFn: () => reimbursementsAPI.list(),
  });
}

export function useCreateReimbursementMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (req: ReimbursementCreate) => reimbursementsAPI.create(req),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reimbursements'] });
      queryClient.invalidateQueries({ queryKey: ['activityLogs'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
    },
  });
}

export function useReviewReimbursementMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: { status?: string; approved_amount?: number; admin_notes?: string } }) =>
      reimbursementsAPI.review(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reimbursements'] });
      queryClient.invalidateQueries({ queryKey: ['activityLogs'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
    },
  });
}

export function useMarkReimbursementPaidMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payment }: { id: string; payment: { amount: number; payment_method: string; transaction_ref?: string; payment_date: string } }) =>
      reimbursementsAPI.markPaid(id, payment),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reimbursements'] });
      queryClient.invalidateQueries({ queryKey: ['activityLogs'] });
    },
  });
}
