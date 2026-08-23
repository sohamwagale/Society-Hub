import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import axios from 'axios';
import type {
  User, Bill, Complaint, Poll, ReimbursementRequest,
  Notification, Announcement, DashboardStats
} from '../types';
import {
  authAPI, billsAPI, complaintsAPI, pollsAPI,
  reimbursementsAPI, notificationsAPI, announcementsAPI,
  dashboardAPI
} from '../services/api';

function isUnauthorized(error: unknown): boolean {
  return axios.isAxiosError(error) && error.response?.status === 401;
}

export const AUTH_STORAGE_KEY = 'auth-storage';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  loadUser: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isLoading: true,

      login: async (email, password) => {
        await authAPI.login(email, password);
        const user = await authAPI.getMe();
        set({ user, isAuthenticated: true });
      },

      logout: async () => {
        try { await authAPI.logout(); } catch { }
        set({ user: null, isAuthenticated: false });
      },

      loadUser: async () => {
        try {
          const user = await authAPI.getMe();
          set({ user, isAuthenticated: true, isLoading: false });
        } catch (error: unknown) {
          if (isUnauthorized(error)) {
            set({ user: null, isAuthenticated: false, isLoading: false });
          } else {
            set((s) => ({
              isLoading: false,
              ...(s.user ? { isAuthenticated: true } : {}),
            }));
          }
        }
      },

      refreshUser: async () => {
        try {
          const user = await authAPI.getMe();
          set({ user });
        } catch { }
      },
    }),
    {
      name: AUTH_STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
      merge: (persistedState, currentState) => ({
        ...currentState,
        ...(persistedState && typeof persistedState === 'object' ? persistedState : {}),
        isLoading: true,
      }),
      onRehydrateStorage: () => (state) => {
        if (state?.loadUser) void state.loadUser();
        else void useAuthStore.getState().loadUser();
      },
    }
  )
);

// Listen for global unauthorized logs
if (typeof window !== 'undefined') {
  window.addEventListener('unauthorized-logout', () => {
    useAuthStore.getState().logout();
  });
}

// ── 2. Billing & Maintenance Store ──

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

// ── 3. Helpdesk & Complaints Store ──

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

// ── 4. Community Polls Store ──

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

// ── 5. Expense Reimbursements Store ──

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

// ── 6. Push & In-App Notifications Store ──

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

// ── 7. Announcements Store ──

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

// ── 8. Society Executive Dashboard Store ──

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
