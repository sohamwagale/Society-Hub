import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Announcement } from '../../types';
import { announcementsAPI } from '../../services/api';

interface AnnouncementsState {
  announcements: Announcement[];
  loading: boolean;
  fetchAnnouncements: () => Promise<void>;
}

export const useAnnouncementsStore = create<AnnouncementsState>()(
  persist(
    (set) => ({
      announcements: [],
      loading: false,
      fetchAnnouncements: async () => {
        set({ loading: true });
        try {
          const announcements = await announcementsAPI.list();
          set({ announcements, loading: false });
        } catch {
          set({ loading: false });
        }
      },
    }),
    {
      name: 'announcements-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
