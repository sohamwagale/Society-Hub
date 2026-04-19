// Import the 'create' function from Zustand to initialize specialized state stores
import { create } from 'zustand';
// Import 'persist' for cross-session state retention and 'createJSONStorage' for custom storage backends
import { persist, createJSONStorage } from 'zustand/middleware';
// Import axios to perform type-checks on error responses and handle global auth states
import axios from 'axios';
// Import our custom FileSystem-based storage utility for robust offline persistence in React Native
import { FileStorage } from './fileStorage';
// Import all domain-specific TypeScript interfaces to ensure strict state typing
import { User, Bill, Complaint, Poll, ReimbursementRequest, Notification, Announcement, ResidentInfo, DashboardStats } from '../types';
// Import the centralized API client layer to bridge state actions with backend services
import { authAPI, billsAPI, complaintsAPI, pollsAPI, reimbursementsAPI, notificationsAPI, announcementsAPI, residentsAPI, dashboardAPI } from '../services/api';

/**
 * Global Utility: 
 * Detects if an API call failed due to an expired or missing JWT.
 * Triggers re-authentication flows across the application.
 */
function isUnauthorized(error: unknown): boolean {
  // Check if the error is a standard axios exception with a 401 status code
  return axios.isAxiosError(error) && error.response?.status === 401;
}

/** 
 * Unique identifier for the authentication state in persistent storage. 
 * Must remain consistent to allow external native modules to read/write auth snapshots. 
 */
export const AUTH_STORAGE_KEY = 'auth-storage';


// ── 1. Authentication & Session Store ──

/**
 * AuthState:
 * Defines the user's identity, authentication status, and session lifecycle actions.
 */
interface AuthState {
  user: User | null; // The currently logged-in resident profile
  isAuthenticated: boolean; // Flag to gate private routes
  isLoading: boolean; // Tracks initial session hydration and verification
  login: (email: string, password: string) => Promise<void>; // Handles credential exchange
  logout: () => Promise<void>; // Clears local and remote session state
  loadUser: () => Promise<void>; // Boot-time identity verification
  refreshUser: () => Promise<void>; // Background profile synchronization
}

/**
 * useAuthStore:
 * Centralized signal for user identity. Persists to FileStorage.
 */
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      // ── Initial State ──
      user: null, // No user by default
      isAuthenticated: false, // Start unauthenticated
      isLoading: true, // App starts in a loading state while hydration occurs

      // ── Actions ──

      /**
       * login:
       * Authenticates the user and retrieves their full profile in one sequence.
       */
      login: async (email, password) => {
        // Exchange credentials for a JWT (stored internally by the API service)
        await authAPI.login(email, password);
        // Fetch the user's specific details using the newly acquired token
        const user = await authAPI.getMe();
        // Update local state and trigger re-hydration across the app
        set({ user, isAuthenticated: true });
      },

      /**
       * logout:
       * Clears the local session and optionally notifies the backend.
       */
      logout: async () => {
        // Attempt to invalidate the session on the server (non-blocking best effort)
        try { await authAPI.logout(); } catch { }
        // Purge sensitive data from memory and (automatically via persist) disk
        set({ user: null, isAuthenticated: false });
      },

      /**
       * loadUser:
       * Validates the currently persisted session against the live backend on app boot.
       */
      loadUser: async () => {
        try {
          // Attempt a 'me' call to verify token freshness
          const user = await authAPI.getMe();
          // Session is valid — update state with fresh, verified user data
          set({ user, isAuthenticated: true, isLoading: false });
        } catch (error: unknown) {
          // Check if the server explicitly rejected the credentials
          if (isUnauthorized(error)) {
            // Token is dead — force a logout to clear stale state
            set({ user: null, isAuthenticated: false, isLoading: false });
          } else {
            // Network/Server error — keep the UI in authenticated mode if we have a user (offline support)
            set((s) => ({
              isLoading: false,
              ...(s.user ? { isAuthenticated: true } : {}),
            }));
          }
        }
      },

      /**
       * refreshUser:
       * Silent background refresh of user data (e.g., after a profile edit).
       */
      refreshUser: async () => {
        try {
          // Re-fetch profile without changing loading states
          const user = await authAPI.getMe();
          // Commit the fresh profile to state
          set({ user });
        } catch { } // Silently fail if unreachable (no impact to UX)
      },
    }),
    {
      // Key for disk storage
      name: AUTH_STORAGE_KEY,
      // Map Zustand persistence to our custom disk-based storage system
      storage: createJSONStorage(() => FileStorage),
      // Optimization: Only keep essential flags on disk to minimize storage footprint
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
      // Custom logic to merge disk state with the in-memory state during app boot
      merge: (persistedState, currentState) => ({
        ...currentState,
        ...(persistedState && typeof persistedState === 'object' ? persistedState : {}),
        // Always reset loading to true during merge to ensure the boot screen shows
        isLoading: true,
      }),
      // Orchestrate the validation check immediately after disk hydration finishes
      onRehydrateStorage: () => (state, error) => {
        // Log hydration issues for debugging
        if (error) console.warn('auth-storage rehydrate failed:', error);
        // Trigger the live session check
        if (state?.loadUser) void state.loadUser();
        else void useAuthStore.getState().loadUser();
      },
    }
  )
);


