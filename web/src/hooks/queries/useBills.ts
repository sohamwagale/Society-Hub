import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { billsAPI } from '../../services/api/bills';
import type { BillCreate, PayBillRequest, FlatAmountOverride } from '../../types';

export function useBillsQuery(billType?: string, activeOnly?: boolean) {
  return useQuery({
    queryKey: ['bills', billType, activeOnly],
    queryFn: () => billsAPI.list(billType, activeOnly),
  });
}

export function useBillResidentStatusQuery(billId: string | null) {
  return useQuery({
    queryKey: ['billResidentStatus', billId],
    queryFn: () => (billId ? billsAPI.getResidentStatus(billId) : Promise.resolve([])),
    enabled: !!billId,
  });
}

export function useBillFlatOverridesQuery(billId: string | null) {
  return useQuery({
    queryKey: ['billFlatOverrides', billId],
    queryFn: () => (billId ? billsAPI.getFlatOverrides(billId) : Promise.resolve([])),
    enabled: !!billId,
  });
}

export function usePaymentHistoryQuery() {
  return useQuery({
    queryKey: ['paymentHistory'],
    queryFn: () => billsAPI.paymentHistory(),
  });
}

export function useCreateBillMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (bill: BillCreate) => billsAPI.create(bill),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bills'] });
      queryClient.invalidateQueries({ queryKey: ['activityLogs'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
    },
  });
}

export function usePayBillMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payment: PayBillRequest) => billsAPI.pay(payment),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bills'] });
      queryClient.invalidateQueries({ queryKey: ['paymentHistory'] });
      queryClient.invalidateQueries({ queryKey: ['activityLogs'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
    },
  });
}

export function useDeleteBillMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => billsAPI.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bills'] });
      queryClient.invalidateQueries({ queryKey: ['activityLogs'] });
    },
  });
}

export function useUpdateBillMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<BillCreate> & { is_active?: boolean } }) =>
      billsAPI.update(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bills'] });
      queryClient.invalidateQueries({ queryKey: ['billResidentStatus'] });
      queryClient.invalidateQueries({ queryKey: ['billFlatOverrides'] });
    },
  });
}

export function useUpdateFlatOverridesMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, overrides }: { id: string; overrides: FlatAmountOverride[] }) =>
      billsAPI.updateFlatOverrides(id, overrides),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['bills'] });
      queryClient.invalidateQueries({ queryKey: ['billResidentStatus', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['billFlatOverrides', variables.id] });
    },
  });
}
