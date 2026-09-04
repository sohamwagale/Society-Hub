import api, { BASE_URL } from './client';
import type { Announcement, AnnouncementCreate } from '../../types';

export const announcementsAPI = {
  list: async (): Promise<Announcement[]> => {
    const { data } = await api.get<Announcement[]>('/announcements/');
    return data;
  },
  create: async (ann: AnnouncementCreate, file?: File): Promise<Announcement> => {
    const formData = new FormData();
    formData.append('title', ann.title);
    formData.append('body', ann.body);
    formData.append('priority', ann.priority || 'normal');
    formData.append('pinned', String(ann.pinned || false));
    if (file) {
      formData.append('attachment', file);
    }
    const { data } = await api.post<Announcement>('/announcements/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },
  delete: async (id: string) => {
    await api.delete(`/announcements/${encodeURIComponent(id)}`);
  },
  togglePin: async (id: string): Promise<{ pinned: boolean }> => {
    const { data } = await api.patch<{ pinned: boolean }>(`/announcements/${encodeURIComponent(id)}/pin`);
    return data;
  },
  update: async (id: string, updates: { title?: string; body?: string; priority?: string }): Promise<Announcement> => {
    const { data } = await api.put<Announcement>(`/announcements/${encodeURIComponent(id)}`, updates);
    return data;
  },
  getAttachmentUrl: (path: string): string => {
    return BASE_URL.replace('/api', '') + path;
  },
};
