import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { DashboardStats } from '../../types';
import { dashboardAPI } from '../../services/api';

interface DashboardState {
  stats: DashboardStats | null;
  loading: boolean;
  fetchStats: () => Promise<void>;
}

export const useDashboardStore = create<DashboardState>()(
  persist(
    (set) => ({
      stats: null,
      loading: false,
      fetchStats: async () => {
        set({ loading: true });
        try {
          const stats = await dashboardAPI.stats();
          set({ stats, loading: false });
        } catch {
          set({ loading: false });
        }
      },
    }),
    {
      name: 'dashboard-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
