import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Bill } from '../../types';
import { billsAPI } from '../../services/api';

interface BillsState {
  bills: Bill[];
  loading: boolean;
  fetchBills: (billType?: string, activeOnly?: boolean) => Promise<void>;
}

export const useBillsStore = create<BillsState>()(
  persist(
    (set) => ({
      bills: [],
      loading: false,
      fetchBills: async (billType, activeOnly) => {
        set({ loading: true });
        try {
          const data = await billsAPI.list(billType, activeOnly);
          set({ bills: data });
        } catch (e) {
          console.error('Failed to sync bills:', e);
        } finally {
          set({ loading: false });
        }
      },
    }),
    {
      name: 'bills-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
