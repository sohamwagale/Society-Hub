import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { pollsAPI } from '../../services/api/polls';
import type { PollCreate } from '../../types';

export function usePollsQuery() {
  return useQuery({
    queryKey: ['polls'],
    queryFn: () => pollsAPI.list(),
  });
}

export function useCreatePollMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (poll: PollCreate) => pollsAPI.create(poll),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['polls'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
    },
  });
}

export function useVotePollMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ pollId, optionId }: { pollId: string; optionId: string }) =>
      pollsAPI.vote(pollId, optionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['polls'] });
    },
  });
}

export function useClosePollMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (pollId: string) => pollsAPI.close(pollId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['polls'] });
    },
  });
}

export function useDeletePollMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (pollId: string) => pollsAPI.delete(pollId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['polls'] });
    },
  });
}
