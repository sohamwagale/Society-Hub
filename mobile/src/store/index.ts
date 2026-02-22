import { create } from 'zustand';
import { User, Bill, Complaint, Poll, ReimbursementRequest, Notification, Announcement, ResidentInfo, DashboardStats } from '../types';
import { authAPI, billsAPI, complaintsAPI, pollsAPI, reimbursementsAPI, notificationsAPI, announcementsAPI, residentsAPI, dashboardAPI } from '../services/api';

// ── Auth Store ──
interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  loadUser: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
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
    } catch {
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },
  refreshUser: async () => {
    try {
      const user = await authAPI.getMe();
      set({ user });
    } catch { }
  },
}));

// ── Bills Store ──
interface BillsState {
  bills: Bill[];
  loading: boolean;
  fetchBills: (billType?: string, activeOnly?: boolean) => Promise<void>;
}

export const useBillsStore = create<BillsState>((set) => ({
  bills: [],
  loading: false,
  fetchBills: async (billType, activeOnly) => {
    set({ loading: true });
    try {
      const data = await billsAPI.list(billType, activeOnly);
      set({ bills: data });
    } catch (e) {
      console.error(e);
    } finally {
      set({ loading: false });
    }
  },
}));

// ── Complaints Store ──
interface ComplaintsState {
  complaints: Complaint[];
  loading: boolean;
  fetchComplaints: (status?: string, category?: string) => Promise<void>;
}

export const useComplaintsStore = create<ComplaintsState>((set) => ({
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
}));

// ── Polls Store ──
interface PollsState {
  polls: Poll[];
  loading: boolean;
  fetchPolls: () => Promise<void>;
}

export const usePollsStore = create<PollsState>((set) => ({
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
}));

// ── Reimbursements Store ──
interface ReimbursementsState {
  requests: ReimbursementRequest[];
  loading: boolean;
  fetchRequests: () => Promise<void>;
}

export const useReimbursementsStore = create<ReimbursementsState>((set) => ({
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
}));

// ── Notifications Store ──
interface NotificationsState {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  fetchNotifications: () => Promise<void>;
  fetchUnreadCount: () => Promise<void>;
}

export const useNotificationsStore = create<NotificationsState>((set) => ({
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
}));

// ── Announcements Store (V2) ──
interface AnnouncementsState {
  announcements: Announcement[];
  loading: boolean;
  fetchAnnouncements: () => Promise<void>;
}

export const useAnnouncementsStore = create<AnnouncementsState>((set) => ({
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
}));

// ── Dashboard Stats Store (V2) ──
interface DashboardState {
  stats: DashboardStats | null;
  loading: boolean;
  fetchStats: () => Promise<void>;
}

export const useDashboardStore = create<DashboardState>((set) => ({
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
}));