// ── 2. Billing & Maintenance Store ──

/**
 * BillsState:
 * Tracks the reactive list of financial maintenance records.
 */
interface BillsState {
  bills: Bill[]; // Current list of retrieved bills
  loading: boolean; // Tracks sync progress
  fetchBills: (billType?: string, activeOnly?: boolean) => Promise<void>; // Action to sync from server
}

/**
 * useBillsStore:
 * Manages the financial ledger state for the resident/admin UI.
 */
export const useBillsStore = create<BillsState>()(
  persist(
    (set) => ({
      // Shared collection
      bills: [],
      // Network status
      loading: false,
      /**
       * fetchBills:
       * Retrieves a filtered list of society bills for the current user.
       */
      fetchBills: async (billType, activeOnly) => {
        // Indicate background sync in UI
        set({ loading: true });
        try {
          // API request with optional filters
          const data = await billsAPI.list(billType, activeOnly);
          // Commit data to state
          set({ bills: data });
        } catch (e) {
          // Log errors for analysis
          console.error('Failed to sync bills:', e);
        } finally {
          // Stop sync indicator
          set({ loading: false });
        }
      },
    }),
    {
      // Separate disk segment for bills
      name: 'bills-storage',
      // Shared file storage backend
      storage: createJSONStorage(() => FileStorage),
    }
  )
);


// ── 3. Helpdesk & Complaints Store ──

/**
 * ComplaintsState:
 * Tracks the resolution lifecycle of resident grievances.
 */
interface ComplaintsState {
  complaints: Complaint[]; // List of historical and active tickets
  loading: boolean; // Sync flag
  fetchComplaints: (status?: string, category?: string) => Promise<void>; // Fetch action
}

/**
 * useComplaintsStore:
 * Central hub for the society's ticketing and service request feedback.
 */
export const useComplaintsStore = create<ComplaintsState>()(
  persist(
    (set) => ({
      // State init
      complaints: [],
      loading: false,
      /**
       * fetchComplaints:
       * Fetches user-relevant service requests based on status or category filters.
       */
      fetchComplaints: async (status?, category?) => {
        // Start load
        set({ loading: true });
        try {
          // Call API with filters
          const complaints = await complaintsAPI.list(status, category);
          // Update state and stop load in success path
          set({ complaints, loading: false });
        } catch {
          // Stop load on error to prevent stuck UI
          set({ loading: false });
        }
      },
    }),
    {
      // Segregated disk segment
      name: 'complaints-storage',
      // Shared storage interface
      storage: createJSONStorage(() => FileStorage),
    }
  )
);


// ── 4. Community Polls Store ──

/**
 * PollsState:
 * Tracks the community's democratic decision-making activities.
 */
interface PollsState {
  polls: Poll[]; // Active and past surveys
  loading: boolean; // Sync tracker
  fetchPolls: () => Promise<void>; // Sync action
}

/**
 * usePollsStore:
 * Orchestrates technical state for community voting and surveying.
 */
export const usePollsStore = create<PollsState>()(
  persist(
    (set) => ({
      // State init
      polls: [],
      loading: false,
      /**
       * fetchPolls:
       * Syncs the latest community opinion polls.
       */
      fetchPolls: async () => {
        // Flag active sync
        set({ loading: true });
        try {
          // Pull list from backend
          const polls = await pollsAPI.list();
          // Update state
          set({ polls, loading: false });
        } catch {
          // Clean up on fail
          set({ loading: false });
        }
      },
    }),
    {
      // Disk name
      name: 'polls-storage',
      // Disk driver
      storage: createJSONStorage(() => FileStorage),
    }
  )
);


// ── 5. Expense Reimbursements Store ──

/**
 * ReimbursementsState:
 * Manages the state for resident claims and refund tracking.
 */
interface ReimbursementsState {
  requests: ReimbursementRequest[]; // List of user claims
  loading: boolean; // Sync indicator
  fetchRequests: () => Promise<void>; // API sync action
}

