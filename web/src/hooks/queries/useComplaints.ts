import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { complaintsAPI } from '../../services/api/complaints';
import type { ComplaintCreate } from '../../types';

export function useComplaintsQuery(status?: string, category?: string) {
  return useQuery({
    queryKey: ['complaints', status, category],
    queryFn: () => complaintsAPI.list(status, category),
  });
}

export function useComplaintCommentsQuery(complaintId: string | null) {
  return useQuery({
    queryKey: ['complaintComments', complaintId],
    queryFn: () => (complaintId ? complaintsAPI.listComments(complaintId) : Promise.resolve([])),
    enabled: !!complaintId,
  });
}

export function useCreateComplaintMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (complaint: ComplaintCreate) => complaintsAPI.create(complaint),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['complaints'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
    },
  });
}

export function useUpdateComplaintMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: { status?: string; admin_notes?: string } }) =>
      complaintsAPI.update(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['complaints'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
    },
  });
}

export function useAddComplaintCommentMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, message }: { id: string; message: string }) =>
      complaintsAPI.addComment(id, message),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['complaintComments', variables.id] });
    },
  });
}
