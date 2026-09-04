import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { expensesAPI } from '../../services/api/expenses';
import type { SocietyExpenseCreate } from '../../types';

export function useExpensesQuery(sortBy = 'date_desc') {
  return useQuery({
    queryKey: ['expenses', sortBy],
    queryFn: () => expensesAPI.list(sortBy),
  });
}

export function useCreateExpenseMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ expense, file }: { expense: SocietyExpenseCreate; file?: File }) =>
      expensesAPI.create(expense, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['activityLogs'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
    },
  });
}