/**
 * useReimbursementsStore:
 * Handles the logic for retrieving and tracking personal money claims.
 */
export const useReimbursementsStore = create<ReimbursementsState>()(
  persist(
    (set) => ({
      // Init
      requests: [],
      loading: false,
      /**
       * fetchRequests:
       * Retrieves all personal expense claims submitted by the user.
       */
      fetchRequests: async () => {
        // Set loading
        set({ loading: true });
        try {
          // API request
          const requests = await reimbursementsAPI.list();
          // State commit
          set({ requests, loading: false });
        } catch {
          // Error handling
          set({ loading: false });
        }
      },
    }),
    {
      // Persistence ID
      name: 'reimbursements-storage',
      // IO bridge
      storage: createJSONStorage(() => FileStorage),
    }
  )
);


// ── 6. Push & In-App Notifications Store ──

/**
 * NotificationsState:
 * Tracks personalized alerts and identifies unread activity for badges.
 */
interface NotificationsState {
  notifications: Notification[]; // Detailed alert list
  unreadCount: number; // Integer count for primary UI badges
  loading: boolean; // Sync status
  fetchNotifications: () => Promise<void>; // Full list sync
  fetchUnreadCount: () => Promise<void>; // Targeted badge sync
}

/**
 * useNotificationsStore:
 * Central reactive store for all alerts received by the resident.
 */
export const useNotificationsStore = create<NotificationsState>()(
  persist(
    (set) => ({
      // Shared state
      notifications: [],
      unreadCount: 0,
      loading: false,
      /**
       * fetchNotifications:
       * Syncs the detailed history of personalized user alerts.
       */
      fetchNotifications: async () => {
        // Start load
        set({ loading: true });
        try {
          // Pull history
          const notifications = await notificationsAPI.list();
          // Save and stop
          set({ notifications, loading: false });
        } catch {
          // Error clean
          set({ loading: false });
        }
      },
      /**
       * fetchUnreadCount:
       * Rapidly syncs just the unread badge count for tab UI updates.
       */
      fetchUnreadCount: async () => {
        try {
          // Fetch small int payload
          const count = await notificationsAPI.unreadCount();
          // Update badge state
          set({ unreadCount: count });
        } catch { } // Swallowed: badge update failures shouldn't break the UI
      },
    }),
    {
      // ID
      name: 'notifications-storage',
      // Driver
      storage: createJSONStorage(() => FileStorage),
    }
  )
);


// ── 7. Announcements Store ──

/**
 * AnnouncementsState:
 * Reactive container for official news and board notices.
 */
interface AnnouncementsState {
  announcements: Announcement[]; // List of news items
  loading: boolean; // Sync flag
  fetchAnnouncements: () => Promise<void>; // Refresh action
}

/**
 * useAnnouncementsStore:
 * Drives the news feed state for the entire society.
 */
export const useAnnouncementsStore = create<AnnouncementsState>()(
  persist(
    (set) => ({
      // Init
      announcements: [],
      loading: false,
      /**
       * fetchAnnouncements:
       * Retrieves official society-wide broadcasts.
       */
      fetchAnnouncements: async () => {
        // Indicate activity
        set({ loading: true });
        try {
          // Pull news
          const announcements = await announcementsAPI.list();
          // Commit
          set({ announcements, loading: false });
        } catch {
          // Clean up
          set({ loading: false });
        }
      },
    }),
    {
      // Disk record
      name: 'announcements-storage',
      // Custom disk system
      storage: createJSONStorage(() => FileStorage),
    }
  )
);


// ── 8. Society Executive Dashboard Store ──

/**
 * DashboardState:
 * Aggregates high-level metrics (KPIs) for specialized management views.
 */
interface DashboardState {
  stats: DashboardStats | null; // Complex summary object
  loading: boolean; // Load tracker
  fetchStats: () => Promise<void>; // KPI sync action
}

/**
 * useDashboardStore:
 * Powers the analytical dashboard for admins and oversight for residents.
 */
export const useDashboardStore = create<DashboardState>()(
  persist(
    (set) => ({
      // Init
      stats: null,
      loading: false,
      /**
       * fetchStats:
       * Aggregates complex KPIs for the society manager's overview screen.
       */
      fetchStats: async () => {
        // UI feedback
        set({ loading: true });
        try {
          // Multi-component calculation fetch
          const stats = await dashboardAPI.stats();
          // Finalize state
          set({ stats, loading: false });
        } catch {
          // Reset status
          set({ loading: false });
        }
      },
    }),
    {
      // Data segment
      name: 'dashboard-storage',
      // IO bridge
      storage: createJSONStorage(() => FileStorage),
    }
  )
);
