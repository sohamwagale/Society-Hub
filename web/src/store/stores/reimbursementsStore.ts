import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { ReimbursementRequest } from '../../types';
import { reimbursementsAPI } from '../../services/api';

interface ReimbursementsState {
  requests: ReimbursementRequest[];
  loading: boolean;
  fetchRequests: () => Promise<void>;
}

export const useReimbursementsStore = create<ReimbursementsState>()(
  persist(
    (set) => ({
      requests: [],
      loading: false,
      fetchRequests: async () => {
        set({ loading: true });
        try {
          const requests = await reimbursementsAPI.list();
          set({ requests, loading: false });
        } catch {
          set({ loading: false });
        }
      },
    }),
    {
      name: 'reimbursements-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
