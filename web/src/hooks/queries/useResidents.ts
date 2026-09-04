import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { residentsAPI } from '../../services/api/residents';

export function useResidentsQuery() {
  return useQuery({
    queryKey: ['residents'],
    queryFn: () => residentsAPI.list(),
  });
}

export function useResidentStatsQuery() {
  return useQuery({
    queryKey: ['residentStats'],
    queryFn: () => residentsAPI.stats(),
  });
}

export function useSetCommitteeMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, isCommittee, role }: { userId: string; isCommittee: boolean; role?: string }) =>
      residentsAPI.setCommittee(userId, isCommittee, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['residents'] });
      queryClient.invalidateQueries({ queryKey: ['residentStats'] });
    },
  });
}
