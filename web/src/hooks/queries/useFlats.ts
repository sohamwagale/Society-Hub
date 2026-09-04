import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { flatsAPI } from '../../services/api/flats';

export function useFlatsQuery() {
  return useQuery({
    queryKey: ['flats'],
    queryFn: () => flatsAPI.list(),
  });
}

export function useCreateFlatMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (flat: { flat_number: string; block: string; floor: string }) =>
      flatsAPI.create(flat),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['flats'] });
    },
  });
}export function useAssignFlatMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, flatId }: { userId: string; flatId: string | null }) =>
      flatsAPI.assignUser(userId, flatId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['flats'] });
      queryClient.invalidateQueries({ queryKey: ['residents'] });
    },
  });
}
