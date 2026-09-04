import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { announcementsAPI } from '../../services/api/announcements';
import type { AnnouncementCreate } from '../../types';

export function useAnnouncementsQuery() {
  return useQuery({
    queryKey: ['announcements'],
    queryFn: () => announcementsAPI.list(),
  });
}

export function useCreateAnnouncementMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ ann, file }: { ann: AnnouncementCreate; file?: File }) =>
      announcementsAPI.create(ann, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
    },
  });
}

export function useDeleteAnnouncementMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => announcementsAPI.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
    },
  });
}

export function useTogglePinAnnouncementMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => announcementsAPI.togglePin(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
    },
  });
}
