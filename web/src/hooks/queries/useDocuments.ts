import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { documentsAPI } from '../../services/api/documents';

export function useDocumentsQuery() {
  return useQuery({
    queryKey: ['documents'],
    queryFn: () => documentsAPI.list(),
  });
}

export function useUploadDocumentMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ title, file, description }: { title: string; file: File; description?: string }) =>
      documentsAPI.upload(title, file, description),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
    },
  });
}

export function useApproveDocumentMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => documentsAPI.approve(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
  });
}

export function useDeleteDocumentMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => documentsAPI.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
  });
}
