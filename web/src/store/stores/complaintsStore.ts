import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Complaint } from '../../types';
import { complaintsAPI } from '../../services/api';

interface ComplaintsState {
  complaints: Complaint[];
  loading: boolean;
  fetchComplaints: (status?: string, category?: string) => Promise<void>;
}

export const useComplaintsStore = create<ComplaintsState>()(
  persist(
    (set) => ({
      complaints: [],
      loading: false,
      fetchComplaints: async (status?, category?) => {
        set({ loading: true });
        try {
          const complaints = await complaintsAPI.list(status, category);
          set({ complaints, loading: false });
        } catch {
          set({ loading: false });
        }
      },
    }),
    {
      name: 'complaints-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
