import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Notification } from '../../types';
import { notificationsAPI } from '../../services/api';

interface NotificationsState {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  fetchNotifications: () => Promise<void>;
  fetchUnreadCount: () => Promise<void>;
}

export const useNotificationsStore = create<NotificationsState>()(
  persist(
    (set) => ({
      notifications: [],
      unreadCount: 0,
      loading: false,
      fetchNotifications: async () => {
        set({ loading: true });
        try {
          const notifications = await notificationsAPI.list();
          set({ notifications, loading: false });
        } catch {
          set({ loading: false });
        }
      },
      fetchUnreadCount: async () => {
        try {
          const count = await notificationsAPI.unreadCount();
          set({ unreadCount: count });
        } catch { }
      },
    }),
    {
      name: 'notifications-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
