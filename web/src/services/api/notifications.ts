import api from './client';
import type { Notification } from '../../types';

export const notificationsAPI = {
  list: async (): Promise<Notification[]> => {
    const { data } = await api.get<Notification[]>('/notifications/');
    return data;
  },
  unreadCount: async (): Promise<number> => {
    const { data } = await api.get<{ count: number }>('/notifications/unread-count');
    return data.count;
  },
  markRead: async (id: string) => {
    await api.patch(`/notifications/${encodeURIComponent(id)}/read`);
  },
  markAllRead: async () => {
    await api.patch('/notifications/read-all');
  },
  clearAll: async () => {
    await api.delete('/notifications/clear');
  },
  deleteSingle: async (id: string) => {
    await api.delete(`/notifications/${encodeURIComponent(id)}`);
  },
};
