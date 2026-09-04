import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Poll } from '../../types';
import { pollsAPI } from '../../services/api';

interface PollsState {
  polls: Poll[];
  loading: boolean;
  fetchPolls: () => Promise<void>;
}

export const usePollsStore = create<PollsState>()(
  persist(
    (set) => ({
      polls: [],
      loading: false,
      fetchPolls: async () => {
        set({ loading: true });
        try {
          const polls = await pollsAPI.list();
          set({ polls, loading: false });
        } catch {
          set({ loading: false });
        }
      },
    }),
    {
      name: 'polls-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
